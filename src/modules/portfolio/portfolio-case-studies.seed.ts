import { logger } from "../../core/logging/logger";
import { PortfolioProjectModel, type PortfolioProjectDocument } from "./portfolio-projects.models";
import { TechStackModel } from "./portfolio-masters.models";

/**
 * B-4 — the three hand-built case studies, moved into the CMS.
 *
 * `/projects/ai-attendance`, `/projects/ai-call-bot-hospital` and
 * `/projects/business-meet` were each a ~1,400-line React file. Everything on
 * them — headings, metrics, screen copy, the technology list — was a deploy
 * away from being editable, which is the opposite of what a CMS is for. These
 * rows carry that content verbatim so the same URLs render the same pages from
 * the database.
 *
 * ── INSERT-IF-MISSING, NEVER OVERWRITE ──────────────────────────────────────
 *
 * Each project is inserted only when its slug is absent. The seed runs on every
 * cold start, so an upsert that wrote all fields would silently revert an
 * editor's work on the next deploy — the single worst failure mode a CMS can
 * have. Once a row exists, this file never touches it again.
 *
 * Deleting a row is therefore permanent-ish: the next boot re-creates it from
 * this file. Unpublish with `isActive: false` instead, which is what the admin
 * panel's toggle does.
 */

type CaseStudy = Omit<PortfolioProjectDocument, "isActive" | "order"> & {
  isActive?: boolean;
  order?: number;
};

/**
 * Technology master rows the case studies reference, with brand glyph and
 * colour.
 *
 * The bespoke pages imported their icons directly, so every project carried its
 * own copy of "React Native is `SiReact`, and `SiReact` is #61DAFB". That
 * belongs to the technology, not to the project, so it lives on the master row
 * and every project that lists the technology inherits it.
 *
 * Descriptions are the technology's role in general, not its role on one
 * project: the hand-written pages said "Attendance records" on one page and
 * "Patient records store" on another for the same MongoDB, and a master row
 * cannot hold both. Where they collided the wording here is the neutral one.
 */
const TECH_ROWS: {
  name: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  { name: "React Native", icon: "SiReact", color: "#61DAFB", description: "Cross-platform mobile app" },
  { name: "TypeScript", icon: "SiTypescript", color: "#3178C6", description: "Type-safe engineering" },
  { name: "TensorFlow", icon: "SiTensorflow", color: "#FF6F00", description: "AI face verification" },
  { name: "Google Maps", icon: "SiGooglemaps", color: "#4285F4", description: "Geo-fencing engine" },
  { name: "Node.js", icon: "SiNodedotjs", color: "#339933", description: "Scalable backend services" },
  { name: "Socket.IO", icon: "SiSocketdotio", color: "#FFFFFF", description: "Real-time sync" },
  { name: "MongoDB", icon: "SiMongodb", color: "#47A248", description: "Document data store" },
  { name: "Redis", icon: "SiRedis", color: "#FF4438", description: "Caching & queues" },
  { name: "AWS", icon: "FaAws", color: "#FF9900", description: "Cloud infrastructure" },
  { name: "Docker", icon: "SiDocker", color: "#2496ED", description: "Containerization" },
  { name: "GPT-4o-mini", icon: "SiOpenai", color: "#10A37F", description: "AI matching engine" },
  { name: "Vector Search", icon: "SiMongodb", color: "#47A248", description: "Semantic similarity" },
  { name: "WhatsApp API", icon: "SiWhatsapp", color: "#25D366", description: "Instant notifications" },
  { name: "LiveKit", icon: "SiLivekit", color: "#FF5630", description: "Real-time voice & WebRTC" },
  { name: "Gemini", icon: "SiGooglegemini", color: "#8E75B2", description: "Conversational reasoning" },
  { name: "GoTo", icon: "SiGotomeeting", color: "#F68D2E", description: "Telephony & call routing" },
  // No brand mark exists for either of these, so the hand-built page used a
  // lucide glyph. The renderer falls through to the same set.
  { name: "EHR API", icon: "HeartPulse", color: "#3B82F6", description: "US patient database API" },
  { name: "RingCentral", icon: "Phone", color: "#FF8800", description: "Enterprise phone system" }
];

