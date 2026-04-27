import mongoose, { Schema } from "mongoose";

export type FileManagerEntryDocument = {
  name: string;
  kind: "folder" | "file";
  parentId?: mongoose.Types.ObjectId | null;
  sizeBytes?: number;
  mimeType?: string;
  extension?: string;
  storagePath?: string;
  scanStatus?: "pending" | "clean" | "infected" | "skipped";
  status: "active" | "trashed";
  tags: string[];
  isStarred: boolean;
  createdByUserId: string;
  updatedByUserId: string;
  trashedAt?: Date;
};

const fileManagerEntrySchema = new Schema<FileManagerEntryDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    kind: { type: String, enum: ["folder", "file"], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "FileManagerEntry", default: null, index: true },
    sizeBytes: { type: Number, min: 0 },
    mimeType: { type: String, trim: true, maxlength: 180 },
    extension: { type: String, trim: true, maxlength: 24 },
    storagePath: { type: String },
    scanStatus: { type: String, enum: ["pending", "clean", "infected", "skipped"], default: "skipped" },
    status: { type: String, enum: ["active", "trashed"], default: "active", index: true },
    tags: { type: [String], default: [] },
    isStarred: { type: Boolean, default: false, index: true },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
    trashedAt: { type: Date }
  },
  { timestamps: true }
);

fileManagerEntrySchema.index(
  { parentId: 1, name: 1, kind: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);
fileManagerEntrySchema.index({ parentId: 1, status: 1, kind: 1, createdAt: -1 });

export const FileManagerEntryModel =
  mongoose.models.FileManagerEntry ??
  mongoose.model<FileManagerEntryDocument>("FileManagerEntry", fileManagerEntrySchema);
