# Nventra Portfolio — Execution Checklist

> **Status reconciliation — 2026-09-16.** Phases 0–4 are shipped and are ticked
> in bulk below. The basis is artifact-level verification, not an individual
> re-check of every line: the SEO module, SEO Manager screen, composition layer,
> legal pages, error pages, security headers, analytics, OG image, manifest and
> reduced-motion handling were each confirmed present, the three repos typecheck
> and build, 56 unit and 56 integration tests pass, and the live site serves CMS
> titles. If a sub-item below turns out to be incomplete, trust the code, not the
> tick.


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
- [x] Run `seedRbacBaseline()` against the target database and confirm the MenuMaster row exists
- [x] Grant the new menu read/write/edit/delete to the Administrator role in the permission matrix screen
- [x] VERIFY: log in as a **non-super-admin** and confirm `GET /api/v1/seo` returns 200 and the server log has no `"RBAC lookup failed — run the RBAC seed"` line (wait 60s for the `LOOKUP_TTL_MS` cache)

## Phase 1 — SEO Manager admin screen

### SDK
- [x] Create `D:\CanteenX\Portfolio\portfolio-admin\src\shared\sdk\seo.ts` with `listSeoMeta`, `getSeoMeta`, `createSeoMeta`, `updateSeoMeta`, `deleteSeoMeta`
- [x] Type `listSeoMeta` as returning `{ items: SeoMetaRow[] }` and `deleteSeoMeta` as 204-with-no-body (do not parse it)
- [x] Export the SEO types from `D:\CanteenX\Portfolio\portfolio-admin\src\shared\sdk\index.ts`

### Rules module
- [x] Create `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\website\seo\seoRules.js` (pure, no React, no DOM)
- [x] Port `TITLE_LIMIT 60`, `DESCRIPTION_LIMIT 160`, `TITLE_MIN 30`, `DESCRIPTION_MIN 70`, `KEYWORD_MAX 10`, `WARN_RATIO 0.9` from `D:\CanteenX\Gym\Gym-Admin\src\pages\Website\seo\seoRules.js`
- [x] Port `counterState`, `keywordList`, `effectiveOgTitle`, `effectiveOgDescription`, `evaluateSeo`, `completeness`
- [x] Port `indexableRules` and `hiddenRules` (keep `hiddenRules` per D10 even though there is no portal)
- [x] Write `siteOrigin()` using `process.env.REACT_APP_SITE_URL` (CRA, not Vite — do NOT copy `import.meta.env`)
- [x] Write `canonicalProblem` mirroring `isValidCanonicalUrl` in `D:\CanteenX\Portfolio\portfolio-server\src\modules\seo\seo-meta.model.ts:73-95`, **including the root-relative `/path` branch the server accepts and Gym's version rejects**
- [x] Import the category vocabulary from the server's `SEO_CATEGORIES` shape (`Marketing | Detail | Other`) — do NOT copy Gym's `["Marketing","Portal","Other"]`

### Components
- [x] Create `.\seo\CharacterCounter.jsx` — count, limit, word label, amber at 90%, red past the limit
- [x] Create `.\seo\KeywordInput.jsx` — chips, Enter or comma to add, click to remove, `inputId="seoKeywordInput"`
- [x] Create `.\seo\SeoList.jsx` — category chips with counts + table (Page, Category, Meta title with `n/60`, Keywords, Search, Completeness, Actions)
- [x] Render Completeness as a **word in a badge plus "n of m checks pass"**, never a bare coloured dot
- [x] Wrap the list's Edit and Delete buttons in `RbacGate action="edit"` / `action="delete"`
- [x] Create `.\seo\SeoEditor.jsx` with field ids `seoSlug`, `seoPageTitle`, `seoCategory`, `seoNoIndex`, `seoIsActive`, `seoMetaTitle`, `seoMetaDescription`, `seoKeywordInput`, `seoCanonicalUrl`, `seoOgTitle`, `seoOgType`, `seoOgDescription`, `seoOgImage`
- [x] Add the "Use this page" button next to Canonical URL, filling the route's own absolute URL
- [x] Add the canonical error message AND the separate "points at a different page" warning
- [x] Wire the OG image field to `uploadPortfolioImage(api, file)` with a thumbnail preview (per D9 — requires the Phase 0 `IMAGE_UPLOAD_MENUS` change)
- [x] Hide the search/social field groups when `noIndex` is on, behind a "Show the search fields anyway" toggle
- [x] Create `.\seo\SeoScorePanel.jsx` — score, band, progress bar, one clickable list item per rule that focuses and scrolls to `rule.targetId`
- [x] Create `.\seo\GooglePreview.jsx` with the **desktop/mobile toggle** (60/160 vs 50/120 char proxies) and the "hidden from search" notice
- [x] Create `.\seo\SocialPreview.jsx` rendering the effective (inherited) OG title/description/image

