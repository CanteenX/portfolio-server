import { env } from "../../config/env";
import { logger } from "../logging/logger";

/**
 * Tells the website to drop its ISR cache for the routes a CMS write affected.
 *
 * Fire-and-forget by design. A failed revalidation means the page is stale for
 * up to the existing hour — annoying — while awaiting it on the request path
 * would mean a website outage turns "save settings" into a 500 in the admin
 * panel. The write has already committed by the time this runs; nothing here
 * can un-commit it, so nothing here may fail the response.
 */
export function revalidateWebsite(paths: string[]): void {
  const url = env.WEBSITE_REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;

  if (!url || !secret) {
    // Not an error: a deployment without the website wired up simply keeps the
    // hourly behaviour. Logged at debug so it does not look like a fault.
    logger.debug("Skipping revalidation — WEBSITE_REVALIDATE_URL/REVALIDATE_SECRET unset");
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ paths }),
    signal: AbortSignal.timeout(5000)
  })
    .then(async (response) => {
      if (!response.ok) {
        logger.warn("Revalidation rejected by the website", {
          status: response.status,
          paths
        });
        return;
      }
      logger.info("Revalidated website paths", { paths });
    })
    .catch((error: unknown) => {
      logger.warn("Revalidation request failed", {
        paths,
        error: error instanceof Error ? error.message : String(error)
      });
    });
}

/** Routes whose content is composed from site-wide PortfolioSettings. */
export const SETTINGS_PATHS = [
  "/",
  "/about",
  "/services",
  "/how-we-work",
  "/team",
  "/work",
  "/contact"
];

/** Routes affected by a change to the team roster. */
export const TEAM_PATHS = ["/", "/team"];

/** Routes affected by a change to the project catalogue. */
export const PROJECT_PATHS = ["/", "/work", "/projects"];

/**
 * Routes affected by a change to the service catalogue.
 *
 * `/contact` is here because the contact form's service dropdown is built from
 * the same list — a service added without revalidating /contact is a service
 * leads cannot select.
 */
export const SERVICE_PATHS = ["/", "/services", "/contact"];

/** Routes that render testimonials, client logos or headline metrics. */
export const SOCIAL_PROOF_PATHS = ["/", "/about", "/work"];

/**
 * Routes that render the FAQ.
 *
 * Only one. The contact page links to it but does not render any of it, so
 * revalidating /contact on an FAQ edit would rebuild a page whose output cannot
 * have changed.
 */
export const FAQ_PATHS = ["/faq"];

/**
 * Routes affected by publishing or editing one post.
 *
 * The index and the feed are included because both list every published post,
 * so an edit to a title that only revalidated the post itself would leave the
 * old title on the page people arrive from.
 */
export function postPathsFor(slug: string): string[] {
  return ["/insights", "/insights/rss.xml", "/sitemap.xml", `/insights/${slug}`];
}

/**
 * Routes affected by a change to one legal document.
 *
 * Privacy and terms have fixed routes because the footer and the sitemap link
 * to them by name; everything else published is served from `/legal/<slug>`.
 * Both are returned for those two slugs rather than branching, since
 * revalidating a path that does not exist costs nothing and missing one leaves
 * a stale policy served to the public.
 */
export function legalPathsFor(slug: string): string[] {
  return [
    `/legal/${slug}`,
    // The footer builds its link list from the published documents, and the
    // sitemap enumerates them, so both go stale on a publish/unpublish.
    "/sitemap.xml",
    ...SETTINGS_PATHS,
    ...(slug === "privacy" ? ["/privacy"] : []),
    ...(slug === "terms" ? ["/terms"] : [])
  ];
}
