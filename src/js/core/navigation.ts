import {
  createPrefetchRule,
  isEligiblePrefetch,
  isPrefetchAllowedByConnection,
  type NetworkConnection,
} from "./prefetch";

export interface NavigateOptions {
  readonly replace?: boolean;
}

export interface LocationNavigator {
  readonly href: string;
  assign(url: string): void;
  replace(url: string): void;
}

export function resolveHttpUrl(url: string, base?: string | URL): URL | undefined {
  try {
    const resolved = base === undefined ? new URL(url) : new URL(url, base);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved : undefined;
  } catch {
    return undefined;
  }
}

export function openExternalUrl(url: string, base = window.location.href): boolean {
  const resolvedUrl = resolveHttpUrl(url, base);
  if (!resolvedUrl) return false;
  const link = document.createElement("a");
  link.href = resolvedUrl.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer external";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  return true;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkConnection;
}

/** Perform a normal document navigation without fetching or replacing DOM in JavaScript. */
export function navigateTo(
  url: string,
  options: NavigateOptions = {},
  locationObject: LocationNavigator = window.location,
): void {
  const currentUrl = resolveHttpUrl(locationObject.href);
  const resolvedUrl = currentUrl && resolveHttpUrl(url, currentUrl);
  if (!currentUrl || !resolvedUrl || resolvedUrl.origin !== currentUrl.origin) {
    throw new TypeError("Document navigation requires a same-origin HTTP(S) URL.");
  }
  if (options.replace) locationObject.replace(resolvedUrl.href);
  else locationObject.assign(resolvedUrl.href);
}

function eligibleLink(target: EventTarget | null): HTMLAnchorElement | undefined {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link) return undefined;
  const rel = new Set(link.rel.split(/\s+/).filter(Boolean));
  const connection = (navigator as NavigatorWithConnection).connection;
  return isEligiblePrefetch({
    currentUrl: window.location.href,
    href: link.href,
    target: link.target,
    download: link.hasAttribute("download"),
    external: rel.has("external"),
    nofollow: rel.has("nofollow"),
    noPrefetch: link.dataset["noPrefetch"] !== undefined,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
  })
    ? link
    : undefined;
}

function eligibleDocumentUrls(): string[] {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    if (eligibleLink(link)) urls.add(link.href);
  });
  return [...urls];
}

function supportsSpeculationRules(): boolean {
  return (
    typeof HTMLScriptElement.supports === "function" &&
    HTMLScriptElement.supports("speculationrules")
  );
}

function installSpeculationRules(urls: readonly string[]): void {
  const script = document.createElement("script");
  script.type = "speculationrules";
  script.dataset["hanloPrefetch"] = "conservative";
  script.textContent = JSON.stringify(createPrefetchRule(urls));
  document.head.append(script);
}

function installFallbackPrefetch(): void {
  const prefetched = new Set<string>();
  const prefetch = (target: EventTarget | null): void => {
    const link = eligibleLink(target);
    if (!link || prefetched.has(link.href)) return;
    prefetched.add(link.href);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = link.href;
    hint.dataset["hanloPrefetch"] = "fallback";
    document.head.append(hint);
  };

  document.addEventListener("pointerdown", (event) => prefetch(event.target), { passive: true });
  document.addEventListener("focusin", (event) => prefetch(event.target), { passive: true });
}

/** Add optional, conservative document hints; navigation correctness never depends on them. */
export function installDocumentPrefetch(): void {
  const connection = (navigator as NavigatorWithConnection).connection;
  if (!isPrefetchAllowedByConnection(connection)) return;
  const urls = eligibleDocumentUrls();
  if (urls.length === 0) return;
  if (supportsSpeculationRules()) installSpeculationRules(urls);
  else installFallbackPrefetch();
}