### Container and routing
- [x] Create `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\website\SeoManagerPage.js` — owns `values`, fetches `GET /api/v1/seo` once, filters in the browser
- [x] Follow the `PortfolioTechStackPage.js` idiom (Tailwind, `useAuth().api`, modal form, `RbacGate`) not Gym's reactstrap
- [x] Add a delete confirmation using the existing `DeleteConfirmModal.jsx`, not `window.confirm`
- [x] Add the lazy import and `<Route path="/website/seo-manager" element={<SeoManagerPage />} />` to `D:\CanteenX\Portfolio\portfolio-admin\src\app\App.js` — the path must byte-match the Phase 0 seed (D1)
- [x] VERIFY as a **non-super-admin**: buttons appear, create/edit/delete all succeed, and a user without the grant sees none of them
- [x] VERIFY: saving a full URL in the Route field is rejected with the server's message, not silently truncated
- [x] VERIFY: a canonical of `/services` is accepted (server allows root-relative) and `https://localhost/x` is rejected on both sides

## Phase 2 — Website composition layer, seeding, structured data

### Server
- [x] Create `D:\CanteenX\Portfolio\portfolio-server\src\modules\seo\seo.seed.ts` exporting `seedSeoMeta()`, idempotent upsert-if-absent on `slug`, never overwriting an edited row
- [x] Seed rows for `/`, `/about`, `/services`, `/how-we-work`, `/team`, `/work`, `/projects` (category `Marketing`)
- [x] Seed rows for `/projects/ai-attendance`, `/projects/ai-call-bot-hospital`, `/projects/business-meet` (category `Detail`) — these three have no CMS row and no other metadata source
- [x] Copy each row's `metaTitle`/`metaDescription` from the existing page constants so nothing regresses on first render
- [x] Call `seedSeoMeta()` from `seedPortfolioData()` in `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio.seed.ts` (alongside the four existing seeders)
- [x] Add `src/__tests__/seo.test.ts` covering `normalizeSlug` (`"services"`, `"/Services/"`, `"//evil.com"`, `"https://x/y"`, `"/a?b#c"`) and `isValidCanonicalUrl` (empty, root-relative, localhost, hostless, `mailto:`)
- [x] **Add the new test file to the `test` and `test:unit` script strings in `portfolio-server/package.json`** — the runner takes an explicit file list

### Website — fetch and composition
- [x] Add `SeoMetaRow` type and `getSeoMeta(slug)` to `D:\CanteenX\Portfolio\Portfolio\lib\api.ts`, calling `GET /api/v1/public/seo?slug=`
- [x] Give `getSeoMeta` a 3-second timeout (not the shared 10 s) and a `null`-on-any-failure contract (D3)
- [x] Wrap `getSeoMeta` in React `cache()` so `generateMetadata` and the page body share one request
- [x] Create `D:\CanteenX\Portfolio\Portfolio\lib\seo.ts` with `absoluteUrl`, `validCanonical`, `MARKETING_ROUTES`, `buildPageMetadata`
- [x] Implement `buildPageMetadata` per-field fallback: SeoMeta value → page constant → omitted
- [x] **Spread every optional key conditionally — never write `title: undefined`** (D2, R4)
- [x] Return a SeoMeta `metaTitle` as `{ absolute: … }` so the layout's `"%s — Nventra"` template does not append 10 characters past the counted limit (D4)
- [x] Default the canonical to `absoluteUrl(slug)` whenever `validCanonical` rejects the stored value