const AI_ATTENDANCE: CaseStudy = {
  slug: "ai-attendance",
  title: "AI Attendance",
  category: "Digital Governance",
  metric: "Proxy-free, real-time attendance",
  year: "2025",
  image: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=2000&q=80",
  client: "Vadodara Municipal Corporation",
  timeframe: "",
  role: "Development, Deployment & Support",
  intro:
    "An AI-powered attendance management system transforming workforce management at Vadodara Municipal Corporation (VMC). 8,000+ employees mark attendance daily through the mobile app — verified by AI, validated by geo-fencing, and monitored in real time.",
  heroMeta: [
    { label: "Client", value: "Vadodara Municipal Corporation" },
    { label: "Scale", value: "8,000+ daily users" },
    { label: "Role", value: "Development, Deployment & Support" },
    { label: "Outcome", value: "Proxy-free, real-time attendance" }
  ],
  sectionHeadings: {
    stack: { eyebrow: "/the_stack", title: "Engineered for accountability.", lead: "" },
    roi: {
      eyebrow: "/the_impact",
      title: "Municipal scale, measurable results.",
      lead: ""
    },
    problem: { eyebrow: "/the_problem", title: "Attendance you can't trust.", lead: "" },
    solution: { eyebrow: "/the_solution", title: "Verified, located, live.", lead: "" },
    screens: {
      eyebrow: "/interface",
      title: "Product in action.",
      lead: "Simple for field employees, powerful for administrators."
    },
    features: {
      eyebrow: "/key_highlights",
      title: "Key highlights.",
      lead: "Every layer of the system is built to guarantee attendance accuracy at scale."
    },
    workflow: { eyebrow: "/the_workflow", title: "How we built it.", lead: "" }
  },
  screenLabelPrefix: "Screen",
  stack: [],
  techStack: [
    "React Native",
    "TypeScript",
    "TensorFlow",
    "Google Maps",
    "Node.js",
    "Socket.IO",
    "MongoDB",
    "Redis",
    "AWS",
    "Docker"
  ],
  problem:
    "Manual registers and legacy biometric machines couldn't keep up with a workforce spread across hundreds of municipal locations. Proxy entries, delayed reporting, and zero real-time visibility made accurate workforce management nearly impossible.",
  solution:
    "We combined AI face verification with geo-fencing based validation so every punch is both genuinely the employee and genuinely on site. Group attendance capture handles field teams, while real-time monitoring and a centralized dashboard give VMC live visibility across every location.",
  features: [
    {
      title: "AI-Verified Attendance",
      description:
        "Face verification on every punch ensures the right person marks attendance — no proxies.",
      icon: "ScanFace",
      accent: "blue"
    },
    {
      title: "Geo-Fencing Validation",
      description:
        "Attendance is accepted only within assigned geo-fenced work zones across the city.",
      icon: "MapPin",
      accent: "neutral"
    },
    {
      title: "Group Attendance Capture",
      description:
        "Supervisors capture entire field teams in one shot — ideal for on-site municipal crews.",
      icon: "Users",
      accent: "purple"
    },
    {
      title: "Real-Time Monitoring",
      description:
        "Live attendance status streams to administrators the moment employees check in.",
      icon: "Activity",
      accent: "amber"
    },
    {
      title: "Central Dashboard & Analytics",
      description:
        "Centralized reporting, trends, and analytics across all departments and locations.",
      icon: "LayoutDashboard",
      accent: "rose"
    },
    {
      title: "Built for Mobile",
      description:
        "A fast, reliable mobile app that thousands of employees use every single day.",
      icon: "Smartphone",
      accent: "indigo"
    }
  ],
  gallery: [
    {
      src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
      caption: "AI-verified, proxy-free attendance",
      label: "Verification"
    },
    {
      src: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80",
      caption: "Geo-fenced validation across the city",
      label: "Location"
    }
  ],
  roi: [
    {
      value: "8,000+",
      label: "Daily Active Employees",
      description: "VMC staff across the city mark attendance through the app every working day.",
      icon: "Users"
    },
    {
      value: "0",
      label: "Proxy Entries",
      description: "AI face verification combined with geo-fencing eliminates buddy punching.",
      icon: "Shield"
    },
    {
      value: "Live",
      label: "Multi-location Visibility",
      description: "Real-time attendance status across wards, offices, and field sites.",
      icon: "Activity"
    },
    {
      value: "#1",
      label: "Municipal-scale Deployment",
      description: "One of the largest attendance rollouts in the municipal sector.",
      icon: "Building2"
    }
  ],
  roiSectionDescription:
    "One of the largest attendance deployments in the municipal sector — accurate, proxy-free, and visible in real time across the entire city.",
  screens: [
    {
      label: "AI-Verified Check-in",
      caption: "Face-verified attendance in seconds",
      description:
        "Employees mark attendance from the mobile app with on-device AI face verification, eliminating proxy entries entirely.",
      image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1600&q=80"
    },
    {
      label: "Geo-Fenced Zones",
      caption: "Attendance only where it should happen",
      description:
        "Geo-fencing validates every punch against assigned work locations — wards, offices, and field sites across the city.",
      image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
    },
    {
      label: "Central Dashboard",
      caption: "Real-time visibility across every location",
      description:
        "Supervisors and HQ monitor live attendance, group captures, and analytics from one centralized dashboard.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80"
    }
  ],
  workflowSteps: [
    {
      step: "01",
      title: "AI on the Edge",
      description:
        "On-device face verification models validate identity instantly, even in low-connectivity field conditions."
    },
    {
      step: "02",
      title: "Geo-Fencing Engine",
      description:
        "Location services validate every punch against assigned geo-fenced zones — wards, offices, and field sites."
    },
    {
      step: "03",
      title: "Real-Time Backbone",
      description:
        "Node.js microservices with Redis and Socket.IO stream attendance events live to the centralized dashboard."
    }
  ],
  stackSectionDescription:
    "AI verification and geo-fencing on the edge, backed by a real-time cloud pipeline that serves thousands of users every day without breaking a sweat.",
  architecture: "",
  order: 2
};

