import mongoose, { Schema } from "mongoose";

export type PortfolioSettingsDocument = {
  hero: {
    tagline: string;
    description: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
    featuredProjects: { title: string; description: string; href: string; image: string; eyebrow: string }[];
  };
  navbar: {
    brandName: string;
    links: { label: string; href: string }[];
  };
  footer: {
    description: string;
    email: string;
    version: string;
    links: { label: string; href: string }[];
  };
  techMarquee: string[];
  services: string[];
  callSlots: string[];
  about: {
    vision: string;
    mission: string;
    values: { icon: string; title: string; desc: string }[];
    stats: { label: string; value: string }[];
  };
  process: {
    phases: { id: string; n: string; title: string; description: string; accent: string; dot: string }[];
    perks: { title: string; description: string; icon: string; gradient: string; border: string }[];
  };
  teamPlaybook: { phase: string; name: string; body: string }[];
  contactInfo: {
    email: string;
    phone: string;
  };
  isActive: boolean;
};

const portfolioSettingsSchema = new Schema<PortfolioSettingsDocument>(
  {
    hero: {
      tagline: { type: String, default: "" },
      description: { type: String, default: "" },
      ctaPrimary: { label: { type: String, default: "View Work" }, href: { type: String, default: "/work" } },
      ctaSecondary: { label: { type: String, default: "Contact Us" }, href: { type: String, default: "/contact" } },
      featuredProjects: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            href: { type: String },
            image: { type: String },
            eyebrow: { type: String }
          }
        ],
        default: []
      }
    },
    navbar: {
      brandName: { type: String, default: "FORGE_COLLECTIVE" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    footer: {
      description: { type: String, default: "" },
      email: { type: String, default: "" },
      version: { type: String, default: "v1.0" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    techMarquee: { type: [String], default: [] },
    services: { type: [String], default: [] },
    callSlots: { type: [String], default: [] },
    about: {
      vision: { type: String, default: "" },
      mission: { type: String, default: "" },
      values: {
        type: [{ icon: { type: String }, title: { type: String }, desc: { type: String } }],
        default: []
      },
      stats: {
        type: [{ label: { type: String }, value: { type: String } }],
        default: []
      }
    },
    process: {
      phases: {
        type: [
          {
            id: { type: String },
            n: { type: String },
            title: { type: String },
            description: { type: String },
            accent: { type: String },
            dot: { type: String }
          }
        ],
        default: []
      },
      perks: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            icon: { type: String },
            gradient: { type: String },
            border: { type: String }
          }
        ],
        default: []
      }
    },
    teamPlaybook: {
      type: [{ phase: { type: String }, name: { type: String }, body: { type: String } }],
      default: []
    },
    contactInfo: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PortfolioSettingsModel =
  mongoose.models.PortfolioSettings ??
  mongoose.model<PortfolioSettingsDocument>("PortfolioSettings", portfolioSettingsSchema);