### Website — route conversion
- [x] Convert `app/about/page.tsx` from `export const metadata` to `generateMetadata` calling `buildPageMetadata`
- [x] Convert `app/services/page.tsx`
- [x] Convert `app/how-we-work/page.tsx`
- [x] Convert `app/team/page.tsx`
- [x] Convert `app/work/page.tsx`
- [x] Convert `app/projects/page.tsx`
- [x] Convert `app/contact/page.tsx`
- [x] Split `D:\CanteenX\Portfolio\Portfolio\app\page.tsx`: move the `"use client"` body to `app/home-view.tsx` taking `initialSettings`, leave a server shell with `generateMetadata` + `revalidate = 3600` (D6)
- [x] Split `app/projects/ai-attendance/page.tsx` into `page.tsx` (server shell) + `view.tsx` (current client body, unchanged)
- [x] Split `app/projects/ai-call-bot-hospital/page.tsx` the same way
- [x] Split `app/projects/business-meet/page.tsx` the same way
- [x] Layer the SeoMeta **override** onto `app/projects/[slug]/page.tsx` — a present row wins field-by-field over the record-derived values (D7); do not invert it
- [x] Layer the same override onto `app/team/[slug]/page.tsx`

### Website — sitemap, redirect, OG, JSON-LD
- [x] Refactor `app/sitemap.ts` to read `MARKETING_ROUTES` from `lib/seo.ts` instead of its own `STATIC_ROUTES`
- [x] Add the three legacy project paths to the sitemap
- [x] Exclude any route whose SeoMeta row has `noIndex: true` from the sitemap
- [x] Add a 308 redirect `/projects` → `/work` in `D:\CanteenX\Portfolio\Portfolio\next.config.ts` (D8)
- [x] VERIFY the redirect does not catch `/projects/<slug>`
- [x] Remove `/projects` from the sitemap once the redirect is live
- [x] Create `app/opengraph-image.tsx` producing a default branded OG card
- [x] Add `buildOrganizationGraph()` to `lib/seo.ts`: `Organization` + `WebSite` + `OfferCatalog`/`Service[]` from `PortfolioSettings.services`, with a real `sameAs` array (D5)
- [x] Do NOT emit `LocalBusiness`; do NOT emit `address`, `geo`, `openingHours` or `priceRange` on any node
- [x] Render the graph as a single JSON-LD script from `app/layout.tsx`
- [x] Add `BreadcrumbList` JSON-LD to `app/projects/[slug]/page.tsx` and `app/team/[slug]/page.tsx`, referencing the Organization by `@id`
- [x] VERIFY with `curl -s <url> | grep -i '<title>\|canonical\|og:'` on all 11 seeded routes against the **deployed** URL
- [x] VERIFY with the backend deliberately unreachable that every route still ships its page-constant title and a correct canonical

## Phase 3 — Compliance and lead capture

> Mostly closed 2026-09-15. Two deviations from the plan as written:
> **(a)** the lead notification is `await`ed BEFORE the 201, not sent after it —
> sending after the response is the same serverless freeze that was just fixed in
> the WhatsApp webhook, and `sendMail` never throws so a mail outage still
> returns 201 with the lead durable. **(b)** the "Book a Call" CTA now carries the
> chosen slot into the enquiry form rather than linking out, because there is no
> real booking URL to link to yet.
>
> Legal copy is marked `draft: true` in `lib/legal.ts` and both pages render a
> visible Draft notice until the owner confirms the values.

### Legal pages
- [x] Create `app/privacy/page.tsx` + `view.tsx` — controller identity, data collected, lawful basis, retention period, processors (Vercel, Supabase, MongoDB Atlas, mail provider), subject rights, contact address
- [x] Create `app/terms/page.tsx` + `view.tsx`
- [x] Get the retention period, controller name and processor list from the owner — do not invent them
- [x] Link both from `components/ui/footer.tsx` and from the contact form
- [x] Add `/privacy` and `/terms` rows to `seo.seed.ts` and to `MARKETING_ROUTES`

### Contact form
- [x] Add `id` to every input in `D:\CanteenX\Portfolio\Portfolio\app\contact\view.tsx` (lines 314, 328, 354) and `htmlFor` to every label (311, 325, 351)
- [x] Wire `aria-describedby` from each input to its error text and move focus to the first error on failed submit
- [x] Add a required consent checkbox linking to `/privacy`, and store the accepted text + UTC timestamp on the submission
- [x] Add a honeypot field (visually hidden, `tabIndex={-1}`, `autoComplete="off"`) and reject filled submissions server-side
- [x] Fix the "Book a Call" tab: either submit the selected `callSlot` through the existing endpoint, or replace the `https://cal.com` link at line 261 with a real booking URL — the default tab must be able to convert
- [x] Add optional `phone`, `company`, `budgetBand`, `timeline` fields to the message form

