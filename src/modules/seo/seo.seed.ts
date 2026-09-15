import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";
import { SeoMetaModel, normalizeSlug } from "./seo-meta.model";

/**
 * Seeds one SeoMeta row per static route.
 *
 * Upsert-if-absent only. An existing row is NEVER overwritten: these rows are
 * the whole point of the SEO Manager, and a redeploy that silently reverted
 * somebody's edited title would make the screen untrustworthy — which is worse
 * than it not existing.
 *
 * The seeded copy mirrors what each page ships in its own constants, so a
 * freshly seeded row is a no-op until someone improves it. That is deliberate:
 * a row full of placeholder text would score badly in the editor and look like
 * a bug, whereas a row matching the live page scores like the live page.
 *
 * Dynamic routes are absent on purpose. /projects/<slug> and /team/<slug>
 * derive their metadata from the record being rendered, which beats anything an
 * editor would retype; a row for one of those paths is an optional override.
 */

type SeoSeed = {
  slug: string;
  pageTitle: string;
  category: "Marketing" | "Detail" | "Other";
  metaTitle: string;
  metaDescription: string;
};

const SEEDS: SeoSeed[] = [
  {
    slug: "/",
    pageTitle: "Home",
    category: "Marketing",
    metaTitle: "Nventra — High-Performance Web & Mobile Engineering",
    metaDescription:
      "Nventra is an engineering collective building scalable web and mobile products for global brands."
  },
  {
    slug: "/work",
    pageTitle: "Work",
    category: "Marketing",
    metaTitle: "Engineering Work & Case Studies — Nventra",
    metaDescription:
      "Selected engineering work by Nventra: web, mobile and backend projects delivered for global brands, with the outcomes each one measured."
  },
  {
    slug: "/services",
    pageTitle: "Services",
    category: "Marketing",
    metaTitle: "Services — App, Web, CRM and AI Engineering",
    metaDescription:
      "App development, website building, CRM and admin panels, SEO and AI solutions, delivered by a senior engineering collective."
  },
  {
    slug: "/how-we-work",
    pageTitle: "How We Work",
    category: "Marketing",
    metaTitle: "How We Work — Our Delivery Process",
    metaDescription:
      "Our delivery process phase by phase, from discovery through to launch and ongoing engineering support."
  },
  {
    slug: "/team",
    pageTitle: "Team",
    category: "Marketing",
    metaTitle: "The Team Behind Nventra",
    metaDescription:
      "The engineers behind Nventra — their backgrounds, specialisms and the work they have shipped."
  },
  {
    slug: "/about",
    pageTitle: "About",
    category: "Marketing",
    metaTitle: "About Nventra — Vision, Mission and Values",
    metaDescription:
      "Who Nventra is: the vision, mission and values behind how we build software for global brands."
  },
  {
    slug: "/contact",
    pageTitle: "Contact",
    category: "Marketing",
    metaTitle: "Contact Nventra — Start a Project",
    metaDescription:
      "Start a project with Nventra. Book a 30-minute discovery call or tell us what you are building."
  },
  {
    slug: "/projects/ai-attendance",
    pageTitle: "Case study — AI Attendance",
    category: "Detail",
    metaTitle: "AI Attendance — Geo-Fenced, Proxy-Free Workforce Attendance",
    metaDescription:
      "AI-verified, proxy-free attendance with geo-fenced validation across a city-scale public-sector workforce of 8,000+ employees."
  },
  {
    slug: "/projects/ai-call-bot-hospital",
    pageTitle: "Case study — AI Call Agent",
    category: "Detail",
    metaTitle: "AI Call Agent — Voice Triage for Hospital Front Desks",
    metaDescription:
      "A low-latency AI call agent that answers, triages and routes hospital enquiries around the clock without adding front-desk headcount."
  },
  {
    slug: "/projects/business-meet",
    pageTitle: "Case study — Business Meet",
    category: "Detail",
    metaTitle: "Business Meet — AI-Ranked Professional Networking",
    metaDescription:
      "AI-ranked professional recommendations with destination and date aware connections, turning travel calendars into qualified meetings."
  },
  {
    slug: "/privacy",
    pageTitle: "Privacy Policy",
    category: "Other",
    metaTitle: "Privacy Policy — Nventra",
    metaDescription:
      "How Nventra collects, uses, stores and deletes the personal data you provide through this website."
  },
  {
    slug: "/terms",
    pageTitle: "Terms of Use",
    category: "Other",
    metaTitle: "Terms of Use — Nventra",
    metaDescription:
      "The terms on which Nventra provides this website, and what the material published on it does and does not commit us to."
  }
];

export async function seedSeoMeta(): Promise<void> {
  let created = 0;

  for (const seed of SEEDS) {
    const slug = normalizeSlug(seed.slug);
    if (!slug) continue;

    const result = await SeoMetaModel.updateOne(
      { slug },
      {
        // $setOnInsert, never $set: an edited row must survive every redeploy.
        $setOnInsert: {
          slug,
          pageTitle: seed.pageTitle,
          category: seed.category,
          metaTitle: seed.metaTitle,
          metaDescription: seed.metaDescription,
          keywords: [],
          canonicalUrl: "",
          ogTitle: "",
          ogDescription: "",
          ogImage: "",
          ogType: "website",
          icon: "",
          noIndex: false,
          isActive: true
        }
      },
      { upsert: true }
    ).exec();

    if (result.upsertedCount > 0) created += 1;
  }

  if (created > 0) {
    logger.info("Seeded SEO rows", { created, clientCode: env.CLIENT_CODE });
  }
}
