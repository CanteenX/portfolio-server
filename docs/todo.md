# Nventra Portfolio — Execution Checklist

> Rationale and architecture decisions: [plan.md](./plan.md)

Grouped by phase. See docs/plan.md for the reasoning behind each decision (D1–D10).

## Phase 0 — Unblock the SEO module

> Three items closed 2026-09-15. The menu row was initially added under
> `#portfolio`, then moved to its own `#website` group per D1. Both edits were
> verified by re-reading the file — an earlier attempt reported success while a
> CRLF mismatch meant the replacement never applied, which is how the missing
> row survived long enough for the planner to catch it.

- [x] Add a `#website` root group to `MENU_TREE` in `D:\CanteenX\Portfolio\portfolio-server\src\bootstrap\seed-rbac.ts` at `sequence: 20`, between `#portfolio` (10) and `#modules` (40)
- [x] Add child `{ menuUrl: "/website/seo-manager", menuName: "SEO Manager", icon: "Search", sequence: 1 }` under `#website` in the same file
- [x] Add `"/website/seo-manager"` to `IMAGE_UPLOAD_MENUS` in `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio-masters.routes.ts` (lines 29-34) so OG-image upload does not 403
- [ ] Run `seedRbacBaseline()` against the target database and confirm the MenuMaster row exists
- [ ] Grant the new menu read/write/edit/delete to the Administrator role in the permission matrix screen
- [ ] VERIFY: log in as a **non-super-admin** and confirm `GET /api/v1/seo` returns 200 and the server log has no `"RBAC lookup failed — run the RBAC seed"` line (wait 60s for the `LOOKUP_TTL_MS` cache)

## Phase 1 — SEO Manager admin screen

### SDK
- [ ] Create `D:\CanteenX\Portfolio\portfolio-admin\src\shared\sdk\seo.ts` with `listSeoMeta`, `getSeoMeta`, `createSeoMeta`, `updateSeoMeta`, `deleteSeoMeta`
- [ ] Type `listSeoMeta` as returning `{ items: SeoMetaRow[] }` and `deleteSeoMeta` as 204-with-no-body (do not parse it)
- [ ] Export the SEO types from `D:\CanteenX\Portfolio\portfolio-admin\src\shared\sdk\index.ts`

### Rules module
- [ ] Create `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\website\seo\seoRules.js` (pure, no React, no DOM)
- [ ] Port `TITLE_LIMIT 60`, `DESCRIPTION_LIMIT 160`, `TITLE_MIN 30`, `DESCRIPTION_MIN 70`, `KEYWORD_MAX 10`, `WARN_RATIO 0.9` from `D:\CanteenX\Gym\Gym-Admin\src\pages\Website\seo\seoRules.js`
- [ ] Port `counterState`, `keywordList`, `effectiveOgTitle`, `effectiveOgDescription`, `evaluateSeo`, `completeness`
- [ ] Port `indexableRules` and `hiddenRules` (keep `hiddenRules` per D10 even though there is no portal)
- [ ] Write `siteOrigin()` using `process.env.REACT_APP_SITE_URL` (CRA, not Vite — do NOT copy `import.meta.env`)
- [ ] Write `canonicalProblem` mirroring `isValidCanonicalUrl` in `D:\CanteenX\Portfolio\portfolio-server\src\modules\seo\seo-meta.model.ts:73-95`, **including the root-relative `/path` branch the server accepts and Gym's version rejects**
- [ ] Import the category vocabulary from the server's `SEO_CATEGORIES` shape (`Marketing | Detail | Other`) — do NOT copy Gym's `["Marketing","Portal","Other"]`