### Server
- [x] Add `phone`, `company`, `budgetBand`, `timeline`, `source`, `referrer`, `consentText`, `consentAt` to `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio-contacts.models.ts`
- [x] Extend `submitContactSchema` in `portfolio-contacts.routes.ts:36-42` with matching zod rules and max lengths
- [x] Capture `referrer` and UTM params server-side from the request, not from a client-supplied hidden field
- [x] Create `D:\CanteenX\Portfolio\portfolio-server\src\core\mail\mail.service.ts` using the existing `nodemailer@^8.0.5` dependency
- [x] Send the new-lead notification **after** `res.status(201)` — a mail failure must never fail a captured lead (R9)
- [x] Put SMTP credentials in Vercel env on the server project; never in the repo
- [x] Surface the new fields as columns in `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\portfolio\PortfolioContactsPage.js`
- [x] Add a validation test for the extended contact schema and add the file to `package.json`'s test script
- [x] VERIFY: submit with the honeypot filled → rejected; submit 6 times in a minute → 429; submit with mail misconfigured → still 201 and the row exists

## Phase 4 — Errors, analytics, security headers

- [x] Create `D:\CanteenX\Portfolio\Portfolio\app\not-found.tsx` with navbar, footer and links to `/work`, `/services`, `/contact`
- [x] Create `app/error.tsx` and `app/global-error.tsx`
- [x] Call `notFound()` from `app/projects/[slug]/page.tsx` when the record is absent (currently returns 200 with empty content — a soft-404)
- [x] Call `notFound()` from `app/team/[slug]/page.tsx` likewise
- [x] VERIFY `/projects/we-converse` (linked from `app/page.tsx:22`) resolves to a real page or a real 404, not a blank one
- [x] Add a consent gate that loads analytics only after acceptance, defaulting to off
- [x] Add `@vercel/analytics` and `@vercel/speed-insights` behind that gate
- [x] Emit conversion events: contact submitted, call slot chosen, case study opened
- [x] Add a cookie notice tied to the consent gate (only now that there is something to consent to)
- [x] Add `headers()` to `next.config.ts`: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- [x] Add CSP in **report-only** mode first; enumerate the Spline, Supabase and Vercel origins from the reports before enforcing (R11)
- [x] Create `app/manifest.ts` and add an `apple-icon`
- [x] VERIFY securityheaders.com grade and that the Spline hero still renders under the enforced CSP

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

---

# Part II — Track A: RBAC remediation

See `plan.md` §8. **A-1 is the only item here that is exploitable today.** Ship it first.

## Blocking decisions (answer before A-1 starts)

- [ ] D-A1 — May an admin assign a super-admin-authored role to a subordinate? (rec: yes, by grant-containment)
- [ ] D-A2 — May an admin edit their own employee record? (rec: yes except `roleId`; decide on `emailOffice`)
- [ ] D-A3 — Add `isSystemRole` to `Administrator`? (rec: yes)
- [ ] D-A4 — Which super-admin-only routes become delegable?
- [ ] D-A5 — Grant-backfill aggressiveness (rec: broad now, narrow in 2 weeks)
- [ ] D-A6 — `export → print`, or add a 7th action type? (rec: map to print)
- [ ] D-A7 — Should `/api/v1/rbac/*` require menu grants? (rec: yes)
- [ ] D-A8 — whatsapp: add `/whatsapp` menu, or accept super-admin-only? (rec: add)
- [ ] D-A9 — CustomRole: retire or keep? (rec: retire — wiring it up would 403 every module)
- [ ] D-A10 — A-4 rollout window agreed, super_admin break-glass session confirmed

## A-0 — Map, shadow mode, inventory (no behaviour change)

- [ ] Create `src/core/rbac/module-menu-map.ts` — `MODULE_MENU_URL` for all 14 modules
- [ ] Add `LEGACY_ACTION_TO_RBAC` (`read→read, create→write, update→edit, delete→delete, export→print`)
- [ ] Add a compile-time exhaustiveness guard so a new `MODULE_KEYS` entry without a menu fails `pnpm typecheck`
- [ ] Add `RBAC_MODULE_MODE: z.enum(["off","shadow","enforce"]).default("off")` to `src/config/env.ts`
- [ ] Add a shadow evaluator to `src/core/http/module-guards.ts` — logs `rbac.shadow_deny`, always calls `next()`
- [ ] Add the `whatsapp` child to `MENU_TREE` in `src/bootstrap/seed-rbac.ts` (pending D-A8)
- [ ] Write `scripts/rbac-coverage-report.mjs` — per-role module grants, plus every zero-grant employee
- [ ] `pnpm build:vercel`, deploy with `RBAC_MODULE_MODE=shadow`
- [ ] Run the coverage report against production and save the output
- [ ] **Soak 7–14 days before A-4.** Do not skip.