const AI_CALL_BOT: CaseStudy = {
  slug: "ai-call-bot-hospital",
  title: "AI Call Agent",
  category: "Voice AI",
  metric: "85% call automation rate",
  year: "2025",
  image: "/projects/ai-call-bot-hospital/hero.jpg",
  client: "Regional Hospital Network",
  timeframe: "12 weeks · 2025",
  role: "Full-stack AI Engineering",
  // No opening paragraph: this page goes straight from the title to the meta
  // strip, and it reads better that way than the other two.
  intro: "",
  heroMeta: [
    { label: "Client", value: "Regional Hospital Network" },
    { label: "Timeframe", value: "12 weeks · 2025" },
    { label: "Role", value: "Full-stack AI Engineering" },
    { label: "Outcome", value: "85% call automation rate" }
  ],
  sectionHeadings: {
    stack: { eyebrow: "/the_stack", title: "Built for voice at scale.", lead: "" },
    roi: { eyebrow: "/the_roi", title: "Measurable impact.", lead: "" },
    problem: { eyebrow: "/the_problem", title: "Overwhelmed scheduling lines.", lead: "" },
    solution: { eyebrow: "/the_solution", title: "Intelligent voice automation.", lead: "" },
    screens: {
      eyebrow: "/interface",
      title: "Call flows in action.",
      lead: "From inbound intake to confirmed appointment — every step handled by voice AI with full hospital system integration."
    },
    features: {
      eyebrow: "/intelligence",
      title: "Core capabilities.",
      lead: "A multi-layered AI system designed for healthcare-grade reliability, security, and conversational accuracy."
    },
    workflow: { eyebrow: "/the_workflow", title: "How we built it.", lead: "" }
  },
  // The panels are call flows, not app screens.
  screenLabelPrefix: "Flow",
  stack: [],
  techStack: [
    "LiveKit",
    "Gemini",
    "GoTo",
    "Node.js",
    "MongoDB",
    "EHR API",
    "AWS",
    "RingCentral"
  ],
  problem:
    "Hospital front desks field hundreds of appointment calls daily. Hold times stretch past 20 minutes, staff burn out on repetitive booking tasks, and after-hours callers hit voicemail with no way to schedule until morning.",
  solution:
    "We built an AI call agent that answers every line instantly, looks up patient records in real time, checks doctor availability across departments, and books appointments — all through natural conversation with sub-150ms response times.",
  features: [
    {
      title: "Patient DB Lookup",
      description:
        "Real-time access to patient history, allergies, and prior visits during every call.",
      icon: "Database",
      accent: "blue"
    },
    {
      title: "Smart Scheduling",
      description:
        "Cross-department availability checks with insurance validation and conflict detection.",
      icon: "Calendar",
      accent: "emerald"
    },
    {
      title: "Ultra-low Latency",
      description:
        "Sub-150ms voice round-trip via streaming STT, cached context, and edge inference.",
      icon: "Zap",
      accent: "amber"
    },
    {
      title: "HIPAA Compliant",
      description:
        "End-to-end encryption, audit logging, and PHI handling aligned with healthcare standards.",
      icon: "Shield",
      accent: "rose"
    },
    {
      title: "Sentiment Detection",
      description:
        "Detects patient distress or urgency and escalates to a live nurse or doctor instantly.",
      icon: "HeartPulse",
      accent: "purple"
    },
    {
      title: "Multi-language",
      description:
        "Supports 20+ languages for diverse patient populations with accent-adaptive STT.",
      icon: "Users",
      accent: "indigo"
    }
  ],
  gallery: [
    {
      src: "/projects/ai-call-bot-hospital/voice-pipeline.jpg",
      caption: "Real-time speech processing",
      label: "Voice Pipeline"
    },
    {
      src: "/projects/ai-call-bot-hospital/ehr-integration.jpg",
      caption: "Live patient database sync",
      label: "Integration"
    }
  ],
  roi: [
    {
      value: "<150ms",
      label: "Response latency",
      description:
        "Ultra-low latency voice pipeline keeps conversations natural — patients never wait for the AI to think.",
      icon: "Zap"
    },
    {
      value: "85%",
      label: "Calls self-resolved",
      description:
        "Most appointment bookings, reschedules, and reminders handled end-to-end without human transfer.",
      icon: "TrendingUp"
    },
    {
      value: "24/7",
      label: "Always available",
      description:
        "Round-the-clock scheduling coverage eliminates missed calls and after-hours voicemail backlogs.",
      icon: "Clock"
    },
    {
      value: "12+",
      label: "Departments integrated",
      description:
        "Cardiology, orthopedics, pediatrics, and more — unified scheduling across the hospital network.",
      icon: "Building2"
    }
  ],
  roiSectionDescription:
    "The hospital network reduced front-desk call volume, eliminated scheduling backlogs, and improved patient satisfaction — all while maintaining HIPAA compliance.",
  screens: [
    {
      label: "Inbound Intake",
      caption: "Natural voice greeting and triage",
      description:
        "Patients call the hospital line and speak naturally. The AI agent identifies intent, verifies identity, and routes to the right department — no IVR maze.",
      image: "/projects/ai-call-bot-hospital/inbound.jpg"
    },
    {
      label: "Live Scheduling",
      caption: "Real-time appointment booking",
      description:
        "The agent queries live doctor availability, suggests optimal slots, confirms insurance, and books directly into the hospital scheduling system.",
      image: "/projects/ai-call-bot-hospital/scheduling.jpg"
    },
    {
      label: "Patient Records",
      caption: "Secure EHR database integration",
      description:
        "HIPAA-compliant lookup of patient history, prior visits, prescriptions, and allergies — surfaced contextually during the call for personalized care.",
      image: "/projects/ai-call-bot-hospital/records.jpg"
    }
  ],
  workflowSteps: [
    {
      step: "01",
      title: "Voice Ingress",
      description:
        "GoTo and RingCentral SIP trunks stream audio through LiveKit for real-time transcription with speaker diarization and noise cancellation."
    },
    {
      step: "02",
      title: "AI Orchestration",
      description:
        "Node.js agents query US EHR APIs and MongoDB patient records, check scheduling systems, and generate natural responses via Gemini."
    },
    {
      step: "03",
      title: "Deploy & Scale",
      description:
        "RingCentral-integrated voice services on AWS with auto-scaling, HIPAA-compliant logging, and failover routing for 99.9% uptime."
    }
  ],
  stackSectionDescription:
    "A real-time voice pipeline connecting GoTo and RingCentral telephony, LiveKit streams, Gemini reasoning, and US EHR APIs — engineered for sub-150ms round-trip latency.",
  architecture: "",
  order: 1
};

