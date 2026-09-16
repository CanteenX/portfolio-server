import { logger } from "../../core/logging/logger";
import { PortfolioServiceModel } from "./portfolio-services.models";

/**
 * The canonical service catalogue.
 *
 * This is the UNION of what the site already advertised across its three
 * surfaces, with only the naming collisions normalised. That choice is
 * deliberate and it is the conservative one:
 *
 *   /services advertised 8   App Development · Website Building ·
 *                            CRM & Admin Panels · SEO · Google & Meta Ads ·
 *                            Tech Consultancy · UI/UX Design · AI Solutions
 *   the carousel advertised 8  App Building · Website Building · CRM Panel ·
 *                            Maintenance · Google Meta Ads · SEO ·
 *                            Tech Consultancy · Designing
 *   the contact dropdown      a third variation again
 *
 * Renaming is safe — `budgetBand` and `timeline` are free-text on the contact
 * model, so no enum is coupled to these strings. REMOVING one is not: dropping
 * SEO or Google & Meta Ads would stop a lead from selecting them in the contact
 * form, which changes what the business can be hired for. So nothing is
 * dropped here, and "Cloud/DevOps" — which appeared on no surface at all — is
 * NOT invented. Adding or removing a service is a business decision, made in
 * the admin panel rather than in this file.
 *
 * Normalisations applied:
 *   App Building      -> App Development
 *   CRM Panel         -> CRM & Admin Panels
 *   Designing         -> UI/UX Design
 *   Google Meta Ads   -> Google & Meta Ads
 */