### Components
- [ ] Create `.\seo\CharacterCounter.jsx` — count, limit, word label, amber at 90%, red past the limit
- [ ] Create `.\seo\KeywordInput.jsx` — chips, Enter or comma to add, click to remove, `inputId="seoKeywordInput"`
- [ ] Create `.\seo\SeoList.jsx` — category chips with counts + table (Page, Category, Meta title with `n/60`, Keywords, Search, Completeness, Actions)
- [ ] Render Completeness as a **word in a badge plus "n of m checks pass"**, never a bare coloured dot
- [ ] Wrap the list's Edit and Delete buttons in `RbacGate action="edit"` / `action="delete"`
- [ ] Create `.\seo\SeoEditor.jsx` with field ids `seoSlug`, `seoPageTitle`, `seoCategory`, `seoNoIndex`, `seoIsActive`, `seoMetaTitle`, `seoMetaDescription`, `seoKeywordInput`, `seoCanonicalUrl`, `seoOgTitle`, `seoOgType`, `seoOgDescription`, `seoOgImage`
- [ ] Add the "Use this page" button next to Canonical URL, filling the route's own absolute URL
- [ ] Add the canonical error message AND the separate "points at a different page" warning
- [ ] Wire the OG image field to `uploadPortfolioImage(api, file)` with a thumbnail preview (per D9 — requires the Phase 0 `IMAGE_UPLOAD_MENUS` change)
- [ ] Hide the search/social field groups when `noIndex` is on, behind a "Show the search fields anyway" toggle
- [ ] Create `.\seo\SeoScorePanel.jsx` — score, band, progress bar, one clickable list item per rule that focuses and scrolls to `rule.targetId`
- [ ] Create `.\seo\GooglePreview.jsx` with the **desktop/mobile toggle** (60/160 vs 50/120 char proxies) and the "hidden from search" notice
- [ ] Create `.\seo\SocialPreview.jsx` rendering the effective (inherited) OG title/description/image

### Container and routing
- [ ] Create `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\website\SeoManagerPage.js` — owns `values`, fetches `GET /api/v1/seo` once, filters in the browser
- [ ] Follow the `PortfolioTechStackPage.js` idiom (Tailwind, `useAuth().api`, modal form, `RbacGate`) not Gym's reactstrap
- [ ] Add a delete confirmation using the existing `DeleteConfirmModal.jsx`, not `window.confirm`
- [ ] Add the lazy import and `<Route path="/website/seo-manager" element={<SeoManagerPage />} />` to `D:\CanteenX\Portfolio\portfolio-admin\src\app\App.js` — the path must byte-match the Phase 0 seed (D1)
- [ ] VERIFY as a **non-super-admin**: buttons appear, create/edit/delete all succeed, and a user without the grant sees none of them
- [ ] VERIFY: saving a full URL in the Route field is rejected with the server's message, not silently truncated
- [ ] VERIFY: a canonical of `/services` is accepted (server allows root-relative) and `https://localhost/x` is rejected on both sides

## Phase 2 — Website composition layer, seeding, structured data

### Server
- [ ] Create `D:\CanteenX\Portfolio\portfolio-server\src\modules\seo\seo.seed.ts` exporting `seedSeoMeta()`, idempotent upsert-if-absent on `slug`, never overwriting an edited row
- [ ] Seed rows for `/`, `/about`, `/services`, `/how-we-work`, `/team`, `/work`, `/projects` (category `Marketing`)
- [ ] Seed rows for `/projects/ai-attendance`, `/projects/ai-call-bot-hospital`, `/projects/business-meet` (category `Detail`) — these three have no CMS row and no other metadata source
- [ ] Copy each row's `metaTitle`/`metaDescription` from the existing page constants so nothing regresses on first render
- [ ] Call `seedSeoMeta()` from `seedPortfolioData()` in `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio.seed.ts` (alongside the four existing seeders)
- [ ] Add `src/__tests__/seo.test.ts` covering `normalizeSlug` (`"services"`, `"/Services/"`, `"//evil.com"`, `"https://x/y"`, `"/a?b#c"`) and `isValidCanonicalUrl` (empty, root-relative, localhost, hostless, `mailto:`)
- [ ] **Add the new test file to the `test` and `test:unit` script strings in `portfolio-server/package.json`** — the runner takes an explicit file list

### Website — fetch and composition
- [ ] Add `SeoMetaRow` type and `getSeoMeta(slug)` to `D:\CanteenX\Portfolio\Portfolio\lib\api.ts`, calling `GET /api/v1/public/seo?slug=`
- [ ] Give `getSeoMeta` a 3-second timeout (not the shared 10 s) and a `null`-on-any-failure contract (D3)
- [ ] Wrap `getSeoMeta` in React `cache()` so `generateMetadata` and the page body share one request
- [ ] Create `D:\CanteenX\Portfolio\Portfolio\lib\seo.ts` with `absoluteUrl`, `validCanonical`, `MARKETING_ROUTES`, `buildPageMetadata`
- [ ] Implement `buildPageMetadata` per-field fallback: SeoMeta value → page constant → omitted
- [ ] **Spread every optional key conditionally — never write `title: undefined`** (D2, R4)
- [ ] Return a SeoMeta `metaTitle` as `{ absolute: … }` so the layout's `"%s — Nventra"` template does not append 10 characters past the counted limit (D4)
- [ ] Default the canonical to `absoluteUrl(slug)` whenever `validCanonical` rejects the stored value