const BUSINESS_MEET: CaseStudy = {
  slug: "business-meet",
  title: "Business Meet",
  category: "AI Networking Platform",
  metric: "Intelligent professional matching",
  year: "2025",
  image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=2000&q=80",
  client: "Business Meet (Internal)",
  timeframe: "14 weeks · 2025",
  role: "Full-stack & AI Engineering",
  intro:
    "An AI-powered networking and travel platform connecting professionals, travelers, and local communities through intelligent matching and real-time engagement — with AI-based recommendations for profiles, connections, meetings, and minutes of meeting.",
  heroMeta: [
    { label: "Client", value: "Business Meet (Internal)" },
    { label: "Timeframe", value: "14 weeks · 2025" },
    { label: "Role", value: "Full-stack & AI Engineering" },
    { label: "Outcome", value: "Intelligent professional matching" }
  ],
  sectionHeadings: {
    stack: { eyebrow: "/the_stack", title: "Engineered for connection.", lead: "" },
    roi: { eyebrow: "/the_roi", title: "Tangible impact.", lead: "" },
    problem: { eyebrow: "/the_problem", title: "Networking is random.", lead: "" },
    solution: { eyebrow: "/the_solution", title: "Intelligence-driven serendipity.", lead: "" },
    screens: {
      eyebrow: "/interface",
      title: "Product in action.",
      lead: "Fast, fluid interfaces with real-time updates, interactive maps, and live dashboard sync."
    },
    features: {
      eyebrow: "/intelligence",
      title: "Intelligence layers.",
      lead: "Every surface of the platform is powered by AI recommendations working in concert."
    },
    workflow: { eyebrow: "/the_workflow", title: "How we built it.", lead: "" }
  },
  screenLabelPrefix: "Screen",
  stack: [],
  techStack: [
    "React Native",
    "TypeScript",
    "GPT-4o-mini",
    "Vector Search",
    "Node.js",
    "Socket.IO",
    "WhatsApp API",
    "Redis",
    "AWS",
    "Docker"
  ],
  problem:
    "Professionals traveling to new cities and events waste hours on cold outreach and irrelevant introductions. Discovering the right people — by field, interest, destination, and timing — is left entirely to chance, and meeting outcomes evaporate without structured follow-up.",
  solution:
    "We built an AI traveler-matching engine using GPT-4o-mini and vector search that connects users on destination, interests, and travel dates. Field-aware recommendations surface profiles, connections, and meetings, while AI-generated minutes of meeting and microservice-based email and WhatsApp notifications keep every conversation moving.",
  features: [
    {
      title: "Profile Recommendations",
      description:
        "Field-aware AI suggests the most relevant professionals to your goals and industry.",
      icon: "Users",
      accent: "blue"
    },
    {
      title: "Smart Connections",
      description:
        "Vector search matches on destination, interests, and travel dates for high-signal intros.",
      icon: "Sparkles",
      accent: "neutral"
    },
    {
      title: "Meeting Suggestions",
      description:
        "AI proposes when, where, and with whom to meet based on shared context and availability.",
      icon: "Calendar",
      accent: "purple"
    },
    {
      title: "AI Minutes of Meeting",
      description: "Structured MoMs with action items generated automatically after every meeting.",
      icon: "FileText",
      accent: "amber"
    },
    {
      title: "Live Maps & Dashboards",
      description:
        "Interactive maps and real-time dashboard synchronization keep engagement live.",
      icon: "MapPin",
      accent: "rose"
    },
    {
      title: "Multi-channel Alerts",
      description:
        "Scalable microservices push email and WhatsApp notifications the moment things change.",
      icon: "MessageSquare",
      accent: "indigo"
    }
  ],
  gallery: [
    {
      src: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80",
      caption: "AI-ranked professional recommendations",
      label: "Matching"
    },
    {
      src: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
      caption: "Destination and date aware connections",
      label: "Travel"
    }
  ],
  roi: [
    {
      value: "92%",
      label: "Match Relevance",
      description: "Vector-search powered recommendations users actually accept and act on.",
      icon: "TrendingUp"
    },
    {
      value: "<1s",
      label: "Page Loads",
      description: "Modern frontend architecture delivers near-instant, fluid interactions.",
      icon: "Zap"
    },
    {
      value: "10 min",
      label: "Saved per meeting",
      description: "Automatic minutes of meeting eliminate manual note-taking and follow-ups.",
      icon: "Clock"
    },
    {
      value: "2 Channels",
      label: "Notification Reach",
      description: "Scalable microservices deliver email and WhatsApp updates in real time.",
      icon: "Bell"
    }
  ],
  roiSectionDescription:
    "From first recommendation to signed-off minutes, Business Meet compresses the entire networking lifecycle into one intelligent flow.",
  screens: [
    {
      label: "Smart Matching",
      caption: "AI-recommended profiles and connections",
      description:
        "GPT-4o-mini and vector search analyze industry, interests, destination, and travel dates to surface the professionals you should actually meet.",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
    },
    {
      label: "Live Map & Meetings",
      caption: "Discover people and events around you",
      description:
        "Interactive maps with real-time presence let travelers and locals find nearby professionals, schedule meetings, and join community events instantly.",
      image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
    },
    {
      label: "AI Minutes of Meeting",
      caption: "Every meeting captured automatically",
      description:
        "After each meeting the platform generates structured minutes, action items, and follow-up recommendations — synced live to your dashboard.",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80"
    }
  ],
  workflowSteps: [
    {
      step: "01",
      title: "AI Matching Engine",
      description:
        "GPT-4o-mini enriches profiles into embeddings; vector search ranks candidates by destination, interests, and travel dates."
    },
    {
      step: "02",
      title: "Responsive Frontend",
      description:
        "Modern component architecture with optimistic updates and streaming data delivers near-instant page loads and smooth interactions."
    },
    {
      step: "03",
      title: "Real-time Microservices",
      description:
        "Event-driven notification services for email and WhatsApp, with Socket.IO powering live maps and dashboard synchronization."
    }
  ],
  stackSectionDescription:
    "An AI-driven matching engine on top of a scalable microservice backbone, delivering real-time updates, interactive maps, and live dashboard synchronization.",
  architecture: "",
  order: 3
};

