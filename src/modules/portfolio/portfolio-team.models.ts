import mongoose, { Schema } from "mongoose";

export type PortfolioMemberDocument = {
  id: string;
  slug: string;
  name: string;
  role: string;
  avatar: string;
  glow: string;
  accent: string;
  power: string;
  bio: string;
  personal: {
    location: string;
    email: string;
    languages: string[];
  };
  skills: { name: string; level: number }[];
  education: { year: string; degree: string; school: string }[];
  experience: { period: string; role: string; company: string; desc: string }[];
  projects: { type: string; title: string; tags: string[] }[];
  certificates: { title: string }[];
  socials: { github?: string; linkedin?: string; portfolio?: string };
  isActive: boolean;
  order: number;
};

const portfolioMemberSchema = new Schema<PortfolioMemberDocument>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    avatar: { type: String, default: "", trim: true },
    glow: { type: String, default: "#ffffff", trim: true },
    accent: { type: String, default: "from-white to-gray-400", trim: true },
    power: { type: String, default: "", trim: true },
    bio: { type: String, default: "" },
    personal: {
      location: { type: String, default: "" },
      email: { type: String, default: "" },
      languages: { type: [String], default: [] }
    },
    skills: {
      type: [{ name: { type: String }, level: { type: Number, min: 0, max: 100 } }],
      default: []
    },
    education: {
      type: [{ year: { type: String }, degree: { type: String }, school: { type: String } }],
      default: []
    },
    experience: {
      type: [
        {
          period: { type: String },
          role: { type: String },
          company: { type: String },
          desc: { type: String }
        }
      ],
      default: []
    },
    projects: {
      type: [{ type: { type: String }, title: { type: String }, tags: { type: [String], default: [] } }],
      default: []
    },
    certificates: {
      type: [{ title: { type: String } }],
      default: []
    },
    socials: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

portfolioMemberSchema.index({ isActive: 1, order: 1 });

export const PortfolioMemberModel =
  mongoose.models.PortfolioMember ??
  mongoose.model<PortfolioMemberDocument>("PortfolioMember", portfolioMemberSchema);