### Website — route conversion
- [ ] Convert `app/about/page.tsx` from `export const metadata` to `generateMetadata` calling `buildPageMetadata`
- [ ] Convert `app/services/page.tsx`
- [ ] Convert `app/how-we-work/page.tsx`
- [ ] Convert `app/team/page.tsx`
- [ ] Convert `app/work/page.tsx`
- [ ] Convert `app/projects/page.tsx`
- [ ] Convert `app/contact/page.tsx`
- [ ] Split `D:\CanteenX\Portfolio\Portfolio\app\page.tsx`: move the `"use client"` body to `app/home-view.tsx` taking `initialSettings`, leave a server shell with `generateMetadata` + `revalidate = 3600` (D6)
- [ ] Split `app/projects/ai-attendance/page.tsx` into `page.tsx` (server shell) + `view.tsx` (current client body, unchanged)
- [ ] Split `app/projects/ai-call-bot-hospital/page.tsx` the same way
- [ ] Split `app/projects/business-meet/page.tsx` the same way
- [ ] Layer the SeoMeta **override** onto `app/projects/[slug]/page.tsx` — a present row wins field-by-field over the record-derived values (D7); do not invert it
- [ ] Layer the same override onto `app/team/[slug]/page.tsx`

### Website — sitemap, redirect, OG, JSON-LD
- [ ] Refactor `app/sitemap.ts` to read `MARKETING_ROUTES` from `lib/seo.ts` instead of its own `STATIC_ROUTES`
- [ ] Add the three legacy project paths to the sitemap
- [ ] Exclude any route whose SeoMeta row has `noIndex: true` from the sitemap
- [ ] Add a 308 redirect `/projects` → `/work` in `D:\CanteenX\Portfolio\Portfolio\next.config.ts` (D8)
- [ ] VERIFY the redirect does not catch `/projects/<slug>`
- [ ] Remove `/projects` from the sitemap once the redirect is live
- [ ] Create `app/opengraph-image.tsx` producing a default branded OG card
- [ ] Add `buildOrganizationGraph()` to `lib/seo.ts`: `Organization` + `WebSite` + `OfferCatalog`/`Service[]` from `PortfolioSettings.services`, with a real `sameAs` array (D5)
- [ ] Do NOT emit `LocalBusiness`; do NOT emit `address`, `geo`, `openingHours` or `priceRange` on any node
- [ ] Render the graph as a single JSON-LD script from `app/layout.tsx`
- [ ] Add `BreadcrumbList` JSON-LD to `app/projects/[slug]/page.tsx` and `app/team/[slug]/page.tsx`, referencing the Organization by `@id`
- [ ] VERIFY with `curl -s <url> | grep -i '<title>\|canonical\|og:'` on all 11 seeded routes against the **deployed** URL
- [ ] VERIFY with the backend deliberately unreachable that every route still ships its page-constant title and a correct canonical

## Phase 3 — Compliance and lead capture

### Legal pages
- [ ] Create `app/privacy/page.tsx` + `view.tsx` — controller identity, data collected, lawful basis, retention period, processors (Vercel, Supabase, MongoDB Atlas, mail provider), subject rights, contact address
- [ ] Create `app/terms/page.tsx` + `view.tsx`
- [ ] Get the retention period, controller name and processor list from the owner — do not invent them
- [ ] Link both from `components/ui/footer.tsx` and from the contact form
- [ ] Add `/privacy` and `/terms` rows to `seo.seed.ts` and to `MARKETING_ROUTES`

