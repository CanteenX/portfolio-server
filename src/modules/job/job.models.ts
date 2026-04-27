import mongoose, { Schema } from "mongoose";

export type JobPostingDocument = {
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType: "full_time" | "part_time" | "contract" | "internship";
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  salaryMinMinor?: number;
  salaryMaxMinor?: number;
  currency: string;
  status: "draft" | "open" | "closed" | "filled";
  postedAt?: Date;
  closedAt?: Date;
  createdByUserId: string;
  tags: string[];
};

const jobPostingSchema = new Schema<JobPostingDocument>(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, required: true, maxlength: 10000 },
    department: { type: String, required: true, maxlength: 100 },
    location: { type: String, required: true, maxlength: 200 },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship"],
      required: true
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead"],
      default: "mid"
    },
    salaryMinMinor: { type: Number, min: 0 },
    salaryMaxMinor: { type: Number, min: 0 },
    currency: { type: String, default: "USD", maxlength: 3 },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "filled"],
      default: "draft",
      index: true
    },
    postedAt: { type: Date },
    closedAt: { type: Date },
    createdByUserId: { type: String, required: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

jobPostingSchema.index({ status: 1, createdAt: -1 });

export const JobPostingModel =
  mongoose.models.JobPosting ?? mongoose.model<JobPostingDocument>("JobPosting", jobPostingSchema);

export type JobApplicationDocument = {
  jobId: mongoose.Types.ObjectId;
  applicantName: string;
  applicantEmail: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: "submitted" | "screening" | "interview" | "offered" | "hired" | "rejected" | "withdrawn";
  notes?: string;
  appliedAt: Date;
};

const jobApplicationSchema = new Schema<JobApplicationDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "JobPosting", required: true, index: true },
    applicantName: { type: String, required: true, maxlength: 200, trim: true },
    applicantEmail: { type: String, required: true, lowercase: true, trim: true },
    resumeUrl: { type: String, maxlength: 2000 },
    coverLetter: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: ["submitted", "screening", "interview", "offered", "hired", "rejected", "withdrawn"],
      default: "submitted",
      index: true
    },
    notes: { type: String, maxlength: 2000 },
    appliedAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

jobApplicationSchema.index({ jobId: 1, status: 1 });
jobApplicationSchema.index({ jobId: 1, applicantEmail: 1 }, { unique: true });

export const JobApplicationModel =
  mongoose.models.JobApplication ?? mongoose.model<JobApplicationDocument>("JobApplication", jobApplicationSchema);