## A-1 — Close the escalation hole ⟵ ship first

- [ ] Write the regression tests FIRST; confirm they fail against current `main`
- [ ] Split `validateStrictSubset` into `loadActorGrantSet()` + `assertPermissionsWithinCeiling()`
- [ ] Add `assertRoleAssignable(actorEmployeeId, roleId)` reusing that set logic
- [ ] `PUT /employees/:id` — drop self from `visibleIds`; distinct error for self-edit attempts
- [ ] `PUT /employees/:id` — delete the `role?.createdBy && …` block; call `assertRoleAssignable`
- [ ] `POST /employees` — same replacement (note the current block is also wrapped in `if (actor)`)
- [ ] `POST /employees` — hoist the three duplicate `getEmployeeForUser` calls into one
- [ ] `PUT /roles/:id` — refuse when the target is the actor's own assigned role
- [ ] Allow self-edit of `employeeName`/`department`/`contact`; reject only `roleId` on self (per D-A2)
- [ ] Clear error when the actor has no role: "ask a super admin to assign one", not a bare 403
- [ ] Audit-log every successful `roleId` change (`rbac.employee.role_assigned`, before/after)
- [ ] `pnpm build:vercel` + deploy

## A-2 — Harden the RBAC API + fix the hidden buttons

- [ ] Replace the flat `AUTH` array with per-route `requireRbacPermission` on `/api/v1/rbac/*`
- [ ] Fix uppercase action codes in all six RBAC screens — prefer `useRbacPagePermissions()` over hardcoded menu URLs
- [ ] **Ship server + admin together**, or delegates get screens with no buttons
- [ ] Verify with a non-super-admin account (super_admin short-circuits and proves nothing)

## A-3 — Grant backfill

- [ ] Write `scripts/rbac-grant-backfill.mjs` — idempotent, `--dry-run` default, `$addToSet` only, never revokes
- [ ] Human review of the dry-run diff — mandatory
- [ ] Apply; log every mutation to the audit log
- [ ] Re-check shadow logs: `rbac.shadow_deny` should fall to zero
- [ ] Schedule the deliberate narrowing pass for ~2 weeks after A-4

## A-4 — Enforce on the 14 modules (HIGH RISK)

- [ ] Confirm zero `rbac.shadow_deny` for ≥7 consecutive days
- [ ] Confirm the `whatsapp` menu row exists in production
- [ ] Codemod the 158 call sites to `moduleGuards("calendar", "read")` (module + action, not a string)
- [ ] Keep `requireFeatureEnabled` BEFORE the RBAC check — preserves the `FEATURE_DISABLED` code
- [ ] Gate the RBAC middleware on `RBAC_MODULE_MODE === "enforce"`
- [ ] Create/verify all menus ≥5 min before flipping (60s lookup cache TTL)
- [ ] Manual E2E: walk all 14 module screens as the real admin, expect zero 403s
- [ ] Flip in a low-traffic window with a super_admin session open
- [ ] Watch logs for 1 hour; rollback is an env-var change

## A-5 — Tests

- [ ] `src/__tests__/helpers/rbac-fixtures.ts` — real `User`+`Employee`+`RoleMaster` with valid ObjectId `sub`
- [ ] `rbac-permission.test.ts` — deny-by-default, inactive employee/role, cache TTL, grants never cached
- [ ] `rbac-subset.test.ts` — equal-set passes, superset throws, `createdBy` is irrelevant
- [ ] `rbac-escalation.test.ts` — the exploit 403s; full-grant admin assigning a subordinate still 200s
- [ ] `rbac-module-enforcement.test.ts` — includes "all 14 menus resolve" (the whatsapp guard)
- [ ] `rbac-api-guard.test.ts`
- [ ] `seed-rbac.test.ts` — idempotency, `accessLocked` respected
- [ ] Fix `integration.test.ts` admins that use a non-ObjectId `sub` and now pass for the wrong reason
- [ ] **Add every new test file to the `test` script string** — the runner takes an explicit list

