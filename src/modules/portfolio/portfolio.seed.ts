import { logger } from "../../core/logging/logger";
import { PortfolioProjectModel } from "./portfolio-projects.models";
import { PortfolioMemberModel } from "./portfolio-team.models";
import { PortfolioSettingsModel } from "./portfolio-settings.models";
import { PortfolioContactModel } from "./portfolio-contacts.models";
import { TechStackModel, CategoryModel, YearModel, ClientModel } from "./portfolio-masters.models";
import { seedPortfolioServices } from "./portfolio-services.seed";
import { seedCaseStudies } from "./portfolio-case-studies.seed";

export async function seedPortfolioData(): Promise<void> {
  await seedPortfolioSettings();
  await seedPortfolioServices();
  await seedPortfolioMasters();
  await seedPortfolioProjects();
  await seedPortfolioTeam();
  logger.info("Portfolio seed complete.");
}

// ── Masters ───────────────────────────────────────────────────────────────────

async function seedPortfolioMasters(): Promise<void> {
  const [catCount, yearCount, clientCount, stackCount] = await Promise.all([
    CategoryModel.countDocuments().exec(),
    YearModel.countDocuments().exec(),
    ClientModel.countDocuments().exec(),
    TechStackModel.countDocuments().exec(),
  ]);

  if (catCount === 0) {
    await CategoryModel.insertMany([
      { name: "Backend/Cloud", isActive: true, order: 1 },
      { name: "Native Mobile", isActive: true, order: 2 },
      { name: "Web Apps", isActive: true, order: 3 },
      { name: "Fintech", isActive: true, order: 4 },
      { name: "AI / ML", isActive: true, order: 5 },
      { name: "DevOps / Infra", isActive: true, order: 6 },
    ]);
    logger.info("Seeded portfolio categories");
  }

  if (yearCount === 0) {
    await YearModel.insertMany([
      { year: "2025", isActive: true, order: 1 },
      { year: "2024", isActive: true, order: 2 },
      { year: "2023", isActive: true, order: 3 },
      { year: "2022", isActive: true, order: 4 },
    ]);
    logger.info("Seeded portfolio years");
  }

  // No client rows are seeded. The four that used to be here — "Confidential —
  // EU Fintech" and friends — described engagements that never happened, and a
  // client master is a filter the public /work page renders.
  if (clientCount === 0) {
    logger.info("No portfolio clients — add real ones in the admin panel (none are seeded).");
  }

  if (stackCount === 0) {
    const stacks = [
      "Node.js", "TypeScript", "React", "Next.js", "React Native",
      "Expo", "Go", "Rust", "Python", "PostgreSQL", "MongoDB",
      "Redis", "Kafka", "gRPC", "GraphQL", "tRPC",
      "AWS ECS", "GCP", "Kubernetes", "Terraform", "Docker",
      "Istio", "ClickHouse", "Datadog", "Prometheus", "OpenTelemetry",
      "Stripe", "Reanimated 3", "Zustand", "MMKV", "EAS",
    ];
    await TechStackModel.insertMany(
      stacks.map((name, i) => ({ name, isActive: true, order: i + 1, image: "", description: "" }))
    );
    logger.info("Seeded portfolio tech stacks");
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

async function seedPortfolioSettings(): Promise<void> {
  const existing = await PortfolioSettingsModel.findOne().exec();
  if (existing) {
    // `settings.services` was replaced by the PortfolioService collection. The
    // field is gone from the schema, so Mongoose no longer touches it and stale
    // copies would sit in the document forever, confusing anyone reading it.
    await PortfolioSettingsModel.collection.updateMany(
      { services: { $exists: true } },
      { $unset: { services: "" } }
    );
    return;
  }

  await PortfolioSettingsModel.create({
    hero: {
      tagline: "We engineer high-performance digital products.",
      description: "An elite collective building world-class web and mobile products for ambitious brands.",
      ctaPrimary: { label: "View Work", href: "/work" },
      ctaSecondary: { label: "Contact Us", href: "/contact" },
      // Only routes that exist. These previously pointed at
      // /projects/we-converse, /saas-dashboard, /fintech-payments and
      // /logistics-api — slugs that belonged to the removed fictional dataset,
      // so a seeded homepage led with four cards that all 404'd.
      featuredProjects: [
        {
          title: "AI Call Agent",
          description: "Ultra-low latency voice AI for hospital appointment booking, patient database lookup, and intelligent scheduling.",
          href: "/projects/ai-call-bot-hospital",
          image: "/projects/ai-call-bot-hospital/card.jpg",
          eyebrow: "Deployment 01 // Voice AI",
        },
        {
          title: "AI Attendance App",
          description: "AI-powered attendance management for Vadodara Municipal Corporation — 8,000+ employees marking daily attendance with AI verification and geo-fencing.",
          href: "/projects/ai-attendance",
          // Only ai-call-bot-hospital has bespoke art under public/projects.
          // These two reuse the hero image their own case study renders, which
          // is a coherent card rather than a broken-image icon.
          image: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1600&q=80",
          eyebrow: "Deployment 02 // GovTech",
        },
        {
          title: "Business Meet App",
          description: "AI-powered networking platform connecting professionals with intelligent recommendations for profiles, connections, meetings, and MoMs.",
          href: "/projects/business-meet",
          image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1600&q=80",
          eyebrow: "Deployment 03 // AI Networking",
        },
      ],
    },
    navbar: {
      brandName: "NVENTRA",
      links: [
        // /work, not /projects: the latter 308s, and the primary nav link
        // should not spend a redirect on every visitor.
        { label: "Work", href: "/work" },
        { label: "Services", href: "/services" },
        { label: "Process", href: "/how-we-work" },
        { label: "Team", href: "/team" },
        { label: "Let's Talk", href: "/contact" },
      ],
    },
    footer: {
      description: "An engineering collective building high-performance web and mobile products.",
      email: "hello@umaeng.co.in",
      version: "v4.2 — STABLE_BUILD",
      links: [
        { label: "Work", href: "/work" },
        { label: "Services", href: "/#services" },
        { label: "Team", href: "/team" },
        { label: "Projects", href: "/projects" },
        { label: "Contact", href: "/contact" },
      ],
    },
    techMarquee: [
      "AWS", "REACT_NATIVE", "NODE.JS", "GRAPHQL", "POSTGRESQL",
      "TYPESCRIPT", "KUBERNETES", "NEXT.JS", "SWIFT", "KOTLIN",
      "TERRAFORM", "REDIS",
    ],
    // No `services` here: the catalogue is its own collection, seeded by
    // seedPortfolioServices() with descriptions and tags attached. This used to
    // hold a bare list of names that the website rejoined to hardcoded copy by
    // exact title match, so renaming a service blanked its description.
    callSlots: [
      "Mon 09 · 3pm",
      "Tue 10 · 11am",
      "Wed 11 · 4pm",
      "Thu 12 · 2pm",
      "Thu 12 · 5pm",
      "Fri 13 · 10am",
    ],
    about: {
      vision: "To be the catalyst for the next generation of digital experiences, where AI and human creativity merge to solve the world's most complex challenges.",
      mission: "Empowering businesses with cutting-edge full-stack solutions and intelligent AI systems. We transform ideas into robust, scalable, and beautiful realities.",
      values: [
        { icon: "Zap", title: "Innovation", desc: "Constant exploration of emerging technologies to stay ahead of the curve." },
        { icon: "Shield", title: "Integrity", desc: "Unwavering commitment to security, privacy, and ethical development." },
        { icon: "Users", title: "Collaboration", desc: "Working as an extension of your team to ensure mutual success." },
        { icon: "Globe", title: "Impact", desc: "Building solutions that make a meaningful difference on a global scale." },
        { icon: "Target", title: "Excellence", desc: "Meticulous attention to detail in every line of code and every pixel." },
        { icon: "ArrowRight", title: "Agility", desc: "Rapid adaptation to evolving requirements and market dynamics." },
      ],
      stats: [
        { label: "Projects Delivered", value: "50+" },
        { label: "Success Rate", value: "98%" },
      ],
    },
    process: {
      phases: [
        { id: "discovery", n: "01", title: "Discovery & Planning", description: "We dive deep into your vision, map out user flows, define the tech stack, and build a detailed roadmap — so there are zero surprises down the line.", accent: "from-blue-500/20 to-blue-500/0", dot: "bg-blue-500" },
        { id: "design", n: "02", title: "UI / UX Design", description: "Pixel-perfect interfaces designed for conversion. Prototypes you can click through before a single line of code is written.", accent: "from-violet-500/20 to-violet-500/0", dot: "bg-violet-500" },
        { id: "development", n: "03", title: "Development", description: "Clean, modular code built with modern frameworks. Weekly demos keep you in the loop with full transparency.", accent: "from-emerald-500/20 to-emerald-500/0", dot: "bg-emerald-500" },
        { id: "qa", n: "04", title: "Testing & QA", description: "Rigorous automated and manual testing across devices. We break it so your users never have to.", accent: "from-amber-500/20 to-amber-500/0", dot: "bg-amber-500" },
        { id: "launch", n: "05", title: "Launch & Deploy", description: "Zero-downtime deployments with CI/CD pipelines, monitoring, and rollback strategies baked in from day one.", accent: "from-rose-500/20 to-rose-500/0", dot: "bg-rose-500" },
        { id: "scale", n: "06", title: "Support & Scale", description: "Post-launch isn't the end — it's the beginning. Ongoing support, performance tuning, and feature iterations.", accent: "from-cyan-500/20 to-cyan-500/0", dot: "bg-cyan-500" },
      ],
      perks: [
        { title: "Lightning Fast Delivery", description: "Agile sprints with rapid iteration. We ship MVPs in weeks, not months.", icon: "⚡", gradient: "from-amber-500/10 via-transparent to-transparent", border: "hover:border-amber-500/30" },
        { title: "Unbreakable Commitment", description: "Your deadlines are our deadlines. Transparent updates, no ghosting.", icon: "🤝", gradient: "from-emerald-500/10 via-transparent to-transparent", border: "hover:border-emerald-500/30" },
        { title: "Built to Scale", description: "Architectures designed for 10x growth from day one.", icon: "🚀", gradient: "from-violet-500/10 via-transparent to-transparent", border: "hover:border-violet-500/30" },
      ],
    },
    teamPlaybook: [
      { phase: "01", name: "Discovery", body: "1-week deep dive: scope, success metrics, architecture sketch." },
      { phase: "02", name: "Weekly Sprints", body: "Demoed builds every Friday. Direct Slack channel. Async-first." },
      { phase: "03", name: "QA & Hardening", body: "Automated tests, load testing, security review, observability." },
      { phase: "04", name: "Launch & Handover", body: "Production deploy, runbooks, knowledge transfer, on-call support." },
    ],
    contactInfo: {
      email: "hello@umaeng.co.in",
      // Left blank rather than seeded with a placeholder number. A fake phone
      // number on a contact page is a lead that dials nowhere.
      phone: "",
    },
    isActive: true,
  });

  logger.info("Seeded portfolio settings");
}

// ── Projects ──────────────────────────────────────────────────────────────────

/**
 * Seeds the three real case studies, and nothing else.
 *
 * This used to insert four invented projects — among them a "Confidential — EU
 * Fintech" engagement with a fabricated daily volume and a fabricated SOC 2
 * result. Unlike a frontend fallback, a seeded row is a PUBLISHED row: it
 * renders exactly as real work does, is indexed, and is indistinguishable from
 * a genuine case study to anyone reading the site. So the bar for seeding a
 * project is that the work actually happened.
 *
 * The three that ship now cleared that bar already — they were hand-built pages
 * live on the site before B-4 moved them into the CMS. Everything else is added
 * in the admin panel under Portfolio CMS -> Projects.
 */
async function seedPortfolioProjects(): Promise<void> {
  await seedCaseStudies();

  const existing = await PortfolioProjectModel.countDocuments().exec();
  if (existing === 0) {
    logger.info("No portfolio projects — add real work in the admin panel.");
  }
}

// ── Team ──────────────────────────────────────────────────────────────────────

/**
 * Deliberately seeds nothing. Same reasoning as projects above.
 *
 * This used to insert six invented engineers with `@forge.collective`
 * addresses, fabricated employers and fabricated degrees, published and live.
 * Real members are added under Portfolio CMS -> Team; an empty roster collapses
 * /team to an explicit empty state.
 */
async function seedPortfolioTeam(): Promise<void> {
  const existing = await PortfolioMemberModel.countDocuments().exec();
  if (existing === 0) {
    logger.info("No portfolio team members — add real people in the admin panel (none are seeded).");
  }
}
