export interface PrefetchCandidate {
  readonly currentUrl: string;
  readonly href: string;
  readonly target?: string;
  readonly download?: boolean;
  readonly external?: boolean;
  readonly nofollow?: boolean;
  readonly noPrefetch?: boolean;
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

export interface NetworkConnection {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

const BLOCKED_PATH =
  /^\/(?:api(?:s)?|console|uc|login|logout|register|signup|password|oauth2|actuator)(?:\/|$)|^\/(?:feed|rss|atom|sitemap)(?:\.xml)?(?:\/|$)/i;
const SIDE_EFFECT_PARAMETERS = new Set([
  "_method",
  "action",
  "delete",
  "logout",
  "preview",
  "token",
]);

export function isEligiblePrefetch({
  currentUrl,
  href,
  target,
  download,
  external,
  nofollow,
  noPrefetch,
  saveData,
  effectiveType,
}: PrefetchCandidate): boolean {
  if (
    (target !== undefined && target !== "" && target !== "_self") ||
    download ||
    external ||
    nofollow ||
    noPrefetch ||
    saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g"
  ) {
    return false;
  }
  let current: URL;
  let candidate: URL;
  try {
    current = new URL(currentUrl);
    candidate = new URL(href, current);
  } catch {
    return false;
  }
  if (!(["http:", "https:"] as const).includes(candidate.protocol as "http:" | "https:")) {
    return false;
  }
  if (candidate.username || candidate.password || BLOCKED_PATH.test(candidate.pathname))
    return false;
  if (
    [...candidate.searchParams.keys()].some((key) => SIDE_EFFECT_PARAMETERS.has(key.toLowerCase()))
  ) {
    return false;
  }
  return (
    candidate.origin === current.origin &&
    !candidate.hash &&
    `${candidate.pathname}${candidate.search}` !== `${current.pathname}${current.search}`
  );
}

export function isPrefetchAllowedByConnection(connection?: NetworkConnection): boolean {
  return !(
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g"
  );
}

export function createPrefetchRule(urls: readonly string[]): Readonly<Record<string, unknown>> {
  return {
    prefetch: [{ source: "list", urls: [...new Set(urls)], eagerness: "conservative" }],
  };
}
