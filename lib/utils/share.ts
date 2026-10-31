export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export const PEER_SHARE_UTM: UtmParams = {
  source: "user_share",
  medium: "referral",
  campaign: "peer_share",
};

/**
 * Appends or updates UTM tracking parameters on a given URL or relative path.
 * Keeps existing query parameters and hash fragments intact.
 */
export function buildShareUrl(url: string, utm: UtmParams = PEER_SHARE_UTM): string {
  if (!url) return "";

  // Split out hash fragment if present so it remains at the end
  const hashIndex = url.indexOf("#");
  const baseWithoutHash = hashIndex !== -1 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex !== -1 ? url.slice(hashIndex) : "";

  // Check if it's absolute URL or path-relative
  const isAbsolute = /^https?:\/\//i.test(baseWithoutHash);
  const dummyOrigin = "https://cineby.app";
  const parsedUrl = new URL(baseWithoutHash, isAbsolute ? undefined : dummyOrigin);

  if (utm.source) parsedUrl.searchParams.set("utm_source", utm.source);
  if (utm.medium) parsedUrl.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) parsedUrl.searchParams.set("utm_campaign", utm.campaign);
  if (utm.term) parsedUrl.searchParams.set("utm_term", utm.term);
  if (utm.content) parsedUrl.searchParams.set("utm_content", utm.content);

  if (isAbsolute) {
    return `${parsedUrl.toString()}${hash}`;
  }

  // Relative path: reconstruct pathname + search
  return `${parsedUrl.pathname}${parsedUrl.search}${hash}`;
}
