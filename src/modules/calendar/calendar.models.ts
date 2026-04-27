import mongoose, { Schema } from "mongoose";

export type CalendarEventDocument = {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  status: "scheduled" | "cancelled";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  color?: string;
  createdByUserId: string;
  attendeeUserIds: string[];
  tags: string[];
};

const calendarEventSchema = new Schema<CalendarEventDocument>(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, maxlength: 4000 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    location: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled"],
      default: "scheduled",
      index: true
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none"
    },
    color: { type: String, maxlength: 20 },
    createdByUserId: { type: String, required: true, index: true },
    attendeeUserIds: { type: [String], default: [] },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ createdByUserId: 1, status: 1 });

export const CalendarEventModel =
  mongoose.models.CalendarEvent ?? mongoose.model<CalendarEventDocument>("CalendarEvent", calendarEventSchema);
