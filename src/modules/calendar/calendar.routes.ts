import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { CalendarEventModel } from "./calendar.models";

const router = Router();

const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  allDay: z.boolean().default(false),
  location: z.string().max(500).optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  color: z.string().max(20).optional(),
  attendeeUserIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(500).nullable().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  color: z.string().max(20).nullable().optional(),
  attendeeUserIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(["scheduled", "cancelled"]).optional()
});

const calendarWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

router.get(
  "/api/v1/calendar/events",
  ...moduleGuards("calendar", "calendar.read"),
  async (req, res, next) => {
    try {
      const { page, limit, from, to, status } = listEventsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (from || to) {
        filter.startDate = {};
        if (from) {
          (filter.startDate as Record<string, unknown>).$gte = from;
        }
        if (to) {
          (filter.startDate as Record<string, unknown>).$lte = to;
        }
      }
      if (status) {
        filter.status = status;
      }

      const [total, items] = await Promise.all([
        CalendarEventModel.countDocuments(filter).exec(),
        CalendarEventModel.find(filter)
          .sort({ startDate: 1 })
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
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/calendar/events",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createEventSchema.parse(req.body ?? {});

      if (payload.endDate < payload.startDate) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "End date must be after or equal to start date");
      }

      const created = await CalendarEventModel.create({
        ...payload,
        status: "scheduled",
        createdByUserId: req.user!.id
      });

      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/calendar/events/:id",
  ...moduleGuards("calendar", "calendar.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).lean().exec();

      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }

      res.json(event);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/calendar/events/:id",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateEventSchema.parse(req.body ?? {});

      const existingEvent = await CalendarEventModel.findById(req.params.id).exec();
      if (!existingEvent) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }

      const startDate = payload.startDate ?? existingEvent.startDate;
      const endDate = payload.endDate ?? existingEvent.endDate;

      if (endDate < startDate) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "End date must be after or equal to start date");
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      const unsetFields: Record<string, string> = {};

      if (payload.description === null) {
        delete updatePayload.description;
        unsetFields.description = "";
      }
      if (payload.location === null) {
        delete updatePayload.location;
        unsetFields.location = "";
      }
      if (payload.color === null) {
        delete updatePayload.color;
        unsetFields.color = "";
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

      const updated = await CalendarEventModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/calendar/events/:id/cancel",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).exec();

      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }

      if (event.status !== "scheduled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only scheduled events can be cancelled");
      }

      event.status = "cancelled";
      await event.save();

      res.json(event.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/v1/calendar/events/:id",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).exec();

      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }

      if (event.status !== "cancelled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only cancelled events can be deleted");
      }

      await CalendarEventModel.deleteOne({ _id: event._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/calendar/insights",
  ...moduleGuards("calendar", "calendar.read"),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const [scheduled, cancelled, upcoming, past, totalEvents] = await Promise.all([
        CalendarEventModel.countDocuments({ status: "scheduled" }).exec(),
        CalendarEventModel.countDocuments({ status: "cancelled" }).exec(),
        CalendarEventModel.countDocuments({ status: "scheduled", startDate: { $gt: now } }).exec(),
        CalendarEventModel.countDocuments({ status: "scheduled", endDate: { $lt: now } }).exec(),
        CalendarEventModel.countDocuments().exec()
      ]);

      res.json({
        counts: {
          scheduled,
          cancelled,
          upcoming,
          past,
          totalEvents
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const calendarRoutes = router;