const CANONICAL_SERVICES = [
  {
    slug: "app-development",
    title: "App Development",
    subtitle: "Mobile solutions that scale",
    description:
      "Native and cross-platform mobile apps built with React Native, Swift, and Kotlin. From MVP to production-grade apps with real-world scale.",
    tags: ["React Native", "Swift", "Kotlin", "Expo"],
    icon: "smartphone",
    highlights: ["iOS & Android", "Cross-platform", "Scalable architecture"],
    pointers: [
      "Native & hybrid app development",
      "App Store & Play Store deployment",
      "Push notifications & real-time sync",
      "Ongoing maintenance & updates"
    ],
    order: 1
  },
  {
    slug: "website-building",
    title: "Website Building",
    subtitle: "Digital presence that converts",
    description:
      "Blazing-fast, SEO-optimised websites and web apps. Built on Next.js and React with pixel-perfect design and performance scores above 95.",
    tags: ["Next.js", "React", "TypeScript", "TailwindCSS"],
    icon: "globe",
    highlights: ["Responsive design", "SEO optimised", "Fast performance"],
    pointers: [
      "Custom design & development",
      "CMS integration & management",
      "Performance & speed optimisation",
      "SSL, hosting & domain setup"
    ],
    order: 2
  },
  {
    slug: "crm-admin-panels",
    title: "CRM & Admin Panels",
    subtitle: "Internal tools built around your workflow",
    description:
      "Custom CRM dashboards and internal tools with role-based access, analytics, and full backend integration tailored to your workflow.",
    tags: ["React", "Node.js", "PostgreSQL", "RBAC"],
    icon: "dashboard",
    highlights: ["Role-based access", "Analytics", "Backend integration"],
    pointers: [
      "Custom dashboards & reporting",
      "Role-based access control",
      "Third-party API integration",
      "Data import & export pipelines"
    ],
    order: 3
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Design",
    subtitle: "Interfaces people understand",
    description:
      "End-to-end product design — user research, wireframes, high-fidelity Figma prototypes, and design systems for development handoff.",
    tags: ["Figma", "Design Systems", "Prototyping", "User Research"],
    icon: "pencil",
    highlights: ["User research", "Design systems", "Prototyping"],
    pointers: [
      "Wireframes & user flows",
      "High-fidelity Figma prototypes",
      "Design systems & component libraries",
      "Developer handoff & QA"
    ],
    order: 4
  },
  {
    slug: "seo",
    title: "SEO",
    subtitle: "Found by the people looking for you",
    description:
      "Technical SEO audits, structured data, Core Web Vitals optimisation, and content strategy to move your pages to the top of search results.",
    tags: ["Technical SEO", "Core Web Vitals", "Schema Markup"],
    icon: "seo",
    highlights: ["Technical audits", "Core Web Vitals", "Structured data"],
    pointers: [
      "Technical SEO audit & fixes",
      "Structured data & rich results",
      "Core Web Vitals optimisation",
      "Content & keyword strategy"
    ],
    order: 5
  },
  {
    slug: "google-meta-ads",
    title: "Google & Meta Ads",
    subtitle: "Spend that returns",
    description:
      "Performance marketing campaigns built on data. Audience segmentation, A/B testing, retargeting funnels, and ROAS-focused optimisation.",
    tags: ["Google Ads", "Meta Ads", "Analytics", "A/B Testing"],
    icon: "google",
    highlights: ["Audience segmentation", "A/B testing", "ROAS focus"],
    pointers: [
      "Campaign strategy & setup",
      "Audience segmentation & retargeting",
      "Creative A/B testing",
      "Conversion tracking & reporting"
    ],
    order: 6
  },
  {
    slug: "tech-consultancy",
    title: "Tech Consultancy",
    subtitle: "Senior engineering judgement, on demand",
    description:
      "Architecture reviews, stack selection, team augmentation, and roadmap planning. Senior engineers available for advisory engagements.",
    tags: ["Architecture", "Cloud", "Strategy", "Roadmap"],
    icon: "settings",
    highlights: ["Architecture reviews", "Stack selection", "Roadmapping"],
    pointers: [
      "Architecture & code reviews",
      "Technology and stack selection",
      "Team augmentation",
      "Delivery roadmap planning"
    ],
    order: 7
  },
  {
    slug: "maintenance",
    title: "Maintenance",
    subtitle: "Software that keeps working",
    description:
      "Ongoing support for live systems: dependency and security updates, monitoring, incident response, and steady performance work.",
    tags: ["Monitoring", "Security Updates", "Support", "Uptime"],
    icon: "settings",
    highlights: ["Monitoring", "Security patching", "Incident response"],
    pointers: [
      "Dependency & security updates",
      "Uptime monitoring & alerting",
      "Incident response",
      "Performance regression tracking"
    ],
    order: 8
  },
  {
    slug: "ai-solutions",
    title: "AI Solutions",
    subtitle: "Automation that actually ships",
    description:
      "Custom AI integrations using GPT, Claude, and open-source LLMs. Chatbots, automation pipelines, document processing, and RAG systems.",
    tags: ["LLMs", "RAG", "Claude API", "Automation"],
    icon: "ai",
    highlights: ["LLM integration", "RAG systems", "Automation"],
    pointers: [
      "LLM integration & prompt engineering",
      "RAG over your own documents",
      "Voice and chat agents",
      "Workflow automation pipelines"
    ],
    order: 9
  }
];

/**
 * Idempotent and additive.
 *
 * Existing rows are left completely alone — an owner's edits to a title,
 * description or ordering survive every redeploy. Only genuinely absent slugs
 * are inserted, so this can never resurrect a service that was deliberately
 * deleted... unless its slug is missing entirely, which is the one case where
 * re-adding it is the correct repair for a half-run seed.
 */
export async function seedPortfolioServices(): Promise<void> {
  const existing = await PortfolioServiceModel.find().select("slug").lean().exec();
  const known = new Set(existing.map((s) => (s as unknown as { slug: string }).slug));

  const missing = CANONICAL_SERVICES.filter((service) => !known.has(service.slug));
  if (missing.length === 0) return;

  await PortfolioServiceModel.insertMany(
    missing.map((service) => ({ ...service, showInContactForm: true, isActive: true }))
  );

  logger.info("Seeded portfolio services", {
    created: missing.length,
    slugs: missing.map((s) => s.slug)
  });
}
