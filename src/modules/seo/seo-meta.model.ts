import mongoose, { Schema } from "mongoose";

/**
 * Per-route SEO metadata for the public website.
 *
 * WHY A ROW PER ROUTE rather than fields on the page's content: metadata is one
 * set of values per *page*, while portfolio content is a collection of records
 * (projects, team members) that a page renders many of. Hanging metadata off a
 * record would mean picking an arbitrary "primary" one, and would break the
 * moment it is deleted.
 *
 * Dynamic routes (/projects/<slug>, /team/<slug>) already derive their metadata
 * from the record being rendered, which is better than anything an editor would
 * retype. A row here for such a path is treated as an OVERRIDE, so an
 * individually important case study can be tuned without giving every project a
 * mandatory SEO chore.
 */

/** The buckets the admin list filters by. Keep in sync with the chips. */
export const SEO_CATEGORIES = ["Marketing", "Detail", "Other"] as const;
export type SeoCategory = (typeof SEO_CATEGORIES)[number];

/**
 * Turns whatever the admin typed into the exact string the website looks up by.
 *
 * THIS IS THE WHOLE CONTRACT OF THE COLLECTION. The site asks for a row by the
 * route it is rendering — "/services", straight out of the router — so a row
 * stored as "services", "/Services" or "/services/" is a row that is never
 * found, and the page silently ships its built-in title instead of the one
 * someone edited. There is no error to notice; it simply does not work. Every
 * write path funnels through here, and the rules are:
 *
 *   - exactly one leading slash, internal runs collapsed. A value STARTING
 *     "//" is rejected rather than collapsed, because "//evil.com" is a
 *     protocol-relative URL, not a sloppy path;
 *   - no trailing slash, except the root, which IS "/";
 *   - lowercased, since every route on the site is lowercase and a capital
 *     would be an invisible mismatch;
 *   - query string and hash dropped — not part of a route;
 *   - an absolute URL is rejected (returns ""), not truncated: pasting
 *     "https://umaeng.co.in/services" means the field was misunderstood and the
 *     admin should be told.
 */
export function normalizeSlug(value: unknown): string {
  if (typeof value !== "string") return "";

  let slug = value.trim();
  if (!slug) return "";

  if (/^[a-z][a-z0-9+.-]*:/i.test(slug) || slug.startsWith("//")) return "";
  if (/\s/.test(slug)) return "";

  slug = slug.split("?")[0].split("#")[0];
  slug = slug.replace(/\/{2,}/g, "/");
  if (!slug.startsWith("/")) slug = `/${slug}`;
  if (slug.length > 1) slug = slug.replace(/\/+$/, "");

  return (slug || "/").toLowerCase();
}

/**
 * Validates a canonical URL.
 *
 * A canonical pointing somewhere wrong is worse than none at all: it tells
 * Google "the real version of this page is over there", and this page drops out
 * of the index. So it is validated rather than stored as typed.
 *
 * Accepts an absolute http(s) URL, or a root-relative path (valid in Next
 * metadata, resolved against metadataBase). Rejects everything else — mailto:,
 * javascript:, a bare host with no scheme, a relative "../x", and localhost,
 * which would point every crawler at a machine it cannot reach.
 */
export function isValidCanonicalUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url) return true; // empty means "no canonical", which is legal

  if (url.startsWith("/")) return !url.startsWith("//") && !/\s/.test(url);

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".local")
    ) {
      return false;
    }
    // "http:///x" parses but has no host; a host with no dot is a typo.
    return Boolean(parsed.hostname) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export type SeoMetaDocument = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  pageTitle: string;
  category: SeoCategory;
  icon: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  noIndex: boolean;
  isActive: boolean;
};

const seoMetaSchema = new Schema<SeoMetaDocument>(
  {
    // Uniqueness is declared once, on the explicit index below, and not also as
    // `unique: true` here — Mongoose 8 treats those as two index definitions
    // and warns about a duplicate on every boot.
    slug: { type: String, required: true, trim: true },
    /** Human label for the admin list ("Home", "Services"). */
    pageTitle: { type: String, required: true, trim: true },
    category: { type: String, enum: SEO_CATEGORIES, default: "Marketing" },
    icon: { type: String, trim: true, default: "" },

    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    /** Normalised to a de-duplicated array of non-empty strings on write. */
    keywords: { type: [String], default: [] },
    canonicalUrl: { type: String, trim: true, default: "" },

    ogTitle: { type: String, trim: true, default: "" },
    ogDescription: { type: String, trim: true, default: "" },
    /** Opaque storage reference or absolute URL — callers must not parse it. */
    ogImage: { type: String, trim: true, default: "" },
    ogType: { type: String, trim: true, default: "website" },

    /** Emits `robots: noindex`. */
    noIndex: { type: Boolean, default: false },
    /** Hides the row from the public read without deleting the copy. */
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

/**
 * One row per route. The uniqueness is what lets the website address a row by
 * the path it is rendering, and what stops a double-submit creating a second
 * "/services" whose values would then be picked at random.
 */
seoMetaSchema.index({ slug: 1 }, { unique: true });

/** The admin list is "rows in a category, by slug"; the chips page through it. */
seoMetaSchema.index({ category: 1, slug: 1 });

export const SeoMetaModel =
  mongoose.models.SeoMeta ?? mongoose.model<SeoMetaDocument>("SeoMeta", seoMetaSchema);
