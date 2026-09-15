# Nventra Portfolio — Feature Plan

> Companion checklist: [todo.md](./todo.md)
> Written 2026-09-15. Every path below was verified against the working tree on that date.

---

## 1. Scope

Two workstreams, one document.

**A. Finish the SEO Manager.** The model (`seo-meta.model.ts`) and routes (`seo-meta.routes.ts`) exist, typecheck and are mounted (`app.ts:45,134`). Missing: the RBAC seed row, the admin screen, the website composition layer, the per-route seed, and structured data.

**B. Close the gaps that stop this reading as a credible agency site.** Ranked in §4 by commercial impact, phased in §5.

Explicitly **out of scope**:

- **Rebuilding the CMS.** Projects, team, tech stacks, masters, settings and contacts are done and working.
- **Re-doing today's SEO work.** `sitemap.ts`, `robots.ts`, `metadataBase`, the server shells and hourly ISR stay. Phase 2 *replaces the seven hardcoded metadata blocks* with a composition layer; it does not undo the shells.
- **A marketing-automation stack.** No HubSpot, no Marketo. The Mongo `PortfolioContact` collection plus an email notification is the right size for this business.
- **Client-side A/B testing.** Not enough traffic for a significant result; it would cost render-blocking script for noise.

---

## 2. Architecture decisions — all resolved

### D1 — RESOLVED: the menu URL stays `/website/seo-manager`, and the admin React route must be the *same string*

`useRbacPagePermissions` in `D:\CanteenX\Portfolio\portfolio-admin\src\components\common\RequirePermission.jsx:41-47` resolves a screen's permissions by **longest-prefix match on `location.pathname`**:

```js
const path = location.pathname.split("?")[0].replace(/\/+$/, "") || "/";
const menuUrl = permissions[path] !== undefined ? path : Object.keys(permissions)
  .filter((url) => path === url || path.startsWith(`${url}/`))
  .sort((a, b) => b.length - a.length)[0];
```

So the React route path and the seeded `menuUrl` are **one contract, not two names for the same thing**. If the screen lived at `/portfolio/seo-manager` while the seed said `/website/seo-manager`, `RbacGate` would find no prefix, hide every button for non-super-admins, and the server would happily have allowed the request. That failure is silent and looks like a permissions bug.

Two options were live:

| | Menu URL | Sidebar group | Cost |
|---|---|---|---|
| A | `/portfolio/seo-manager` | reuse existing `#portfolio` "Portfolio CMS" | no new group; but "Portfolio CMS" then means both content records and site-wide config |
| **B (CHOSEN)** | `/website/seo-manager` | **new `#website` root** | one new group row; matches the server constant already written |

**B, because §4 is going to fill that group.** Legal pages, testimonials, client logos and insights are all new admin screens that are *website chrome*, not portfolio records. Renaming the server constant now to avoid creating one group row, then creating the group three weeks later anyway, is churn.

Consequence: `seed-rbac.ts` gains a `#website` root at `sequence: 20` (between `#portfolio` at 10 and `#modules` at 40), and `App.js` registers `<Route path="/website/seo-manager" …>`.

### D2 — RESOLVED: one composition layer, `lib/seo.ts`, replacing seven hardcoded metadata blocks

Today seven routes each hardcode their own `export const metadata` — `about`, `services`, `how-we-work`, `team`, `work`, `projects`, `contact` — with an identical 12-line shape, and `/` has none at all (see D6). Adding the SeoMeta lookup to each of them would mean seven copies of the precedence rules, the canonical validator and the `undefined` trap.

**Decision: `D:\CanteenX\Portfolio\Portfolio\lib\seo.ts` exports `buildPageMetadata({ slug, defaultTitle, defaultDescription })`, and each route's `metadata` export becomes a `generateMetadata` calling it.** Precedence, most specific first:

1. the `SeoMeta` row for that exact slug,
2. the constants shipped in the page file,
3. nothing.

Each field falls back **independently**. A row saved with a description and no title must not blank the title the page shipped with — a half-filled row is an unfinished admin task, not an instruction to publish nothing.

**Port Gym's `undefined` trap comment verbatim** (`D:\CanteenX\Gym\Gym-frontend\src\lib\seo.ts:35-43`). Writing `title: undefined` into a returned `Metadata` still counts as the segment *declaring* the field, which blanks the root layout default instead of inheriting it. Every optional key is spread in conditionally.

### D3 — RESOLVED: `getSeoMeta` goes in `lib/api.ts`, wrapped in React `cache()`, with a shorter timeout than everything else

No second HTTP client. `lib/api.ts:44` already owns the axios instance, the server-vs-browser base URL split (`resolveApiBaseUrl()`, lines 25-34 — the `API_PROXY_ORIGIN` reasoning there is correct and load-bearing) and the never-throw convention every other reader follows.

Two deviations from the existing readers, both deliberate:

- **3-second timeout, not the shared 10 s.** This call blocks `<head>`, and therefore TTFB. A slow SEO row must degrade to the page's own constants, not hold the document.
- **Wrapped in `React.cache()`.** Next's fetch cache does not apply to axios, so `generateMetadata` and the page body would otherwise issue two identical requests per render. One line prevents it.

Returns `null` on any failure, matching `seo-meta.routes.ts:110-122` which already answers `{ item: null }` rather than 404 for an absent row.

### D4 — RESOLVED: a SeoMeta `metaTitle` is absolute; everything else goes through the layout template

`D:\CanteenX\Portfolio\Portfolio\app\layout.tsx:20` sets `template: "%s — Nventra"`. The admin editor counts `metaTitle` against 60 characters and previews it as the *entire* Google result. If the composition layer returned it as a plain string, Next would append ` — Nventra` and ship a title 10 characters longer than the one the editor was warned about — silently past the truncation point the counter turned red for.

So: `title: { absolute: seoTitle }` when the row supplies one; the page constant stays a plain string and keeps the template.

### D5 — RESOLVED: structured data is `Organization` + `WebSite`, and `ProfessionalService` needs a caveat you should read

You asked for `Organization` + `WebSite` + `ProfessionalService`, explicitly not `LocalBusiness`, because Nventra has no public premises. The instinct is right. The mechanism needs one correction:

**`ProfessionalService` is a subtype of `LocalBusiness` in the schema.org hierarchy.** (`Thing → Organization → LocalBusiness → ProfessionalService`.) Emitting it is emitting a `LocalBusiness` with a different label. Google's local rich result for that type wants `address`, and an entry with no `address`, no `geo` and no `openingHoursSpecification` either produces no rich result at all (harmless but pointless) or, if someone later "completes" it with a residential or coworking address to make the warnings go away, becomes exactly the misrepresentation you were avoiding.

**Decision: ship `Organization` + `WebSite` as the sitewide `@graph`, and express the service offering as `Organization.hasOfferCatalog` → `OfferCatalog` → `Service[]`, driven by `PortfolioSettings.services` (already CMS-managed, `api.ts:97`) with `areaServed: "Worldwide"` and `provider: { "@id": "…#organization" }`.** That describes what you sell, is true, requires no address, and cannot attract a local-spam penalty because it makes no local claim.

If you still want the `ProfessionalService` node, the rule is: emit it with `@id`, `name`, `url`, `description`, `areaServed`, `serviceType`, `sameAs` and **nothing else** — no `address`, no `geo`, no `openingHours`, and above all no `priceRange`, which is the field that most often gets invented. Do not expect a rich result from it. I would not bother; the `OfferCatalog` carries the same information without the type confusion.

Placement: the `@graph` renders once from `app/layout.tsx` so it is on every page. Per-page nodes (`BreadcrumbList` on `/projects/[slug]` and `/team/[slug]`) are added by the page, referencing the Organization by `@id`. `sameAs` is the actually-valuable field here — it is how Google connects `umaeng.co.in` to your GitHub and LinkedIn — and it needs a real array, not a placeholder.

### D6 — RESOLVED: `/` gets a server shell like every other route

`D:\CanteenX\Portfolio\Portfolio\app\page.tsx:1` is `"use client"`. It is the only marketing route without a server shell, and the consequence is two-fold and both parts are bad:

1. A client component **cannot export metadata**, so `/` has no page-specific canonical, no OG image and no editable title — the SEO manager would have no way to reach the home page.
2. It renders `FALLBACK_PROJECTS` (lines 18-47) into the initial HTML and only swaps to CMS data after hydration. **The crawler's permanent copy of the home page is the hardcoded fallback**, including two Unsplash stock photographs (lines 23, 37).

Split it the way the other six are split: `app/page.tsx` becomes a server shell exporting `generateMetadata` + `revalidate = 3600` and fetching settings, `app/home-view.tsx` holds the current `"use client"` body and takes `initialSettings`. This is mechanical — `app/services/page.tsx` + `app/services/view.tsx` is the template.

### D7 — RESOLVED: seed a row per *static* route only; dynamic routes stay record-derived

The model's own header (`seo-meta.model.ts:11-17`) already states the rule and it is correct: `/projects/[slug]` and `/team/[slug]` derive metadata from the record being rendered, which beats anything an editor retypes, and a row there is an **override** for an individually important case study — not a mandatory chore attached to every project.

Seed eleven rows, all `isActive: true`, `noIndex: false`:

| slug | category | note |
|---|---|---|
| `/` | Marketing | needs D6 first to have any effect |
| `/about`, `/services`, `/how-we-work`, `/team`, `/contact` | Marketing | seed from the existing page constants so nothing regresses |
| `/work` | Marketing | the canonical project index — see D8 |
| `/projects` | Marketing | see D8 |
| `/projects/ai-attendance`, `/projects/ai-call-bot-hospital`, `/projects/business-meet` | Detail | **these three have no CMS row and no `generateMetadata`**, so a SeoMeta row is their only source of a title |

Lives in a new `seedSeoMeta()` called from `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio.seed.ts:8-13`, alongside the four existing seeders. Idempotent, upsert-if-absent on `slug`, never overwriting an edited row — same contract as `seed-rbac.ts:24`.

Do **not** seed 40 rows for CMS projects. The category chips and completeness column are designed for a list of a dozen; 40 mandatory-looking incomplete rows is how a screen gets abandoned.

### D8 — RESOLVED: `/projects` 308-redirects to `/work`; the canonical field is not the tool for this

`D:\CanteenX\Portfolio\Portfolio\app\work\page.tsx:30` and `D:\CanteenX\Portfolio\Portfolio\app\projects\page.tsx:29` both call `getPublicProjects()`. They are two index pages over the same collection, competing for the same queries and splitting inbound links. `/work` additionally fetches categories and is the filterable one; `/projects` is the lesser of the two.

Worse, `app/sitemap.ts:12-20` lists `/work` in `STATIC_ROUTES` but **not** `/projects`, while lines 39-46 emit every `/projects/<slug>` child. The sitemap advertises children of a parent it refuses to name.

The SEO manager makes it *possible* to point `/projects`'s canonical at `/work` without a deploy. Do not. **A canonical is a hint Google may ignore; a 308 is a fact it cannot.** Redirect `/projects` → `/work` in `next.config.ts`, keep the `/projects/[slug]` detail route exactly as it is (the redirect is on the bare path only), and drop the `/projects` seed row's `noIndex` question entirely.

Cost, stated plainly: any deck or email linking `/projects` gets one extra hop. That is cheaper than two pages ranking for neither.

### D9 — RESOLVED: the OG image uploader needs the SEO menu added to `IMAGE_UPLOAD_MENUS`

Gym's editor takes a pasted URL (`SeoEditor.jsx:400-411`). Pasting is how you end up with an OG image that 404s and nobody notices for a year, because nothing on the site renders it.

The portfolio already has `uploadPortfolioImage(api, file)` → Supabase. It is guarded by `requireAnyRbacPermission(IMAGE_UPLOAD_MENUS, "write")` at `D:\CanteenX\Portfolio\portfolio-server\src\modules\portfolio\portfolio-masters.routes.ts:29-34`, and that array is:

```ts
["/portfolio/projects", "/portfolio/team", "/portfolio/settings", "/portfolio/masters/tech-stacks"]
```

`/website/seo-manager` is not in it, so an SEO editor uploading an OG image gets a 403 that looks like a bug. **Add it to the array** and reuse the existing uploader with a thumbnail preview. No new upload path.

### D10 — RESOLVED: keep the hidden-page rule branch even though there is no portal

