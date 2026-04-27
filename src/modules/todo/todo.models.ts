import mongoose, { Schema } from "mongoose";

export type TodoItemDocument = {
  title: string;
  description?: string;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  completedAt?: Date;
  ownerUserId: string;
  tags: string[];
};

const todoItemSchema = new Schema<TodoItemDocument>(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    ownerUserId: { type: String, required: true, index: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

todoItemSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });

export const TodoItemModel = mongoose.models.TodoItem ?? mongoose.model<TodoItemDocument>("TodoItem", todoItemSchema);
