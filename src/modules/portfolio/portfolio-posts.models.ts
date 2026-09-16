import mongoose, { Schema } from "mongoose";

/**
 * Blog posts, published at /insights.
 *
 * Body is stored as ordered blocks rather than one markdown or HTML field. The
 * same reasoning as legal documents, plus one more: blocks give the renderer a
 * type to switch on, so a code sample is a <pre> and a quote is a
 * <blockquote> without a parser deciding it for us — and nothing published
 * here ever reaches `dangerouslySetInnerHTML`.
 *
 * `publishedAt` is separate from `isPublished`: the date is what the post says
 * about itself and what the Article markup reports, the flag is whether the
 * site serves it at all. Backdating a post must not require unpublishing it.
 */
export type PostBlockType = "paragraph" | "heading" | "quote" | "code" | "list";

export type PostBlock = {
  type: PostBlockType;
  /** Headings and code blocks use this for the heading text / language label. */
  label: string;
  text: string;
};

export type PortfolioPostDocument = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  /** Free text; a post shows at most one. */
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  /** ISO date string. Empty means the post has never been dated. */
  publishedAt: string;
  readingMinutes: number;
  blocks: PostBlock[];
  isPublished: boolean;
  isFeatured: boolean;
  order: number;
};

const blockSchema = {
  type: {
    type: String,
    enum: ["paragraph", "heading", "quote", "code", "list"],
    default: "paragraph"
  },
  label: { type: String, default: "", trim: true, maxlength: 200 },
  text: { type: String, default: "", maxlength: 20000 }
};

const postSchema = new Schema<PortfolioPostDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    excerpt: { type: String, default: "", trim: true, maxlength: 400 },
    coverImage: { type: String, default: "", trim: true, maxlength: 500 },
    category: { type: String, default: "", trim: true, maxlength: 80 },
    tags: { type: [String], default: [] },
    authorName: { type: String, default: "", trim: true, maxlength: 120 },
    authorRole: { type: String, default: "", trim: true, maxlength: 120 },
    publishedAt: { type: String, default: "", trim: true, maxlength: 40 },
    readingMinutes: { type: Number, default: 0, min: 0, max: 240 },
    blocks: { type: [blockSchema], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

// The index the public list actually uses: published posts, newest first.
postSchema.index({ isPublished: 1, publishedAt: -1 });

export const PortfolioPostModel =
  mongoose.models.PortfolioPost ??
  mongoose.model<PortfolioPostDocument>("PortfolioPost", postSchema);