### Contact form
- [ ] Add `id` to every input in `D:\CanteenX\Portfolio\Portfolio\app\contact\view.tsx` (lines 314, 328, 354) and `htmlFor` to every label (311, 325, 351)
- [ ] Wire `aria-describedby` from each input to its error text and move focus to the first error on failed submit
- [ ] Add a required consent checkbox linking to `/privacy`, and store the accepted text + UTC timestamp on the submission
- [ ] Add a honeypot field (visually hidden, `tabIndex={-1}`, `autoComplete="off"`) and reject filled submissions server-side
- [ ] Fix the "Book a Call" tab: either submit the selected `callSlot` through the existing endpoint, or replace the `https://cal.com` link at line 261 with a real booking URL — the default tab must be able to convert
- [ ] Add optional `phone`, `company`, `budgetBand`, `timeline` fields to the message form

### Server
- [ ] Add `phone`, `company`, `budgetBand`, `timeline`, `source`, `referrer`, `consentText`, `consentAt` to `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio-contacts.models.ts`
- [ ] Extend `submitContactSchema` in `portfolio-contacts.routes.ts:36-42` with matching zod rules and max lengths
- [ ] Capture `referrer` and UTM params server-side from the request, not from a client-supplied hidden field
- [ ] Create `D:\CanteenX\Portfolio\portfolio-server\src\core\mail\mail.service.ts` using the existing `nodemailer@^8.0.5` dependency
- [ ] Send the new-lead notification **after** `res.status(201)` — a mail failure must never fail a captured lead (R9)
- [ ] Put SMTP credentials in Vercel env on the server project; never in the repo
- [ ] Surface the new fields as columns in `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\portfolio\PortfolioContactsPage.js`
- [ ] Add a validation test for the extended contact schema and add the file to `package.json`'s test script
- [ ] VERIFY: submit with the honeypot filled → rejected; submit 6 times in a minute → 429; submit with mail misconfigured → still 201 and the row exists

## Phase 4 — Errors, analytics, security headers

- [ ] Create `D:\CanteenX\Portfolio\Portfolio\app\not-found.tsx` with navbar, footer and links to `/work`, `/services`, `/contact`
- [ ] Create `app/error.tsx` and `app/global-error.tsx`
- [ ] Call `notFound()` from `app/projects/[slug]/page.tsx` when the record is absent (currently returns 200 with empty content — a soft-404)
- [ ] Call `notFound()` from `app/team/[slug]/page.tsx` likewise
- [ ] VERIFY `/projects/we-converse` (linked from `app/page.tsx:22`) resolves to a real page or a real 404, not a blank one
- [ ] Add a consent gate that loads analytics only after acceptance, defaulting to off
- [ ] Add `@vercel/analytics` and `@vercel/speed-insights` behind that gate
- [ ] Emit conversion events: contact submitted, call slot chosen, case study opened
- [ ] Add a cookie notice tied to the consent gate (only now that there is something to consent to)
- [ ] Add `headers()` to `next.config.ts`: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- [ ] Add CSP in **report-only** mode first; enumerate the Spline, Supabase and Vercel origins from the reports before enforcing (R11)
- [ ] Create `app/manifest.ts` and add an `apple-icon`
- [ ] VERIFY securityheaders.com grade and that the Spline hero still renders under the enforced CSP

## Phase 5 — Credibility

- [ ] Create `Testimonial` model in `portfolio-server/src/modules/portfolio/`: quote, authorName, authorRole, company, companyLogo, projectId, consentToPublish, order, isActive
- [ ] Block setting `isActive: true` unless `consentToPublish` is true (R15)
- [ ] Add public `GET /api/v1/public/portfolio/testimonials` and RBAC-guarded admin CRUD
- [ ] Seed a `/website/testimonials` menu row in `seed-rbac.ts` under `#website`
- [ ] Create `portfolio-admin/src/modules/deep/website/TestimonialsPage.js` + `shared/sdk/testimonials.ts` + `App.js` route at `/website/testimonials`
- [ ] Add a `logo` field to the `clients` master and render a client logo strip on `/` and `/work`
- [ ] Add `outcomeBaseline`, `outcomeResult`, `outcomeSource` and an optional `testimonialId` to the project model and the projects admin screen
- [ ] Render the outcome as before → after with an attributed source on `app/projects/[slug]/project-detail.tsx`
- [ ] Replace the two `images.unsplash.com` URLs at `app/page.tsx:23` and `:37` with real assets
- [ ] Create CMS rows for the three legacy case studies so they leave the hardcoded code path
- [ ] Add an engagement-model section to `/how-we-work` (typical size, duration, scoping process)
- [ ] VERIFY every new section collapses cleanly when it has zero rows

