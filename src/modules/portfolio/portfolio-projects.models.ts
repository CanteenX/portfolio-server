import mongoose, { Schema } from "mongoose";

export type PortfolioProjectDocument = {
  slug: string;
  title: string;
  category: string;
  metric: string;
  year: string;
  image: string;
  client: string;
  timeframe: string;
  role: string;
  stack: string[];
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  problem: string;
  solution: string;
  features: { title: string; description: string }[];
  gallery: { src: string; caption: string }[];
  roi: { value: string; label: string; description: string; icon: string }[];
  roiSectionDescription: string;
  screens: { label: string; caption: string; description: string; image: string }[];
  workflowSteps: { step: string; title: string; description: string }[];
  stackSectionDescription: string;
  codeSnippet?: { language: string; label: string; code: string };
  architecture?: string;
  isActive: boolean;
  order: number;
};

const portfolioProjectSchema = new Schema<PortfolioProjectDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    metric: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    client: { type: String, default: "", trim: true },
    timeframe: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    stack: { type: [String], default: [] },
    techStack: { type: [String], default: [] },
    liveUrl: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    problem: { type: String, default: "" },
    solution: { type: String, default: "" },
    features: {
      type: [{ title: { type: String }, description: { type: String } }],
      default: []
    },
    gallery: {
      type: [{ src: { type: String }, caption: { type: String } }],
      default: []
    },
    roi: {
      type: [{
        value: { type: String, default: "" },
        label: { type: String, default: "" },
        description: { type: String, default: "" },
        icon: { type: String, default: "" }
      }],
      default: []
    },
    roiSectionDescription: { type: String, default: "" },
    screens: {
      type: [{
        label: { type: String, default: "" },
        caption: { type: String, default: "" },
        description: { type: String, default: "" },
        image: { type: String, default: "" }
      }],
      default: []
    },
    workflowSteps: {
      type: [{
        step: { type: String, default: "" },
        title: { type: String, default: "" },
        description: { type: String, default: "" }
      }],
      default: []
    },
    stackSectionDescription: { type: String, default: "" },
    codeSnippet: {
      type: {
        language: { type: String },
        label: { type: String },
        code: { type: String }
      },
      default: undefined
    },
    architecture: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

portfolioProjectSchema.index({ isActive: 1, order: 1 });

export const PortfolioProjectModel =
  mongoose.models.PortfolioProject ??
  mongoose.model<PortfolioProjectDocument>("PortfolioProject", portfolioProjectSchema);
