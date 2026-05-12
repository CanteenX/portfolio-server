import { logger } from "../../core/logging/logger";
import { PortfolioProjectModel } from "./portfolio-projects.models";
import { PortfolioMemberModel } from "./portfolio-team.models";
import { PortfolioSettingsModel } from "./portfolio-settings.models";
import { PortfolioContactModel } from "./portfolio-contacts.models";
import { TechStackModel, CategoryModel, YearModel, ClientModel } from "./portfolio-masters.models";

export async function seedPortfolioData(): Promise<void> {
  await seedPortfolioSettings();
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

  if (clientCount === 0) {
    await ClientModel.insertMany([
      { name: "Confidential — EU Fintech", isActive: true, order: 1 },
      { name: "DTC lifestyle brand", isActive: true, order: 2 },
      { name: "B2B analytics startup (Series A)", isActive: true, order: 3 },
      { name: "Pan-Asian logistics operator", isActive: true, order: 4 },
    ]);
    logger.info("Seeded portfolio clients");
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
  if (existing) return;

  await PortfolioSettingsModel.create({
    hero: {
      tagline: "We engineer high-performance digital products.",
      description: "An elite collective building world-class web and mobile products for ambitious brands.",
      ctaPrimary: { label: "View Work", href: "/work" },
      ctaSecondary: { label: "Contact Us", href: "/contact" },
      featuredProjects: [
        {
          title: "We Converse App",
          description: "Meeting app with live translation in any language and automatic minutes of meeting generation.",
          href: "/projects/we-converse",
          image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80",
          eyebrow: "Deployment 01 // Mobile",
        },
        {
          title: "E-Commerce Solution",
          description: "Full-stack e-commerce platform with AI-driven personalization and recommendations.",
          href: "/projects/saas-dashboard",
          image: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=1200&q=80",
          eyebrow: "Deployment 02 // Web",
        },
        {
          title: "Healthcare Dashboard",
          description: "HIPAA-compliant patient management system with intelligent workflow automation.",
          href: "/projects/fintech-payments",
          image: "https://images.unsplash.com/photo-1576091160550-2173dad99978?auto=format&fit=crop&w=1200&q=80",
          eyebrow: "Deployment 03 // Dashboard",
        },
        {
          title: "FinTech App",
          description: "Secure financial application with AI fraud detection and blockchain integration.",
          href: "/projects/logistics-api",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
          eyebrow: "Deployment 04 // Fintech",
        },
      ],
    },
    navbar: {
      brandName: "FORGE_COLLECTIVE",
      links: [
        { label: "Work", href: "/projects" },
        { label: "Process", href: "/how-we-work" },
        { label: "Team", href: "/team" },
        { label: "Let's Talk", href: "/contact" },
      ],
    },
    footer: {
      description: "An elite collective engineering high-performance web and mobile products for global brands.",
      email: "hello@forge.dev",
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
    services: [
      "App Development",
      "Website Building",
      "CRM Panel",
      "SEO",
      "Google & Meta Ads",
      "Tech Consultancy",
      "UI/UX Design",
      "AI Solutions",
    ],
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
      email: "hello@techco.dev",
      phone: "+1 (555) 000-1234",
    },
    isActive: true,
  });

  logger.info("Seeded portfolio settings");
}

// ── Projects ──────────────────────────────────────────────────────────────────

async function seedPortfolioProjects(): Promise<void> {
  if ((await PortfolioProjectModel.countDocuments()) > 0) return;

  await PortfolioProjectModel.create([
    {
      slug: "fintech-payments",
      title: "Real-time payments rail",
      category: "Backend/Cloud",
      metric: "$2M / day processed",
      year: "2024",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      client: "Confidential — EU Fintech",
      timeframe: "14 weeks · Q1–Q2 2024",
      role: "Backend architecture, infrastructure, DevOps",
      stack: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Kafka", "AWS ECS", "Terraform", "Datadog"],
      techStack: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Kafka"],
      problem: "The client's legacy ledger could not settle peer-to-peer transfers under 8 seconds and was failing audit on idempotency. Volume was projected to grow 4x in two quarters.",
      solution: "We designed an event-sourced ledger using Kafka for the write path and a CQRS read model in PostgreSQL. Idempotency keys are enforced at the API gateway and replayed deterministically. Everything runs on autoscaled ECS with blue/green deploys via Terraform.",
      features: [
        { title: "Event-sourced ledger", description: "Append-only Kafka log with deterministic replay for audit and recovery." },
        { title: "Idempotent API gateway", description: "Client-supplied keys deduplicated at the edge with Redis SETNX + TTL." },
        { title: "CQRS read models", description: "Materialized PostgreSQL projections kept in sync via consumer workers." },
        { title: "Blue/green deploys", description: "Zero-downtime releases with Terraform-managed ECS task sets." },
      ],
      gallery: [
        { src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80", caption: "Operations dashboard — live throughput" },
        { src: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1600&q=80", caption: "Reconciliation report" },
        { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80", caption: "Latency monitoring (Datadog)" },
      ],
      roi: [
        { value: "320ms", label: "p95 settlement time", description: "Down from 8s p95 on the legacy ledger", icon: "Zap" },
        { value: "$2M+", label: "processed daily", description: "Zero double-spends across 9 months of live traffic", icon: "DollarSign" },
        { value: "SOC 2", label: "Type II passed", description: "First attempt — audit-ready idempotency built in from day one", icon: "Shield" },
        { value: "38%", label: "infra cost reduction", description: "Via right-sized autoscaling and ECS task right-sizing", icon: "TrendingUp" },
      ],
      architecture: "Client → API Gateway (idempotency) → Kafka → Ledger writer → Postgres projections → Read API",
      isActive: true,
      order: 1,
    },
    {
      slug: "we-converse",
      title: "We Converse",
      category: "Native Mobile",
      metric: "100k downloads",
      year: "2024",
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1600&q=80",
      client: "DTC lifestyle brand",
      timeframe: "10 weeks · Q3 2024",
      role: "Mobile engineering, design system, release ops",
      stack: ["React Native", "Expo", "TypeScript", "Reanimated 3", "Zustand", "MMKV", "Sentry", "EAS"],
      techStack: ["React Native", "Expo", "TypeScript"],
      problem: "The brand needed a single mobile app for iOS and Android with a launch window of 10 weeks, native-feeling animations, and offline-first browsing for spotty in-store networks.",
      solution: "We shipped a React Native app on Expo with a custom design system, Reanimated 3 gestures, and an MMKV-backed offline cache. EAS Build + EAS Update gave us OTA hotfixes inside the launch week.",
      features: [
        { title: "60fps gesture system", description: "Reanimated 3 worklets for swipe, pinch, and parallax — never drops frames." },
        { title: "Offline-first catalog", description: "MMKV-backed local cache keeps the full catalog browsable without signal." },
        { title: "OTA hotfixes", description: "EAS Update channel lets us patch JS in minutes, not days." },
        { title: "Crash-free 99.8%", description: "Sentry instrumentation with sourcemaps on every release." },
      ],
      gallery: [
        { src: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1600&q=80", caption: "Onboarding flow" },
        { src: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1600&q=80", caption: "Product detail with Reanimated parallax" },
        { src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80", caption: "Checkout — biometric auth" },
      ],
      roi: [
        { value: "100k", label: "downloads in 6 weeks", description: "Organic growth driven by the 60fps experience", icon: "TrendingUp" },
        { value: "4.8★", label: "App Store rating", description: "4.7★ on Google Play — users love the feel", icon: "Star" },
        { value: "60fps", label: "on 3-year-old hardware", description: "Reanimated 3 worklets never drop a frame", icon: "Zap" },
        { value: "<30 min", label: "OTA hotfix time", description: "EAS Update channel — JS patches without App Store review", icon: "Timer" },
      ],
      isActive: true,
      order: 2,
    },
    {
      slug: "saas-dashboard",
      title: "Multi-tenant analytics suite",
      category: "Web Apps",
      metric: "12k MAU",
      year: "2024",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      client: "B2B analytics startup (Series A)",
      timeframe: "16 weeks · 2024",
      role: "Full-stack product engineering",
      stack: ["React", "TanStack Query", "tRPC", "PostgreSQL", "ClickHouse", "Redis", "Vercel"],
      techStack: ["React", "TypeScript", "PostgreSQL", "ClickHouse"],
      problem: "The team had outgrown a single-tenant Rails monolith. Queries timed out at 50M rows and the UI couldn't render org hierarchies above 5 levels.",
      solution: "We rebuilt the read path on ClickHouse for analytical queries while keeping PostgreSQL as the source of truth. The frontend uses TanStack Query with cursor pagination and virtualized tables for unbounded org trees.",
      features: [
        { title: "ClickHouse query layer", description: "Sub-second aggregations across 100M+ row tenant tables." },
        { title: "Virtualized org tree", description: "Renders 10k-node hierarchies at 60fps with windowing." },
        { title: "Type-safe end-to-end", description: "tRPC keeps the contract honest from DB to component." },
        { title: "Tenant isolation", description: "Row-level security + per-tenant ClickHouse databases." },
      ],
      gallery: [
        { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80", caption: "Analytics overview" },
        { src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80", caption: "Cohort explorer" },
        { src: "https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1600&q=80", caption: "Admin console" },
      ],
      roi: [
        { value: "410ms", label: "dashboard p95 load", description: "Down from 6.2s — ClickHouse query layer in action", icon: "Zap" },
        { value: "50M+", label: "rows per tenant", description: "Sub-second aggregations via ClickHouse columnar engine", icon: "BarChart" },
        { value: "12k", label: "monthly active users", description: "Across 340 orgs post-launch", icon: "Users" },
        { value: "Series B", label: "closed", description: "Product rebuild was a key proof point for investors", icon: "TrendingUp" },
      ],
      isActive: true,
      order: 3,
    },
    {
      slug: "logistics-api",
      title: "Logistics microservices API",
      category: "Backend/Cloud",
      metric: "8M req/day",
      year: "2023",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
      client: "Pan-Asian logistics operator",
      timeframe: "20 weeks · 2023",
      role: "Backend, platform, observability",
      stack: ["Go", "gRPC", "Kubernetes", "Istio", "PostgreSQL", "Redis", "GCP", "Prometheus"],
      techStack: ["Go", "Kubernetes", "PostgreSQL", "gRPC"],
      problem: "A monolithic dispatcher couldn't keep up with peak surge traffic during festival seasons. One slow downstream caused cascade failures across the fleet API.",
      solution: "We split the monolith into 7 Go services behind gRPC, deployed on GKE with Istio for mTLS and circuit breaking. Critical paths have explicit timeouts, retries with jitter, and bulkhead pools.",
      features: [
        { title: "Service mesh", description: "Istio handles mTLS, retries, and circuit breaking declaratively." },
        { title: "Surge-tested", description: "Load-tested to 11x peak with k6; passed without manual scaling." },
        { title: "Observability built-in", description: "OpenTelemetry traces from edge to database." },
        { title: "Automated rollback", description: "Argo Rollouts with metric-based promotion gates." },
      ],
      gallery: [
        { src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80", caption: "Fleet operations console" },
        { src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80", caption: "Service mesh topology" },
      ],
      roi: [
        { value: "8M", label: "requests per day", description: "p99 latency under 80ms across all 7 Go services", icon: "Zap" },
        { value: "11x", label: "peak surge survived", description: "Zero cascade failures during festival season load test", icon: "Shield" },
        { value: "30/day", label: "deploys cadence", description: "Up from weekly — Argo Rollouts with metric gates", icon: "Rocket" },
        { value: "6 min", label: "MTTR", description: "Down from 47 min — OTel traces + automated rollback", icon: "Timer" },
      ],
      isActive: true,
      order: 4,
    },
  ]);

  logger.info("Seeded 4 portfolio projects");
}

// ── Team ──────────────────────────────────────────────────────────────────────

async function seedPortfolioTeam(): Promise<void> {
  if ((await PortfolioMemberModel.countDocuments()) > 0) return;

  await PortfolioMemberModel.create([
    {
      id: "FC-001",
      slug: "priya-raman",
      name: "Priya Raman",
      role: "Lead Mobile Architect",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#34d399",
      accent: "from-emerald-400 to-cyan-400",
      power: "Obsessed with reducing mobile payload sizes and shipping 60fps animations.",
      bio: "I build mobile experiences that feel weightless. Every frame, every byte, every interaction is a deliberate choice — not an accident.",
      personal: { location: "Bengaluru, India", email: "priya@forge.collective", languages: ["English", "Tamil", "Hindi"] },
      skills: [
        { name: "React Native", level: 95 },
        { name: "Swift / iOS", level: 88 },
        { name: "Kotlin / Android", level: 82 },
        { name: "Performance Profiling", level: 92 },
        { name: "Animation Systems", level: 90 },
      ],
      education: [{ year: "2016", degree: "B.Tech Computer Science", school: "IIT Madras" }],
      experience: [
        { period: "2022 — Now", role: "Lead Mobile Architect", company: "Forge Collective", desc: "Architecting cross-platform mobile systems for fintech and health clients." },
        { period: "2019 — 2022", role: "Senior Mobile Engineer", company: "Swiggy", desc: "Owned the rider app performance overhaul. Cut cold-start by 40%." },
        { period: "2016 — 2019", role: "Mobile Engineer", company: "Flipkart", desc: "Shipped checkout flows used by 100M+ monthly users." },
      ],
      projects: [
        { type: "Fintech", title: "Vault Mobile", tags: ["React Native", "Reanimated", "Swift"] },
        { type: "Health", title: "Pulse Companion", tags: ["Kotlin", "HealthKit", "BLE"] },
      ],
      certificates: [{ title: "Apple Certified iOS Developer" }, { title: "Google Mobile Web Specialist" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 1,
    },
    {
      id: "FC-002",
      slug: "arjun-mehta",
      name: "Arjun Mehta",
      role: "Backend / Cloud Lead",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#60a5fa",
      accent: "from-blue-500 to-cyan-400",
      power: "Designs distributed systems that don't fall over at peak traffic.",
      bio: "Resilience is not a feature you bolt on — it's how the system is shaped from day one. I design for the failure modes nobody wants to talk about.",
      personal: { location: "Pune, India", email: "arjun@forge.collective", languages: ["English", "Hindi", "Marathi"] },
      skills: [
        { name: "Go", level: 94 },
        { name: "Rust", level: 80 },
        { name: "AWS / GCP", level: 92 },
        { name: "Kubernetes", level: 88 },
        { name: "Postgres / Distributed DB", level: 90 },
      ],
      education: [{ year: "2014", degree: "M.S. Distributed Systems", school: "Carnegie Mellon" }],
      experience: [
        { period: "2021 — Now", role: "Backend / Cloud Lead", company: "Forge Collective", desc: "Designs the backbone for every Forge build. Multi-region by default." },
        { period: "2017 — 2021", role: "Staff Engineer", company: "Stripe", desc: "Worked on the payments orchestration layer. Five-nines or it didn't ship." },
        { period: "2014 — 2017", role: "Backend Engineer", company: "Uber", desc: "Surge pricing infra. Real-time data at city scale." },
      ],
      projects: [
        { type: "SaaS", title: "Helios Pipeline", tags: ["Go", "Kafka", "Postgres"] },
        { type: "Open Source", title: "Tessera", tags: ["Rust", "WASM", "CRDT"] },
      ],
      certificates: [{ title: "AWS Solutions Architect — Pro" }, { title: "CKA — Certified Kubernetes Admin" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 2,
    },
    {
      id: "FC-003",
      slug: "sana-kapoor",
      name: "Sana Kapoor",
      role: "Frontend Engineer",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#f472b6",
      accent: "from-pink-400 to-rose-400",
      power: "Pixel-perfect interfaces with sub-100ms interaction budgets.",
      bio: "An interface either feels right or it doesn't. There's no in-between. I sweat the milliseconds so the user never has to notice them.",
      personal: { location: "Mumbai, India", email: "sana@forge.collective", languages: ["English", "Hindi", "Punjabi"] },
      skills: [
        { name: "React / TypeScript", level: 96 },
        { name: "CSS / Animation", level: 94 },
        { name: "Design Systems", level: 90 },
        { name: "Accessibility", level: 88 },
        { name: "WebGL / Three.js", level: 75 },
      ],
      education: [{ year: "2018", degree: "B.Des Interaction Design", school: "NID Ahmedabad" }],
      experience: [
        { period: "2022 — Now", role: "Frontend Engineer", company: "Forge Collective", desc: "Owns the frontend craft bar across every client engagement." },
        { period: "2020 — 2022", role: "Product Engineer", company: "Linear", desc: "Shipped the keyboard-first command UX." },
        { period: "2018 — 2020", role: "UI Engineer", company: "Razorpay", desc: "Checkout interface across 9 languages." },
      ],
      projects: [
        { type: "Design System", title: "Forge UI", tags: ["React", "Radix", "CSS"] },
        { type: "Marketing", title: "Helios Site", tags: ["Next.js", "Framer Motion"] },
      ],
      certificates: [{ title: "IAAP Web Accessibility Specialist" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 3,
    },
    {
      id: "FC-004",
      slug: "devon-hayes",
      name: "Devon Hayes",
      role: "Full-Stack Engineer",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#fbbf24",
      accent: "from-amber-400 to-orange-500",
      power: "Ships end-to-end features faster than most teams ship a PR.",
      bio: "I don't believe in handoffs. The same brain that designs the schema should ship the UI. That's how you keep the loop tight.",
      personal: { location: "Austin, USA", email: "devon@forge.collective", languages: ["English", "Spanish"] },
      skills: [
        { name: "TypeScript", level: 94 },
        { name: "Node.js", level: 92 },
        { name: "Postgres", level: 88 },
        { name: "React", level: 90 },
        { name: "Product Sense", level: 85 },
      ],
      education: [{ year: "2017", degree: "B.S. Computer Science", school: "UT Austin" }],
      experience: [
        { period: "2023 — Now", role: "Full-Stack Engineer", company: "Forge Collective", desc: "End-to-end ownership of client features. Schema to pixel." },
        { period: "2020 — 2023", role: "Founding Engineer", company: "Notion (early)", desc: "Built core block editor primitives." },
        { period: "2017 — 2020", role: "Software Engineer", company: "Atlassian", desc: "Jira automation engine." },
      ],
      projects: [
        { type: "SaaS", title: "Atlas CRM", tags: ["Next.js", "tRPC", "Postgres"] },
        { type: "Internal Tools", title: "Forge Ops Console", tags: ["React", "Node", "Redis"] },
      ],
      certificates: [{ title: "MongoDB Certified Developer" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 4,
    },
    {
      id: "FC-005",
      slug: "mei-lin",
      name: "Mei Lin",
      role: "Platform / DevOps",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#a78bfa",
      accent: "from-violet-400 to-fuchsia-500",
      power: "Zero-downtime deploys and incident response that reads like a playbook.",
      bio: "A good platform team is invisible — until something breaks, and then it's the reason nothing actually broke for the user.",
      personal: { location: "Singapore", email: "mei@forge.collective", languages: ["English", "Mandarin"] },
      skills: [
        { name: "Terraform", level: 92 },
        { name: "Kubernetes", level: 90 },
        { name: "Observability (OTel)", level: 88 },
        { name: "CI/CD Pipelines", level: 94 },
        { name: "Incident Response", level: 90 },
      ],
      education: [{ year: "2015", degree: "B.Eng Computer Engineering", school: "NUS Singapore" }],
      experience: [
        { period: "2022 — Now", role: "Platform Lead", company: "Forge Collective", desc: "Production hardening across all client deployments." },
        { period: "2018 — 2022", role: "SRE", company: "Shopify", desc: "Black Friday on-call. No outages on her watch." },
        { period: "2015 — 2018", role: "DevOps Engineer", company: "Grab", desc: "Built the regional CI platform from scratch." },
      ],
      projects: [
        { type: "Platform", title: "Forge Deploy", tags: ["Terraform", "K8s", "ArgoCD"] },
        { type: "Tooling", title: "Trace Lens", tags: ["OpenTelemetry", "Grafana"] },
      ],
      certificates: [{ title: "HashiCorp Certified Terraform Associate" }, { title: "CKA — Certified Kubernetes Admin" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 5,
    },
    {
      id: "FC-006",
      slug: "jonas-becker",
      name: "Jonas Becker",
      role: "Product Engineer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2.5&w=900&q=80",
      glow: "#22d3ee",
      accent: "from-cyan-400 to-teal-400",
      power: "Translates fuzzy product specs into shipping software.",
      bio: "Specs lie. Users don't. I'd rather ship a rough thing today and learn from it than ship a perfect thing in three months that nobody asked for.",
      personal: { location: "Berlin, Germany", email: "jonas@forge.collective", languages: ["English", "German"] },
      skills: [
        { name: "Product Discovery", level: 92 },
        { name: "TypeScript", level: 90 },
        { name: "React", level: 90 },
        { name: "User Research", level: 84 },
        { name: "Prototyping", level: 92 },
      ],
      education: [{ year: "2016", degree: "M.Sc HCI", school: "TU Berlin" }],
      experience: [
        { period: "2023 — Now", role: "Product Engineer", company: "Forge Collective", desc: "Embeds with clients to turn ambiguous goals into shipped product." },
        { period: "2019 — 2023", role: "Product Engineer", company: "Figma", desc: "Worked on FigJam early surfaces." },
        { period: "2016 — 2019", role: "Frontend Engineer", company: "SoundCloud", desc: "Creator analytics." },
      ],
      projects: [
        { type: "Product Discovery", title: "Helios MVP", tags: ["React", "Postgres", "Mixpanel"] },
        { type: "Internal", title: "Forge Insights", tags: ["TypeScript", "DuckDB"] },
      ],
      certificates: [{ title: "Reforge — Product Strategy" }],
      socials: { github: "https://github.com", linkedin: "https://linkedin.com", portfolio: "https://forge.dev" },
      isActive: true,
      order: 6,
    },
  ]);

  logger.info("Seeded 6 portfolio team members");
}