export const CASE_STUDIES: CaseStudy[] = [AI_CALL_BOT, AI_ATTENDANCE, BUSINESS_MEET];

/**
 * Ensures the technology master has a row for every technology the case studies
 * name, with its glyph and colour.
 *
 * Only the icon, colour and description are written, and only when they are
 * missing or different — order and `isActive` are left alone so a reordered or
 * hidden row stays that way. A project's stack renders by matching names, so a
 * missing row here is what makes a technology appear as an unlabelled grey
 * square on the live page.
 */
async function ensureTechStackRows(): Promise<void> {
  const existing = await TechStackModel.find({
    name: { $in: TECH_ROWS.map((t) => t.name) }
  })
    .select("name icon color description")
    .lean()
    .exec();

  const byName = new Map(existing.map((row) => [row.name, row]));
  let created = 0;
  let updated = 0;
  let maxOrder = await TechStackModel.countDocuments().exec();

  for (const row of TECH_ROWS) {
    const current = byName.get(row.name);

    if (!current) {
      maxOrder += 1;
      await TechStackModel.create({
        name: row.name,
        image: "",
        description: row.description,
        icon: row.icon,
        color: row.color,
        isActive: true,
        order: maxOrder
      });
      created += 1;
      continue;
    }

    // Backfill the glyph onto rows the earlier seed created without one. The
    // description is only filled in when blank — an editor's wording wins.
    const patch: Record<string, string> = {};
    if (!current.icon) patch.icon = row.icon;
    if (!current.color) patch.color = row.color;
    if (!current.description) patch.description = row.description;

    if (Object.keys(patch).length > 0) {
      await TechStackModel.updateOne({ _id: current._id }, { $set: patch }).exec();
      updated += 1;
    }
  }

  if (created > 0 || updated > 0) {
    logger.info("Tech stack masters reconciled for the case studies", { created, updated });
  }
}

/**
 * Inserts any case study whose slug is not already in the database.
 *
 * Returns the slugs it created, which is what the boot log reports — a quiet
 * run means the rows were already there and nothing was touched.
 */
export async function seedCaseStudies(): Promise<string[]> {
  await ensureTechStackRows();

  const present = await PortfolioProjectModel.find({
    slug: { $in: CASE_STUDIES.map((c) => c.slug) }
  })
    .select("slug")
    .lean()
    .exec();

  const have = new Set(present.map((p) => p.slug));
  const missing = CASE_STUDIES.filter((c) => !have.has(c.slug));

  if (missing.length === 0) return [];

  await PortfolioProjectModel.insertMany(
    missing.map((c) => ({ ...c, isActive: c.isActive ?? true, order: c.order ?? 0 }))
  );

  const slugs = missing.map((c) => c.slug);
  logger.info("Seeded case studies into the CMS", { slugs });
  return slugs;
}
