import mongoose, { Schema } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskDocument = {
  title: string;
  description?: string;
  projectId?: mongoose.Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeUserId?: string;
  reporterUserId: string;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  estimatedHours?: number;
};

const taskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 8000 },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done", "cancelled"],
      default: "todo",
      index: true
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    assigneeUserId: { type: String, index: true },
    reporterUserId: { type: String, required: true },
    dueDate: { type: Date },
    completedAt: { type: Date },
    tags: { type: [String], default: [] },
    estimatedHours: { type: Number, min: 0 }
  },
  { timestamps: true }
);

taskSchema.index({ status: 1, priority: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, status: 1 });

export const TaskModel = mongoose.models.Task ?? mongoose.model<TaskDocument>("Task", taskSchema);
