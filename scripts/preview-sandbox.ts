/**
 * Throwaway API for looking at the site locally.
 *
 * Boots an in-memory MongoDB, runs the portfolio seed into it, and serves the
 * real Express app. Nothing persists and nothing touches the configured
 * database, which is the point: the B-4 case-study migration has to be
 * *compared* against the hand-built pages before those are deleted, and doing
 * that against the live database would mean writing three projects into
 * production to look at them.
 *
 *   pnpm tsx scripts/preview-sandbox.ts [port]
 *
 * Then point the website at it:  NEXT_PUBLIC_API_URL=http://127.0.0.1:<port>
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.argv[2] ?? 5100);

async function main(): Promise<void> {
  const mongo = await MongoMemoryServer.create();

  // Set before any module that reads `env` is imported — config/env validates
  // and freezes process.env at import time.
  process.env.MONGO_URI = mongo.getUri("portfolio_preview");
  process.env.NODE_ENV = "development";
  process.env.PORT = String(port);
  process.env.ENABLE_SEED = "false";
  // Both the usual dev port and 3100, which is where a preview runs when the
  // normal dev server already holds 3000.
  process.env.CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100"
  ].join(",");
  process.env.JWT_SECRET_SUPER_ADMIN ??= "preview-super-admin-secret-value-0123456789";
  process.env.JWT_SECRET_ADMIN ??= "preview-admin-secret-value-0123456789";

  const { connectDatabase } = await import("../src/config/db");
  await connectDatabase();

  const { seedPortfolioData } = await import("../src/modules/portfolio/portfolio.seed");
  await seedPortfolioData();

  // Nothing seeds team members — that is deliberate, the site shows an honest
  // empty roster until real people are published. Previewing the member page
  // therefore needs a fixture, and one full plus one bare member is what shows
  // whether the optional sections collapse instead of rendering empty headings.
  if (process.env.PREVIEW_TEAM_FIXTURE === "1") {
    const { PortfolioMemberModel } = await import("../src/modules/portfolio/portfolio-team.models");
    await PortfolioMemberModel.create([
      {
        id: "preview-full",
        slug: "preview-full",
        name: "Preview Full",
        role: "Everything Filled",
        avatar: "/team/placeholder.jpg",
        power: "Every optional field populated.",
        bio: "Two sentences of biography. Enough to see the pull-quote treatment.",
        personal: { location: "Vadodara, IN", email: "preview@example.com", languages: ["English", "Hindi"] },
        skills: [{ name: "Kubernetes", level: 90 }, { name: "Postgres", level: 75 }],
        education: [{ year: "2021", degree: "B.Tech, Computer Science", school: "Example Institute" }],
        experience: [{ period: "2022 — Present", role: "Lead", company: "Nventra", desc: "Ran delivery." }],
        projects: [{ type: "Mobile", title: "Preview App", tags: ["React Native", "AI"] }],
        certificates: [{ title: "AWS Solutions Architect" }],
        socials: { github: "https://github.com/example", linkedin: "https://linkedin.com/in/example" }
      },
      {
        id: "preview-bare",
        slug: "preview-bare",
        name: "Preview Bare",
        role: "Nothing Optional",
        avatar: "/team/placeholder.jpg"
      }
    ]);
  }

  // Page metadata comes from these rows once the case studies render through
  // the generic route, so a preview without them would show titles the live
  // site will not serve.
  const { seedSeoMeta } = await import("../src/modules/seo/seo.seed");
  await seedSeoMeta();

  const { createApp } = await import("../src/app");
  const app = await createApp();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`preview sandbox listening on http://127.0.0.1:${port}`);
  });

  const shutdown = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