Gym's `seoRules.js:330-355` has a separate `hiddenRules()` set for `noIndex` pages, because scoring a login-walled page against share images would report a permanent 40% and train everyone to ignore the number. Nventra has no member portal, so the obvious move is to delete that branch.

Keep it. It is ~20 lines, and the moment there is a `/thank-you`, a `/proposal/<token>` or a gated download, the alternative is a row that can never score above "Needs work". Also **do not copy Gym's `CATEGORIES = ["Marketing","Portal","Other"]`** — import the server's `SEO_CATEGORIES` vocabulary (`Marketing | Detail | Other`, `seo-meta.model.ts:20`) so the chips and the enum cannot drift.

---

## 3. What already exists — do not rebuild

- **SEO model and routes.** `seo-meta.model.ts` (with `normalizeSlug` and `isValidCanonicalUrl`, both with better reasoning in their comments than Gym's equivalents) and `seo-meta.routes.ts` (public GET, admin CRUD, RBAC-guarded, rate-limited, 11000 handled). Mounted at `app.ts:134`. **Do not touch these except to add the OG-upload menu (D9).**
- **The public read contract.** `GET /api/v1/public/seo?slug=` returns `{ item: … | null }`, 200 either way. The website's "no row means use the page's own copy" fallback is already the server's behaviour.
- **Per-page metadata and server shells.** Six routes already split `page.tsx` (server) / `view.tsx` (client). Phase 2 changes *where the values come from*, not the file structure. `/` is the exception — D6.
- **`sitemap.ts` / `robots.ts` / `metadataBase`.** Working, hourly-revalidated, degrades to static routes on API failure (`sitemap.ts:33-37`). Phase 2 extends it, does not replace it.
- **Hourly ISR + `usePublicAPI` seeding.** `lib/usePublicAPI.ts` already explains why `initialData` matters for crawlers. Follow it.
- **RBAC.** Menu-driven, deny-by-default, with the seeding-gap-vs-permissions-gap distinction already implemented and logged (`rbac-permission.middleware.ts:149-160`). New screens need a seed row; that is the mechanism, not an oversight.
- **Supabase image upload.** `uploadPortfolioImage` → `POST /api/v1/portfolio/upload`. No new upload path for OG images.
- **Mongo-backed shared rate limiting.** `sharedRateLimitStore("contact")`, `portfolio-contacts.routes.ts:22-28`, with the fan-out reasoning already documented. Reuse it for any new public endpoint.
- **A server test runner.** `tsx --test`, three files, `mongodb-memory-server` and `supertest` already installed. Note: `package.json:17` lists test files **explicitly**, so a new test file that is not added to that string never runs.
- **The admin screen idiom.** `PortfolioTechStackPage.js` is the reference: Tailwind, `useAuth().api`, typed SDK module under `src/shared/sdk/`, `RbacGate action="write|edit|delete"`, modal form, `imgSrc()` helper. Follow it rather than importing Gym's reactstrap patterns.

---

## 4. Gap audit — what a credible agency site has that this does not

Ranked by commercial impact. Every row is grounded in a file I read.

### Tier 0 — the funnel is leaking money today

| # | Gap | Evidence | Why it costs money |
|---|---|---|---|
| **G1** | **A contact submission notifies nobody.** | `portfolio-contacts.routes.ts:52-64` creates the document and returns. The only `nodemailer` usage in the server is `modules/mailbox/*`, an unrelated module. | The site promises a reply "in under 12 hours" twice (`contact/view.tsx:142,291`) with no mechanism to honour it. Response latency is the strongest single predictor of agency win-rate; a lead that sits unread over a weekend has usually already signed elsewhere. This is the highest-value four hours of work on the list. |
| **G2** | **The default tab of the contact page cannot submit anything.** | `contact/view.tsx:85` defaults `tab` to `"call"`. That pane has slot buttons that only set local state, and one outbound link — `href="https://cal.com"` (line 261), the *vendor's marketing homepage*, not a booking page. There is no submit control in the pane. | A visitor selects "Thu 12 · 2pm", clicks "View All Availability", and lands on cal.com's own website. The default view of your only conversion page converts at zero, and the one CTA sends traffic to a third party. |
| **G3** | **No qualification and no callback channel.** | `PortfolioContactModel` (`portfolio-contacts.models.ts:3-10`) stores `name, email, service, callSlot, message, status`. No phone, company, budget band, timeline, or referrer. | You cannot triage a serious enquiry from a student's question, cannot phone anyone back, and cannot say which channel produced a deal. Every marketing decision afterwards is guesswork. |
| **G4** | **No analytics or conversion tracking of any kind.** | No `@vercel/analytics`, no GA4, no `gtag`, no tag manager anywhere in `D:\CanteenX\Portfolio\Portfolio` (grepped `.tsx`/`.ts`/`.json`). | You do not know your traffic, your bounce, which case study is read, or whether the contact page is even reached. Combined with G3 there is no attribution at either end of the funnel. |

### Tier 1 — regulatory exposure and blocked channels

| # | Gap | Evidence | Why it costs money |
|---|---|---|---|
| **G5** | **No privacy policy, no terms, no cookie notice.** | 13 `page.tsx` files under `app/`; none is a legal page. The form collects name, email and free-text project details (`contact/view.tsx:301-363`) — personal data under GDPR Art. 4 and India's DPDP Act 2023. No controller identity, no lawful basis, no retention period, no rights statement. | Three separate costs. (a) **Procurement blocks it**: enterprise and any EU-touching buyer's vendor questionnaire asks for a privacy policy and a DPA; "we don't have one" ends the conversation, it does not start a negotiation. (b) **Paid acquisition is blocked**: Google Ads and Meta both require a privacy policy on the landing domain, so you cannot buy traffic even if you wanted to. (c) DPDP penalties run to ₹250 crore. |
| **G6** | **No consent capture, and the form's labels are not associated with its inputs.** | `contact/view.tsx:311, 325, 351` render `<label className="…">` with **no `htmlFor`**, and the inputs at 314, 328, 354 have **no `id`**. | No consent record means no evidence of lawful basis when asked. The label defect is a WCAG 1.3.1 / 4.1.2 failure on the *one form that makes you money* — a screen-reader user hears three unnamed fields, and autofill misbehaves for everyone. |

### Tier 2 — credibility, which is the actual product an agency sells

| # | Gap | Evidence | Why it costs money |
|---|---|---|---|
| **G7** | **Zero third-party proof. No testimonials, no client logos, no references.** | Grepped `testimonial`/`client logo` across the site: nothing. `PortfolioSettings` (`api.ts:86-111`) has hero, navbar, footer, services, about, process, teamPlaybook, contactInfo and `techMarquee` — and `techMarquee` is *technology* names ("AWS", "GRAPHQL"), not clients. The `clients` master exists only as a project filter. | A buyer choosing between three agencies decides on evidence of other people's money. Every claim on the site is currently first-person. |
| **G8** | **Case studies have the shape of proof without the substance.** | `ApiProject` (`api.ts:52-80`) carries `roi[]`, `metric`, `client`, `timeframe`, `problem`, `solution` — genuinely good fields. What it has no slot for: a named client quote, a reference contact, or a before/after baseline. `metric` is one unattributed string. | "+40% conversion" in your own voice reads as marketing. The same number attributed to a named person at a named company reads as a reference. The data model change is small; the difference in how the page is read is not. |
| **G9** | **Two of four home-page featured projects are Unsplash stock photography.** | `app/page.tsx:23` and `:37` — `images.unsplash.com` URLs for "We Converse App" and "Business Meet App". Per D6 these are also what crawlers permanently see. | An engineering agency illustrating its own shipped deployments with stock photos is the fastest credibility tell there is, and it is above the fold. |
| **G10** | **Your three strongest case studies are untitled and invisible to the sitemap.** | `app/projects/ai-attendance/page.tsx:1`, `business-meet/page.tsx:1`, `ai-call-bot-hospital/page.tsx:1` are all `"use client"` with **no `metadata` export** — so all three ship the root layout's title and are indistinguishable from the home page in a search result. And `sitemap.ts:39-46` derives project URLs from CMS rows only, so none of the three appears. | The VMC attendance build — 8,000+ employees, named public-sector client — is probably the single most persuasive artefact on this site, and Google is told nothing about it. |
| **G11** | **`/work` and `/projects` are duplicate indexes; the sitemap is internally inconsistent.** | Both call `getPublicProjects()` (`work/page.tsx:30`, `projects/page.tsx:29`). `sitemap.ts:12-20` includes `/work` but not `/projects`, while still emitting every `/projects/<slug>`. | Split link equity across two near-identical pages, and a sitemap that advertises children of a parent it will not name. See D8. |
| **G12** | **No engagement-model or pricing signal.** | `/how-we-work` describes process (`PortfolioSettings.process`), not commercials. | The most common reason a qualified buyer does not enquire is fear of wasting a fortnight on a vendor they cannot afford. A band, a minimum engagement, or "typical projects run ₹X–Y over Z weeks" converts browsers who would otherwise leave silently — and it filters out the enquiries you would have declined anyway. |

### Tier 3 — organic acquisition and share surface

| # | Gap | Evidence | Why it costs money |
|---|---|---|---|
| **G13** | **No blog / insights / writing of any kind.** | 13 routes, all brochure pages. | Ten pages is ten chances to rank, and all ten target brand-shaped queries that only people who already know you type. The queries that produce agency leads are problem-shaped ("reduce voice AI latency", "geofenced attendance at scale"), and you have already solved those problems — the material exists, the surface does not. This is the only durable non-paid channel and it is entirely absent. |
| **G14** | **No structured data anywhere.** | No JSON-LD in `layout.tsx` or any page. | No `Organization`, so no knowledge-panel ownership and no `sameAs` linking the site to your GitHub or LinkedIn. Covered by D5. |
| **G15** | **No OG image.** | `layout.tsx:32` declares `twitter.card: "summary_large_image"` and there is **no `images` key anywhere** and no `app/opengraph-image.tsx`. | Every share of this site on LinkedIn or WhatsApp renders as a bare grey link while claiming to be a large-image card. LinkedIn is where agency referrals actually travel. |

### Tier 4 — technical quality, which your buyers inspect because it is what you sell

| # | Gap | Evidence | Why it costs money |
|---|---|---|---|
| **G16** | **No `next/image`; 24 raw `<img>` in 10 files; `next.config.ts` has no `images` block at all.** | `project-card.tsx` ×1, `projects/[slug]/project-detail.tsx` ×6, the three legacy pages ×4 each, plus the `view.tsx` files. `next.config.ts:6-26` contains only `rewrites` — so there are no `remotePatterns`, meaning Supabase-hosted CMS images cannot go through `next/image` until that is configured. | LCP is a ranking factor, but the sharper cost is this: a prospect evaluating you *for performance work* will run PageSpeed on your own site. This is the single most-likely-to-be-checked technical fact about the domain. |
| **G17** | **Two copies of the same animation library, plus three icon sets.** | `package.json:25` `framer-motion@^12.38.0` **and** `:29` `motion@^12.38.0` — the same library under both names, and both are imported: `template.tsx:2` + `ai-models-preview.tsx:5` use `framer-motion`, `feature-carousel.tsx:4` uses `motion/react`. On top: `gsap`, `lenis`, `@splinetool/runtime`, `cobe`, and `lucide-react` + `react-icons` + `@hugeicons/react`. | Duplicate runtime in every bundle. And it is exactly the kind of thing a technical reader notices and quietly downgrades you for. |
| **G18** | **Zero `prefers-reduced-motion` handling, under an unusually heavy motion stack.** | Grepped `prefers-reduced-motion` / `useReducedMotion` across `app/`, `components/` and `globals.css`: **zero hits.** Meanwhile `smooth-scroll.tsx` runs Lenis scroll-hijacking sitewide, `scroll-reveal.tsx` runs GSAP on every section, plus a Spline 3D scene and a Cobe WebGL globe. | WCAG 2.3.3 and 2.2.2. Users with vestibular disorders get motion sickness rather than a bad impression. Concretely: you already sell to a municipal corporation, and public-sector procurement runs accessibility conformance checks. Scroll hijacking additionally breaks find-in-page, keyboard paging and the back-button scroll restore for everyone. |
| **G19** | **No `not-found.tsx`, no `error.tsx`, no `global-error.tsx`.** | None exists anywhere under `app/`. | A stale link from an old deck — `/projects/we-converse` is linked from `app/page.tsx:22` and may well have no CMS row — produces Next's default monochrome 404 with no navbar, no footer and no route back into the site. A visitor who arrived from a proposal leaves. |
| **G20** | **No security headers.** | `next.config.ts` exports `rewrites` only — no `headers()`. So no CSP, no HSTS, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`. | A securityheaders.com grade of F is a literal line item on enterprise vendor questionnaires, and for an engineering vendor it is embarrassing in a way a marketing site's would not be. It is one function in one file. |
| **G21** | No `manifest.ts`, no `apple-icon`. | `app/` has `favicon.ico` and `icon.svg` only. | Minor. Bundle it with G15. |

**Ranked headline:** G1 → G2 → G5 → G4 → G3 → G7 → G10 → G18 → G13 → G16 → G8 → G19 → G15 → G9 → G11 → G14 → G6 → G17 → G12 → G20 → G21.

---

## 5. Phases

Each ships independently and ends with the §8 gate.

### Phase 0 — unblock the SEO module (prerequisite for 1 and 2)

The seed gap found in verification. Done alone so its failure is not confused with a UI bug.

- Add a `#website` root to `MENU_TREE` in `D:\CanteenX\Portfolio\portfolio-server\src\bootstrap\seed-rbac.ts`, `sequence: 20`, one child `{ menuUrl: "/website/seo-manager", menuName: "SEO Manager", icon: "Search", sequence: 1 }`.
- Add `"/website/seo-manager"` to `IMAGE_UPLOAD_MENUS` in `portfolio-masters.routes.ts:29-34` (D9).
- Run the seed; confirm the Administrator role can be granted the new menu in the permission matrix.
- Verify with a **non-super-admin** account that `GET /api/v1/seo` returns 200 and that the server log contains no `"RBAC lookup failed"` line.

**Risk: LOW.** The seeder is idempotent and leaves existing rows alone. The one hazard is the 60-second `LOOKUP_TTL_MS` cache in `rbac-permission.middleware.ts:42` — a freshly seeded menu can 403 for up to a minute after seeding, and on serverless that is per-instance. Wait a minute before concluding it failed. **Effort: 0.5–1 h.**

### Phase 1 — SEO Manager admin screen

Ported from Gym, adapted to the portfolio admin's Tailwind idiom rather than reactstrap.

New directory `D:\CanteenX\Portfolio\portfolio-admin\src\modules\deep\website\seo\`:

- **`seoRules.js`** — pure functions, no React, no DOM. Port of `D:\CanteenX\Gym\Gym-Admin\src\pages\Website\seo\seoRules.js`. `TITLE_LIMIT 60` / `DESCRIPTION_LIMIT 160` / mins `30`/`70` / `KEYWORD_MAX 10` / `WARN_RATIO 0.9`, `counterState`, `keywordList`, `effectiveOgTitle/Description`, `indexableRules`, `hiddenRules` (D10), `evaluateSeo`, `completeness`. Changes from Gym: read `process.env.REACT_APP_SITE_URL` not `import.meta.env` (this is CRA, not Vite); `canonicalProblem` must mirror `isValidCanonicalUrl` in `seo-meta.model.ts:73-95` **including the root-relative branch**, which Gym's version rejects and the portfolio server accepts. If the client is stricter than the server, an editor is told a legal value is invalid.
- **`SeoList.jsx`** — category chips with counts, one row per route, columns: Page (icon + pageTitle + slug), Category, Meta title with `n / 60`, Keywords (first 3 + overflow), Search (Indexed / No-index), **Completeness as a word in a badge plus "n of m checks pass"** — never a bare coloured dot; a dot needs a legend, vanishes in greyscale and is invisible to a red-green deficiency, and it is the one column an editor scans to decide what to open. Actions gated by `RbacGate`.
- **`SeoEditor.jsx`** — Route, Page name, Category (from server `SEO_CATEGORIES`), Hide-from-search switch, In-use switch; Meta title + Meta description with live counters; Keywords as removable chips; Canonical URL with a "Use this page" button and both an error and a "points elsewhere" warning; OG title / type / description / **image via `uploadPortfolioImage` with a thumbnail** (D9). **Field `id`s are a contract with the score panel** — a rule names the `id` of the control that would fix it. If you rename an `id`, rename its `targetId`.
- **`SeoScorePanel.jsx`** — score, band, progress bar, and every rule rendered as a **button that focuses and scrolls to the offending field**. A checklist you cannot act on is decoration.
- **`GooglePreview.jsx`** — with the **desktop / mobile toggle** (60/160 vs 50/120 char proxies). Google truncates by rendered width and mobile cuts harder; one fixed mock hides half the problem.
- **`SocialPreview.jsx`** — OG card mock using the effective (inherited) values.
- **`CharacterCounter.jsx`, `KeywordInput.jsx`** — small, shared.
- **`SeoManagerPage.js`** (container, in `modules/deep/website/`) — owns the row so the fields and the previews beside them can never disagree. One fetch of `GET /api/v1/seo` (a dozen rows; the chips need counts for every category at once, which a server-side filter cannot give without one request per chip), filtered in the browser.
- **`src/shared/sdk/seo.ts`** — `listSeoMeta`, `getSeoMeta`, `createSeoMeta`, `updateSeoMeta`, `deleteSeoMeta`. Typed, matching `seo-meta.routes.ts` exactly: `GET` returns `{ items }`, `POST` returns the object at 201, `PATCH` returns it at 200, `DELETE` returns **204 with no body** — do not `JSON.parse` that response.
- **`App.js`** — lazy import + `<Route path="/website/seo-manager" …>`. The path must match D1 exactly.

**Where this should be better than Gym's, concretely:**
- Counters warn before the limit, not only past it — a bar that merely fills tells you nothing at 75/60.
- Status is never colour-only.
- Preview both widths.
- Score rules are clickable and say what they check.
- OG image is uploaded, not pasted (D9).
- The canonical field defaults to the route's own URL and is validated client-side with the *same* rules as the server, so no save fails on a field the editor never touched.

**Risk: LOW-MEDIUM.** Technically low. Two things to get right: the canonical validator must not be stricter than `isValidCanonicalUrl`, and `RbacGate` only works if D1's path match holds — test with a non-super-admin, because super_admin short-circuits at `RequirePermission.jsx:36` and will show you every button regardless. **Effort: 8–11 h.**

### Phase 2 — website composition layer, seeding, structured data

- **`D:\CanteenX\Portfolio\Portfolio\lib\seo.ts`** — `buildPageMetadata` per D2/D4, `absoluteUrl`, `validCanonical`, `MARKETING_ROUTES` as the single source shared with `sitemap.ts`, and the `@graph` builder per D5.
- **`lib/api.ts`** — add `getSeoMeta(slug)` and the `SeoMetaRow` type per D3.
- **Seven routes converted** from `export const metadata` to `export async function generateMetadata()` calling `buildPageMetadata`, keeping their current strings as `defaultTitle` / `defaultDescription`: `about`, `services`, `how-we-work`, `team`, `work`, `projects`, `contact`.
- **`app/page.tsx` split** per D6 into a server shell + `app/home-view.tsx`.
- **Three legacy pages** get server shells so they can carry a title at all: `app/projects/ai-attendance/`, `ai-call-bot-hospital/`, `business-meet/` each become `page.tsx` (server, `generateMetadata` → `buildPageMetadata`) + `view.tsx` (the current `"use client"` body, moved unchanged).
- **`/projects/[slug]` and `/team/[slug]`** gain the SeoMeta **override** layer per D7: look up the rendered path, let a present row win field-by-field over the record-derived values. Do not invert the precedence.
- **`app/sitemap.ts`** — read `MARKETING_ROUTES` from `lib/seo.ts`, add the three legacy project paths, exclude any slug whose SeoMeta row has `noIndex: true`, and resolve the `/projects` question via D8.
- **`next.config.ts`** — add the `/projects` → `/work` 308 (D8).
- **`app/opengraph-image.tsx`** — one generated default OG card so G15 stops being true for every page at once.
- **`seedSeoMeta()`** in the server, wired into `portfolio.seed.ts`, eleven rows per D7.
- **Structured data** — `Organization` + `WebSite` + `OfferCatalog` graph rendered from `app/layout.tsx`, driven by `PortfolioSettings.services` and a real `sameAs` array; `BreadcrumbList` on the two detail routes.

**Risk: MEDIUM.** This is the phase that can de-index pages. Three specific hazards: (1) the `title: undefined` trap in D2 — it shipped an untitled home page in Gym's Phase 1 and will do it again; (2) a bad canonical tells Google this page is a duplicate of something that does not exist, which is why `validCanonical` falls back to the route's own absolute URL rather than emitting a broken one; (3) `buildPageMetadata` must never throw — a route added with no SeoMeta row must still ship the page's constants. Verify with `curl` on the deployed URL and read the actual `<head>`, not the React tree. **Effort: 8–12 h.**

### Phase 3 — compliance and the leaking funnel (G1, G2, G3, G5, G6)

Can jump the queue — see §7.

- **`/privacy` and `/terms`** as real routes with real content: controller identity, what is collected, lawful basis, retention period, rights and how to exercise them, third-party processors (Vercel, Supabase, MongoDB Atlas, your mail provider), and a contact address. Linked from the footer and from the form. Add SeoMeta rows.
- **Cookie notice** — and be honest about whether you need one. Today the site sets no cookies and runs no third-party scripts, so a banner would be theatre. **It becomes required the moment G4's analytics lands**, which is why the two are planned together: ship a consent gate that defaults to *off* and only loads analytics after acceptance, rather than retrofitting a banner over a tag that is already firing.
- **Consent checkbox** on the form, with the accepted text and a UTC timestamp stored on the submission — that is the evidence, not the checkbox.
- **Form accessibility**: give every input an `id`, every label an `htmlFor`, wire `aria-describedby` to the error text, and move focus to the error on a failed submit (G6).
- **Repair the call tab** (G2): either make the slot selection submit through the same endpoint with `callSlot` populated, or replace the cal.com link with a real booking URL. Do not ship a default tab that cannot convert.
- **Qualification fields** (G3): `phone`, `company`, `budgetBand`, `timeline`, `source` on `PortfolioContactModel`, all optional except phone-or-email, with matching zod in `portfolio-contacts.routes.ts:36-42` and matching columns in `PortfolioContactsPage.js`. Capture `referrer` and UTM params server-side from the request, not from a hidden field a bot can fill.
- **Notification on submit** (G1): `nodemailer@^8.0.5` is already a dependency. Extract a small `core/mail/mail.service.ts`, send on create, and **send it after the 201 response, not before** — a mail outage must never turn a captured lead into a failed submission the visitor retries or abandons.
- **Honeypot field** on the form. The Mongo-backed 5/min limiter already exists; a honeypot costs nothing and stops the unsophisticated majority.

**Risk: MEDIUM.** The public endpoint gains fields, so validation must stay strict. The genuine hazard is ordering: a synchronous send inside the request path converts a mail failure into a lost lead, which is the precise thing this phase exists to prevent. **Effort: 8–12 h.** Legal copy is owner-supplied; do not have an LLM invent your retention period.

### Phase 4 — error handling, analytics, security headers (G4, G19, G20, G21)

- `app/not-found.tsx` and `app/error.tsx` with navbar, footer and real routes onward; `app/global-error.tsx` as the bare fallback.
- `notFound()` called from `/projects/[slug]` and `/team/[slug]` when the record is absent, so a dead slug is a 404 and not a 200 with empty content — a soft-404 is worse than a 404 because Google indexes it.
- Analytics behind the Phase 3 consent gate. `@vercel/analytics` + `@vercel/speed-insights` is the lowest-friction choice here (no tag manager, no cookie, real Core Web Vitals field data from the same platform you deploy on); GA4 only if you need the ads integration, in which case it must be consent-gated.
- Conversion events: contact submitted, call slot chosen, case study opened.
- `headers()` in `next.config.ts`: CSP (report-only first — Spline and Supabase will need explicit origins, and a blocking CSP shipped blind will white-screen the hero), HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- `app/manifest.ts`, `apple-icon`.

**Risk: LOW-MEDIUM**, concentrated entirely in the CSP. Report-only for a week, read the reports, then enforce. **Effort: 5–7 h.**

### Phase 5 — credibility (G7, G8, G9, G10, G12)

- **`Testimonial` model + admin screen** under `#website`: quote, author name, role, company, company logo, linked project, consent-to-publish flag, order, isActive. The consent flag is not bureaucracy — publishing a client quote without permission is how you lose the client.
- **Client logo strip**, from a `clients` master extended with a logo, rendered on `/` and `/work`. Grayscale-by-default is fine; inventing logos is not.
- **Outcome fields on `ApiProject`**: `outcomeBaseline`, `outcomeResult`, `outcomeSource`, and an optional linked testimonial. Render as "before → after, per <named source>".
- **Replace the two Unsplash images** on the home page with real screenshots (G9). Until real assets exist, a designed abstract card beats a stock photograph of strangers in an office.
- **Give the three legacy case studies CMS rows** so they stop being a separate code path — Phase 2 gives them titles, this gives them the same lifecycle as everything else, and lets `sitemap.ts` find them without a hardcoded list.
- **An engagement-model section** on `/how-we-work` (G12): typical size, typical duration, how scoping works, what a first engagement looks like. A range, not a price list.

**Risk: LOW** technically. The risk is content: an empty testimonials table renders an empty section, so every new section must collapse cleanly when it has no rows — the same discipline as the phone card in `contact/view.tsx:78-83`. **Effort: 10–14 h** plus owner time to collect quotes, which is the real critical path.

### Phase 6 — accessibility and performance (G18, G16, G17, G6 residue)

- **`prefers-reduced-motion` as a first-class concept**, not a patch: one `useReducedMotion` hook, consumed by `smooth-scroll.tsx` (skip Lenis entirely — do not just shorten the duration; scroll-hijacking is itself the problem), `scroll-reveal.tsx` (render revealed, skip the tween), `scroll-progress.tsx`, `template.tsx`, the Spline scene and the Cobe globe (render a static poster frame). Plus a global `@media (prefers-reduced-motion: reduce)` block in `globals.css` as the backstop for anything CSS-driven.
- **Pick one motion library.** `motion` is the current published name of `framer-motion`; keeping both ships two copies. Standardise on one, convert the single `motion/react` import in `feature-carousel.tsx:4`, drop the other from `package.json`. Same exercise for the three icon sets — keep `lucide-react`, which is already dominant in the codebase.
- **`next/image` migration** for the 24 `<img>`, starting with `project-card.tsx` and the `/projects/[slug]` gallery, which are the LCP candidates. **This needs `images.remotePatterns` added to `next.config.ts` first** for the Supabase origin — there is no `images` block at all today, so the migration is blocked on config, not on components.
- Keyboard-and-screen-reader pass over the nav, the custom select (`custom-select.tsx` — a div-based select is usually the worst offender on a site like this) and the contact form.
- Establish a Lighthouse baseline **before** starting, so the phase can prove it did something.

**Risk: MEDIUM.** Removing Lenis under reduced-motion will expose layout that was tuned against smoothed scrolling; check the whole site with the OS setting on. The `next/image` swap changes layout wherever an `<img>` was implicitly sized. **Effort: 12–16 h.**

### Phase 7 — Insights (G13)

- `Post` model: slug, title, excerpt, cover, body (MDX or rich text), author → team member, tags, publishedAt, isActive. Admin screen under `#website`.
- `/insights` index + `/insights/[slug]`, server-rendered with ISR, `generateMetadata` through `buildPageMetadata` with the SeoMeta override layer already built in Phase 2 — the composition layer is the reason this phase is cheap.
- `BlogPosting` JSON-LD with a real author reference into the Organization graph.
- Sitemap entries, RSS.
- **Editorial commitment is the gating factor, not the code.** Three posts and silence is worse than no blog — a dead `/insights` with a most-recent post from eight months ago is a visible signal that the company is not busy. Do not start this phase without agreeing who writes and how often.

**Risk: LOW** technically, **HIGH** on follow-through. **Effort: 10–14 h** build, unbounded content.

---

## 6. Cross-cutting requirements

- **Every new admin screen needs a `seed-rbac.ts` row before `requireRbacPermission` will pass.** Not optional, not a follow-up — Phase 0 exists because this was missed once already. Each phase's checklist includes its seed.
- **Test new screens with a non-super-admin.** `requireRbacPermission` returns `next()` immediately for `super_admin` (`rbac-permission.middleware.ts:205-208`) and `useRbacPagePermissions` returns all-true for it (`RequirePermission.jsx:36`). Testing as super_admin proves nothing about RBAC.
- **Uploads go through `uploadPortfolioImage` → `POST /api/v1/portfolio/upload`.** No new upload path. If a new menu needs to upload, add it to `IMAGE_UPLOAD_MENUS`.
- **Public endpoints use `sharedRateLimitStore`**, not the in-memory default. The reasoning at `portfolio-contacts.routes.ts:20-21` applies to every new public write.
- **Server readers never throw.** `lib/api.ts` catches and returns `null`/`[]` throughout; `sitemap.ts:33-37` degrades to static routes. New readers match this or a backend blip becomes a 500 on a marketing page.
- **A new test file must be added to the `test` script string** in `portfolio-server/package.json:17` — the runner takes an explicit file list, so an unreferenced test silently never runs.
- **Secrets.** The mail credential in Phase 3 goes in Vercel env on the server project. Nothing in this plan requires a secret in the repo.

---

## 7. Recommended sequence

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 7**, with one caveat stated loudly:

**If the calendar forces a choice, ship Phase 3 before Phase 1.** Phase 3 is the only phase with a regulatory deadline attached, it unblocks paid acquisition and enterprise procurement, and G1 — a lead arriving and nobody being told — is costing money every week it stands. Phase 3 has no dependency on 1 or 2. The only coupling is that `/privacy` and `/terms` then need SeoMeta rows added to Phase 2's seed list, which is two lines.

Phase 0 is first regardless; it is an hour and without it Phase 1 cannot be tested honestly. Phase 2 must follow Phase 1 so there is a screen to enter the values the composition layer reads — shipping the reader before the writer means a week of empty rows.

| Phase | Effort |
|---|---|
| 0 — RBAC unblock | 0.5–1 h |
| 1 — SEO admin screen | 8–11 h |
| 2 — composition layer, seeding, JSON-LD | 8–12 h |
| 3 — compliance + lead capture | 8–12 h |
| 4 — errors, analytics, headers | 5–7 h |
| 5 — credibility | 10–14 h |
| 6 — a11y + performance | 12–16 h |
| 7 — insights | 10–14 h |
| **Total** | **62–87 h**, eight independent increments |

---

## 8. Verification gates — every phase ends here

A phase is done when all four pass, in this order.

1. **Code review** over the phase's diff across all three repos. CRITICAL and HIGH fixed before proceeding; MEDIUM fixed or deferred in `todo.md` with a reason. Recurring lessons: seed the menu row, test as a non-super-admin, never `title: undefined`, uploads through the existing path, public writes through `sharedRateLimitStore`.
2. **Browser testing** against the **deployed** URL, at 1440 px and 390 px:
   - the phase's flows end to end, screenshots captured;
   - zero `pageerror` and zero console errors on every touched page;
   - unnamed form controls = 0 and nameless icon buttons = 0;
   - no horizontal overflow at 390 px;
   - from Phase 6 on, every check repeated with `prefers-reduced-motion: reduce` forced.
3. **Head inspection, not React inspection.** `curl -s <url> | grep -i '<title>\|canonical\|og:'` on every touched route. A metadata bug is invisible in devtools' element panel because React has already hydrated; it is only visible in the bytes the crawler received. **Give the CDN two minutes after a deploy before judging, and confirm the bundle hash changed.**
4. **Phase-specific tests** where named: `normalizeSlug` / `isValidCanonicalUrl` edge cases and `buildPageMetadata` fallback (Phases 1–2); contact validation and consent persistence (Phase 3).

---

## 9. Risk table

| # | Risk | Phase | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R1 | Menu row seeded but RBAC still 403s for a minute | 0 | High | Low | `LOOKUP_TTL_MS` is 60 s and per-instance on serverless. Wait, then retry, before debugging. |
| R2 | RbacGate hides every button for non-super-admins | 1 | Medium | Medium | D1: the React route path and the seeded `menuUrl` must be the identical string. Test as a non-super-admin or you will not see it. |
| R3 | Client canonical validator stricter than the server's | 1 | Medium | Low | Mirror `isValidCanonicalUrl` exactly, **including** the root-relative branch Gym's version rejects. |
| R4 | `title: undefined` blanks the root layout default | 2 | High | **High** | Spread every optional key conditionally. This exact bug shipped an untitled home page in Gym. Gate step 3 catches it. |
| R5 | A bad canonical de-indexes a live page | 2 | Low | **High** | Validate on both sides; fall back to the route's own absolute URL; never emit a canonical the validator rejected. |
| R6 | `buildPageMetadata` throws and 500s a marketing page | 2 | Low | High | Never-throw contract, 3 s timeout, `null` on failure, page constants as the floor. Test with the API deliberately down. |
| R7 | `/projects` → `/work` redirect breaks an inbound link | 2 | Medium | Low | 308 preserves method and passes link equity. `/projects/<slug>` is untouched — verify explicitly, it is the easy thing to break. |
| R8 | Contact endpoint becomes a spam relay once fields are added | 3 | Medium | Medium | Existing Mongo-backed 5/min limiter + honeypot + strict zod. Never echo submitted content back in the response. |
| R9 | A mail failure turns a captured lead into a failed submission | 3 | Medium | **High** | Send **after** the 201. Persist first, notify second. This is the whole point of the phase. |
| R10 | Legal copy invented rather than owner-supplied | 3 | Medium | **High** | Retention periods, processor lists and controller identity are facts about your business. An LLM-drafted privacy policy that misstates them is worse than none. |
| R11 | Blocking CSP white-screens the Spline hero | 4 | High | High | Report-only for a week, read the reports, enumerate the Spline and Supabase origins, then enforce. |
| R12 | Analytics ships before the consent gate | 4 | Medium | Medium | Same phase, gate first. Retrofitting consent over a firing tag is the common failure. |
| R13 | Removing Lenis exposes untuned layout | 6 | High | Medium | Full-site pass with the OS reduced-motion setting on, both breakpoints. Expect real layout work, not a flag flip. |
| R14 | `next/image` swap shifts layout | 6 | High | Medium | Migrate LCP candidates first, one component at a time, screenshot-diff each. `remotePatterns` must land before the first swap. |
| R15 | A published testimonial without client permission | 5 | Low | **High** | Consent flag on the model, required before `isActive` can be set. |
| R16 | `/insights` goes stale and signals a dead company | 7 | High | Medium | Do not start without an agreed author and cadence. A blog with a most-recent post from eight months ago is worse than no blog. |

---

## 10. Explicitly not worth doing

Stated so nobody re-proposes them.

- **`LocalBusiness` structured data.** Correctly ruled out. `ProfessionalService` is a `LocalBusiness` subtype, so it inherits the same exposure — see D5. Use `Organization` + `OfferCatalog`.
- **`Review` / `AggregateRating` JSON-LD.** Self-serving review markup on your own site is a documented Google penalty vector, and the star rating will not render anyway. Testimonials as HTML, not as ratings markup.
- **A SeoMeta row per CMS project and team member.** D7. It makes the list unusable and turns "publish a project" into a mandatory SEO chore. Rows there are overrides, and only for the two or three case studies worth tuning.
- **A cookie banner today.** The site sets no cookies and loads no third-party scripts. A banner before there is anything to consent to is theatre that costs conversion. It becomes necessary in Phase 4 and is planned there.
- **A second SEO editor via the generic settings screen.** Gym retired exactly this (`Gym-frontend/src/lib/seo.ts:20-33`): two editors writing the same two fields is how a page ends up with its title from one and its description from the other. One editor, one precedence rule.
- **A headless CMS (Sanity/Contentful) for Insights.** You already own a CMS, an admin panel, RBAC and Supabase storage. A second content system means two auth models and two publishing workflows for one content type.
- **Server-side rendering the Spline scene or the Cobe globe.** Neither can be; the effort belongs in the reduced-motion poster frame instead.
- **A/B testing framework.** Traffic is too low for significance. Fix G1, G2 and G5 first — those are not close calls that need measuring.
- **Renaming `/website/seo-manager` to `/portfolio/seo-manager` to avoid one seed row.** D1. You will create the Website group within the month anyway.

---
---
