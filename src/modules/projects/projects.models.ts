import mongoose, { Schema } from "mongoose";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export type ProjectDocument = {
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerUserId: string;
  memberUserIds: string[];
  startDate?: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  tags: string[];
  priority: ProjectPriority;
};

const projectSchema = new Schema<ProjectDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 4000 },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "archived"],
      default: "planning",
      index: true
    },
    ownerUserId: { type: String, required: true, index: true },
    memberUserIds: { type: [String], default: [] },
    startDate: { type: Date },
    targetEndDate: { type: Date },
    actualEndDate: { type: Date },
    tags: { type: [String], default: [] },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" }
  },
  { timestamps: true }
);

projectSchema.index({ status: 1, createdAt: -1 });

export const ProjectModel = mongoose.models.Project ?? mongoose.model<ProjectDocument>("Project", projectSchema);