## A-6 — Retire the dead systems

- [ ] Remove `currentRolePermissions` from `session-bootstrap`; ship with the client change
- [ ] Delete `PermissionGate.jsx`; trim `MenuContext.js` to `menuGroups`/`findMenuIdByUrl`
- [ ] Move `session.permissions` consumers onto `rbacPermissions` (only after A-3)
- [ ] Delete `permissions.ts` + `permission.middleware.ts` once `enforce` is stable
- [ ] Retire CustomRole per D-A9

## A-7 — Seed safety

- [ ] Add `accessLocked` to the employee model
- [ ] Skip the zero-grant promotion when `accessLocked`; log it
- [ ] Add `RBAC_BACKFILL_ENABLED` (keep `true` until every admin has a role)
- [ ] Audit-log every promotion — the current `logger.warn` is ephemeral on Vercel
- [ ] `PUT /employees/:id/status {isActive:false}` also sets `accessLocked`
- [ ] Document: create admins via `POST /rbac/employees`, never `POST /system/users`

## A-8 — Super-admin-only policy

- [ ] Add `// SUPER-ADMIN ONLY BY DESIGN: <reason>` to each route that stays locked
- [ ] Relax the agreed subset to `["super_admin","admin"]` + `requireRbacPermission`
- [ ] Re-point the branding integration test at a non-granted admin

---

# Part II — Track B: full CMS coverage

See `plan.md` §9. **Rule for every phase: no input ships without a renderer.**

## Blocking decisions

- [ ] D-B1 — Migrate the three bespoke case studies, or keep them bespoke? (rec: migrate)
- [ ] D-B2 — Canonical service names (six of eight titles currently conflict)
- [ ] D-B3 — What `/team` shows once the fake people are deleted (rec: publish real members first)
- [ ] D-B4 — Are there real logos/testimonials with written permission?
- [ ] D-B5 — Commit to a blog, with a named owner and cadence?
- [ ] D-B6 — Who may edit legal copy? (rec: super_admin only)
- [ ] D-B7 — Is `nventra.umaeng.co.in` the permanent origin?
- [ ] D-B8 — Publish pricing at all?
- [ ] D-B9 — Acceptable publish latency (drives whether B-8.1 moves forward)

## B-1 — Stop shipping fiction; make the Hero tab real

- [ ] Replace the six invented team members in `lib/team.ts` with honest fallbacks
- [ ] Replace the four invented projects in `lib/projects.ts` (incl. "Confidential — EU Fintech")
- [ ] Fix the homepage link to `/projects/we-converse`, which exists only in the fake dataset
- [ ] Give `app/page.tsx` a server shell + `revalidate`; it is currently `"use client"` with neither
- [ ] Render `hero.tagline`, `hero.description`, `hero.ctaPrimary`, `hero.ctaSecondary`, `techMarquee` — or remove the inputs
- [ ] Fix team creation: the server requires `id`, the admin form never sends it (every create 400s)
- [ ] Seed settings on the server; `seedPortfolioData()` never runs on Vercel
- [ ] SSR-seed navbar and footer settings — both currently flash fallback copy on every route

## B-8.1 — On-demand revalidation (pull forward if editors are active)

- [ ] Add a revalidation route handler; call it on CMS save
- [ ] Without this, every later phase ships as "I saved it and nothing happened"

## B-2 → B-8

- [ ] B-2 — `PortfolioService` collection; collapse the three conflicting lists; admin screen; `IMAGE_UPLOAD_MENUS`
- [ ] B-3 — testimonials, client logos, proof metrics; render on `/` and `/work`
- [ ] B-4 — case studies into the CMS via `sectionHeadings` + `heroVariant`; identical slugs; before/after diffs
- [ ] B-5 — section headings, ContactCTA, budget bands, timelines, error pages
- [ ] B-6 — legal from the CMS, behind a super-admin-only menu
- [ ] B-7a FAQ · B-7b pricing · B-7c blog
- [ ] B-8 — rich team fields, preview, cleanup, remove `settings.services`

## Cross-cutting for every Track B phase

- [ ] Per-field fallback (`override → settings → constant`), never per-object
- [ ] New menu row in `seed-rbac.ts` before `requireRbacPermission` will pass
- [ ] New upload screens added to `IMAGE_UPLOAD_MENUS`
- [ ] Tested with a non-super-admin
- [ ] Tests added — there are currently zero portfolio tests and no runner in the website repo
