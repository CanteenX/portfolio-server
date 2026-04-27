import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { JobPostingModel, JobApplicationModel } from "./job.models";

const router = Router();

const createJobPostingSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(10000),
  department: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]).default("mid"),
  salaryMinMinor: z.number().int().min(0).optional(),
  salaryMaxMinor: z.number().int().min(0).optional(),
  currency: z.string().max(3).default("USD"),
  tags: z.array(z.string()).default([])
});

const updateJobPostingSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(10000).optional(),
  department: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]).optional(),
  salaryMinMinor: z.number().int().min(0).nullable().optional(),
  salaryMaxMinor: z.number().int().min(0).nullable().optional(),
  currency: z.string().max(3).optional(),
  tags: z.array(z.string()).optional()
});

const transitionJobPostingSchema = z.object({
  to: z.enum(["open", "closed", "filled"])
});

const createJobApplicationSchema = z.object({
  applicantName: z.string().min(1).max(200),
  applicantEmail: z.string().email(),
  resumeUrl: z.string().max(2000).optional(),
  coverLetter: z.string().max(5000).optional()
});

const updateJobApplicationSchema = z.object({
  notes: z.string().max(2000).optional()
});

const transitionJobApplicationSchema = z.object({
  to: z.enum(["screening", "interview", "offered", "hired", "rejected", "withdrawn"]),
  notes: z.string().max(2000).optional()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional()
});

const jobWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const applicationSubmitRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function assertAllowedJobPostingTransition(from: string, to: string): void {
  const allowedTransitions: Record<string, string[]> = {
    draft: ["open"],
    open: ["closed", "filled"],
    closed: ["open"],
    filled: []
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid job posting transition ${from} -> ${to}`);
  }
}

function assertAllowedJobApplicationTransition(from: string, to: string): void {
  const allowedTransitions: Record<string, string[]> = {
    submitted: ["screening", "rejected", "withdrawn"],
    screening: ["interview", "rejected", "withdrawn"],
    interview: ["offered", "rejected", "withdrawn"],
    offered: ["hired", "rejected", "withdrawn"],
    hired: [],
    rejected: [],
    withdrawn: []
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid job application transition ${from} -> ${to}`);
  }
}

router.get(
  "/api/v1/job/postings",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status } = listQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (status) {
        filter.status = status;
      }

      const [total, items] = await Promise.all([
        JobPostingModel.countDocuments(filter).exec(),
        JobPostingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/job/postings",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createJobPostingSchema.parse(req.body ?? {});

      const created = await JobPostingModel.create({
        ...payload,
        status: "draft",
        createdByUserId: req.user!.id
      });

      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/job/postings/:id",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const posting = await JobPostingModel.findById(req.params.id).lean().exec();

      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      res.json(posting);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/job/postings/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateJobPostingSchema.parse(req.body ?? {});

      const existingPosting = await JobPostingModel.findById(req.params.id).exec();
      if (!existingPosting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      const unsetFields: Record<string, string> = {};

      if (payload.salaryMinMinor === null) {
        delete updatePayload.salaryMinMinor;
        unsetFields.salaryMinMinor = "";
      }
      if (payload.salaryMaxMinor === null) {
        delete updatePayload.salaryMaxMinor;
        unsetFields.salaryMaxMinor = "";
      }

      const updateOperation =
        Object.keys(unsetFields).length > 0
          ? {
              $set: updatePayload,
              $unset: unsetFields
            }
          : {
              $set: updatePayload
            };

      const updated = await JobPostingModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/job/postings/:id/transition",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionJobPostingSchema.parse(req.body ?? {});

      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      assertAllowedJobPostingTransition(posting.status, payload.to);

      posting.status = payload.to;

      if (payload.to === "open" && !posting.postedAt) {
        posting.postedAt = new Date();
      }

      if ((payload.to === "closed" || payload.to === "filled") && !posting.closedAt) {
        posting.closedAt = new Date();
      }

      await posting.save();

      res.json(posting.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/job/postings/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const posting = await JobPostingModel.findById(req.params.id).exec();

      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      if (posting.status !== "draft") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft postings can be deleted");
      }

      await JobPostingModel.deleteOne({ _id: posting._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/job/postings/:id/applications",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      const { page, limit } = listQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        JobApplicationModel.countDocuments({ jobId: req.params.id }).exec(),
        JobApplicationModel.find({ jobId: req.params.id })
          .sort({ appliedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/job/postings/:id/applications",
  applicationSubmitRateLimiter,
  ...moduleGuards("job", "job.create"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = createJobApplicationSchema.parse(req.body ?? {});

      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }

      if (posting.status !== "open") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Job posting is not open for applications");
      }

      const created = await JobApplicationModel.create({
        jobId: req.params.id,
        ...payload,
        status: "submitted",
        appliedAt: new Date()
      });

      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application payload"));
        return;
      }
      if ((error as { code?: number }).code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Application already exists for this email"));
        return;
      }
      next(error);
    }
  }
);

router.patch(
  "/api/v1/job/applications/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateJobApplicationSchema.parse(req.body ?? {});

      const updated = await JobApplicationModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        {
          new: true,
          runValidators: true
        }
      )
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/job/applications/:id/transition",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionJobApplicationSchema.parse(req.body ?? {});

      const application = await JobApplicationModel.findById(req.params.id).exec();
      if (!application) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }

      assertAllowedJobApplicationTransition(application.status, payload.to);

      application.status = payload.to;

      if (payload.notes && payload.notes.trim()) {
        application.notes = payload.notes.trim();
      }

      await application.save();

      res.json(application.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/job/applications/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const application = await JobApplicationModel.findById(req.params.id).exec();

      if (!application) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }

      await JobApplicationModel.deleteOne({ _id: application._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/job/insights",
  ...moduleGuards("job", "job.read"),
  async (_req, res, next) => {
    try {
      const [draftPostings, openPostings, closedPostings, filledPostings, totalApplications, submittedApplications, hiredApplications] =
        await Promise.all([
          JobPostingModel.countDocuments({ status: "draft" }).exec(),
          JobPostingModel.countDocuments({ status: "open" }).exec(),
          JobPostingModel.countDocuments({ status: "closed" }).exec(),
          JobPostingModel.countDocuments({ status: "filled" }).exec(),
          JobApplicationModel.countDocuments().exec(),
          JobApplicationModel.countDocuments({ status: "submitted" }).exec(),
          JobApplicationModel.countDocuments({ status: "hired" }).exec()
        ]);

      res.json({
        counts: {
          draftPostings,
          openPostings,
          closedPostings,
          filledPostings,
          totalApplications,
          submittedApplications,
          hiredApplications
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const jobRoutes = router;