## Phase 6 — Accessibility and performance

- [ ] Capture a Lighthouse baseline for `/`, `/work`, `/projects/<slug>` and `/contact` before changing anything
- [ ] Create `components/ui/use-reduced-motion.ts` exporting a `useReducedMotion()` hook
- [ ] Skip Lenis entirely under reduced motion in `components/ui/smooth-scroll.tsx` (do not merely shorten the duration)
- [ ] Render revealed and skip the GSAP tween in `components/ui/scroll-reveal.tsx` under reduced motion
- [ ] Apply the hook to `components/ui/scroll-progress.tsx` and `app/template.tsx`
- [ ] Render a static poster frame instead of the Spline scene (`components/ui/splite.tsx`, `spline-scene-basic.tsx`) under reduced motion
- [ ] Render a static frame instead of the Cobe globe (`components/ui/cobe-globe-pulse.tsx`) under reduced motion
- [ ] Add a global `@media (prefers-reduced-motion: reduce)` block to `app/globals.css` as the CSS backstop
- [ ] Choose one of `framer-motion` / `motion`, convert the `motion/react` import at `components/ui/feature-carousel.tsx:4`, and remove the other from `package.json`
- [ ] Consolidate on `lucide-react`; remove `react-icons` and `@hugeicons/*` if their remaining usages are small
- [ ] Add `images.remotePatterns` for the Supabase origin to `next.config.ts` (there is no `images` block today — this blocks the migration)
- [ ] Migrate `components/ui/project-card.tsx` to `next/image` first (LCP candidate)
- [ ] Migrate the 6 `<img>` in `app/projects/[slug]/project-detail.tsx`
- [ ] Migrate the 4 `<img>` in each of the three legacy project pages
- [ ] Migrate the remaining `<img>` in `app/work/view.tsx`, `app/team/view.tsx`, `app/team/[slug]/member-detail.tsx`, `app/projects/view.tsx`, `app/about/view.tsx`
- [ ] Keyboard + screen-reader pass over `components/ui/navbar.tsx`, `components/ui/custom-select.tsx` and the contact form
- [ ] VERIFY the whole site at 1440 px and 390 px with the OS reduced-motion setting ON
- [ ] VERIFY Lighthouse against the baseline

## Phase 7 — Insights

- [ ] Agree an author and a publishing cadence before writing any code (R16)
- [ ] Create a `Post` model: slug, title, excerpt, cover, body, authorId → team member, tags, publishedAt, isActive
- [ ] Add public list/detail endpoints and RBAC-guarded admin CRUD
- [ ] Seed a `/website/insights` menu row under `#website`
- [ ] Create `portfolio-admin/src/modules/deep/website/InsightsPage.js` + `shared/sdk/insights.ts` + the `App.js` route
- [ ] Create `app/insights/page.tsx` + `view.tsx` and `app/insights/[slug]/page.tsx` + `view.tsx`, server-rendered with `revalidate = 3600`
- [ ] Route both through `buildPageMetadata` with the Phase 2 SeoMeta override layer
- [ ] Add `BlogPosting` JSON-LD with a real author reference into the Organization graph
- [ ] Add `/insights` to `MARKETING_ROUTES` and post slugs to `app/sitemap.ts`
- [ ] Add an RSS feed at `app/insights/rss.xml/route.ts`
- [ ] Publish three posts before announcing the section
```

---

## Notes for you specifically

Three things I'd act on before anything else, in this order:

1. **The RBAC seed gap (Phase 0).** You believe the menu row was added; it is not in `seed-rbac.ts`. One hour, and it is the difference between the SEO backend working and being super-admin-only.
2. **`contact/view.tsx:261`.** The default tab of your only conversion page links to `https://cal.com` — the vendor's homepage. Whatever else happens, that link should not be live tomorrow.
3. **G1.** Contact submissions land in Mongo and notify nobody, while the page promises a reply in 12 hours, twice.

And the one correction to your brief: `ProfessionalService` is a schema.org subtype of `LocalBusiness`, so emitting it does not actually dodge the exposure you identified. D5 gives you an honest alternative that says the same thing about what Nventra sells without making a premises claim.
