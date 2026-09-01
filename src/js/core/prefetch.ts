export interface PrefetchCandidate {
  readonly currentUrl: string;
  readonly href: string;
  readonly target?: string;
  readonly download?: boolean;
  readonly external?: boolean;
  readonly noPrefetch?: boolean;
}

export function isEligiblePrefetch({
  currentUrl,
  href,
  target,
  download,
  external,
  noPrefetch,
}: PrefetchCandidate): boolean {
  if (target === "_blank" || download || external || noPrefetch) return false;
  const current = new URL(currentUrl);
  const candidate = new URL(href, current);
  return (
    candidate.origin === current.origin &&
    !candidate.hash &&
    candidate.pathname !== current.pathname
  );
}
