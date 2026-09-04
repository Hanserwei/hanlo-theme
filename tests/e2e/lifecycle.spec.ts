import { expect, test, type Page, type Request } from "@playwright/test";

const pageOne = "/tests/e2e/fixtures/page-one.html";
const pageTwo = "/tests/e2e/fixtures/page-two.html";
const legacyNavigationHeaderPrefix = `x-${["p", "j", "a", "x"].join("")}`;

interface StoredProbeEvent {
  readonly type: string;
}

async function waitForLifecycle(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.HanloLifecycle?.activeControllers.includes("e2e-probe") ||
          document.documentElement.dataset["hanloSetupError"] !== undefined,
      ),
    )
    .toBe(true);
  const setupError = await page.locator("html").getAttribute("data-hanlo-setup-error");
  expect(setupError).toBeNull();
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  await page.waitForTimeout(250);
}

async function followLink(page: Page, selector: string, destination: string): Promise<void> {
  await Promise.all([
    page.waitForURL(`**${destination}`),
    page.locator(selector).evaluate((link) => {
      if (!(link instanceof HTMLAnchorElement)) throw new TypeError("Expected an anchor link.");
      link.click();
    }),
  ]);
  await waitForLifecycle(page);
}

function isFixtureDocument(request: Request): boolean {
  return (
    request.resourceType() === "document" &&
    /\/tests\/e2e\/fixtures\/page-(?:one|two)\.html$/.test(new URL(request.url()).pathname)
  );
}

test("performs ten native document navigations without legacy partial requests", async ({
  page,
}) => {
  const documentRequests: Request[] = [];
  const xhrDocuments: Request[] = [];
  page.on("request", (request) => {
    if (isFixtureDocument(request)) documentRequests.push(request);
    if (
      request.resourceType() === "xhr" &&
      /\/tests\/e2e\/fixtures\/page-(?:one|two)\.html$/.test(new URL(request.url()).pathname)
    ) {
      xhrDocuments.push(request);
    }
  });

  await page.goto(pageOne);
  await waitForLifecycle(page);

  for (let index = 0; index < 10; index++) {
    const onFirstPage = index % 2 === 0;
    await followLink(
      page,
      onFirstPage ? "#next-page" : "#previous-page",
      onFirstPage ? pageTwo : pageOne,
    );
    await page.evaluate(() => document.dispatchEvent(new Event("hanlo:e2e:probe")));
    expect(await page.locator("#body-wrap").count()).toBe(1);
    expect(await page.evaluate(() => window.__hanloCurrentMounts)).toBe(1);
    expect(await page.evaluate(() => new Set(window.HanloLifecycle?.activeControllers).size)).toBe(
      await page.evaluate(() => window.HanloLifecycle?.activeControllers.length),
    );
  }

  const probe = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("hanlo-e2e-probe") ?? "null"),
  );
  expect(documentRequests).toHaveLength(11);
  expect(xhrDocuments).toEqual([]);
  expect(
    documentRequests.some((request) =>
      Object.keys(request.headers()).some((name) =>
        name.toLowerCase().startsWith(legacyNavigationHeaderPrefix),
      ),
    ),
  ).toBe(false);
  expect(probe.documents).toBe(11);
  expect(probe.clicks).toBe(10);
  expect(
    probe.events.filter(({ type }: StoredProbeEvent) => type === "hanlo:page:initial"),
  ).toHaveLength(11);
  expect(probe.events.filter(({ type }: StoredProbeEvent) => type === "hanlo:page:error")).toEqual(
    [],
  );
});

test("uses native history and models a persisted BFCache restore without remounting", async ({
  page,
}) => {
  await page.goto(pageOne);
  await waitForLifecycle(page);
  await followLink(page, "#next-page", pageTwo);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`${pageOne.replaceAll(".", "\\.")}$`));
  await waitForLifecycle(page);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`${pageTwo.replaceAll(".", "\\.")}$`));
  await waitForLifecycle(page);

  const mountsBeforeRestore = await page.evaluate(() => window.__hanloCurrentMounts);
  // Headless automation does not reliably admit pages to BFCache; exercise the persisted-event
  // state transition here, while headed Chrome evidence verifies a real browser restoration.
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })),
  );
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  const state = await page.evaluate(() => ({
    mounts: window.__hanloCurrentMounts,
    events: JSON.parse(sessionStorage.getItem("hanlo-e2e-probe") ?? "null").events,
  }));

  expect(state.mounts).toBe(mountsBeforeRestore);
  expect(state.events.at(-1)).toMatchObject({ type: "hanlo:page:restore", source: "history" });
});

test("lets complete documents own head metadata, route styles and module execution", async ({
  page,
}) => {
  const pageResource = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--hanlo-e2e-page-resource")
        .trim(),
    );

  await page.goto(pageOne);
  await waitForLifecycle(page);
  await expect.poll(pageResource).toBe("one");
  await expect(page.locator("html")).toHaveAttribute("data-document", "one");
  await expect(page.locator("html")).toHaveAttribute("data-hanlo-module-page", "one");
  await expect(page.locator("html")).toHaveAttribute("data-hanlo-module-executions", "1");

  await followLink(page, "#next-page", pageTwo);
  await expect.poll(pageResource).toBe("two");
  await expect(page).toHaveTitle("Lifecycle page two");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /page-two\.html$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Lifecycle page two",
  );
  await expect(page.locator("html")).toHaveAttribute("data-document", "two");
  await expect(page.locator("html")).toHaveAttribute("data-hanlo-module-page", "two");
  await expect(page.locator("html")).toHaveAttribute("data-hanlo-module-executions", "1");
  await expect(page.locator("link[data-hanlo-page-style]")).toHaveCount(1);
});

test("installs conservative prefetch as a progressive enhancement", async ({ page }) => {
  await page.goto(pageOne);
  await waitForLifecycle(page);

  const supportsSpeculationRules = await page.evaluate(
    () =>
      typeof HTMLScriptElement.supports === "function" &&
      HTMLScriptElement.supports("speculationrules"),
  );
  if (supportsSpeculationRules) {
    const rule = await page
      .locator('script[type="speculationrules"][data-hanlo-prefetch="conservative"]')
      .textContent();
    expect(rule).not.toContain("prerender");
    expect(JSON.parse(rule ?? "{}")).toEqual({
      prefetch: [
        {
          source: "list",
          urls: [expect.stringContaining(`${pageTwo}?from=prefetch`)],
          eagerness: "conservative",
        },
      ],
    });
  } else {
    await page.locator("#prefetch-candidate").dispatchEvent("pointerdown");
    const href = await page
      .locator('link[rel="prefetch"][data-hanlo-prefetch="fallback"]')
      .getAttribute("href");
    const url = new URL(href ?? "", "http://127.0.0.1:4173");
    expect(`${url.pathname}${url.search}`).toBe(`${pageTwo}?from=prefetch`);
  }
});

test("enables a root document transition with a reduced-motion fallback", async ({
  page,
}, testInfo) => {
  await page.goto(pageOne);
  await waitForLifecycle(page);

  const transition = await page.evaluate(() => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules, (rule) => rule.cssText);
      } catch {
        return [];
      }
    });
    return {
      duration: rules.some(
        (rule) =>
          rule.includes("::view-transition-group(root)") &&
          (rule.includes("animation-duration: 0.2s") || rule.includes("animation-duration: 200ms")),
      ),
      optIn: rules.some(
        (rule) => rule.includes("@view-transition") && rule.includes("navigation: auto"),
      ),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      reducedRule: rules.some(
        (rule) =>
          rule.includes("prefers-reduced-motion: reduce") &&
          rule.includes("::view-transition-old(root)"),
      ),
    };
  });

  if (/^(?:chromium|webkit)/.test(testInfo.project.name)) {
    expect(transition).toMatchObject({ duration: true, optIn: true });
  }
  expect(transition.reducedRule).toBe(true);
  expect(transition.reducedMotion).toBe(testInfo.project.name === "chromium-reduced-motion");
});

test("activates cross-document transitions where the browser supports them", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    for (const type of ["pageswap", "pagereveal"]) {
      window.addEventListener(type, (event) => {
        const events = JSON.parse(sessionStorage.getItem("hanlo-view-transition-events") ?? "[]");
        events.push({
          type,
          hasTransition: "viewTransition" in event && Boolean(event.viewTransition),
        });
        sessionStorage.setItem("hanlo-view-transition-events", JSON.stringify(events));
      });
    }
  });

  await page.goto(pageOne);
  await waitForLifecycle(page);
  await followLink(page, "#next-page", pageTwo);
  const events: Array<{ type: string; hasTransition: boolean }> = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("hanlo-view-transition-events") ?? "[]"),
  );

  if (/^(?:chromium|webkit)/.test(testInfo.project.name)) {
    expect(events).toContainEqual({ type: "pageswap", hasTransition: true });
  } else {
    expect(events).toEqual([]);
  }
});

test("keeps same-document hashes, downloads and new tabs native", async ({ page }) => {
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documents.push(request.url());
  });
  await page.goto(pageOne);
  await waitForLifecycle(page);
  const documentsAfterLoad = documents.length;

  await page.locator("#hash-link").click();
  await expect(page).toHaveURL(/page-one\.html#hash-target$/);
  expect(documents).toHaveLength(documentsAfterLoad);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-file").click();
  expect((await downloadPromise).suggestedFilename()).toBe("config.js");

  const popupPromise = page.waitForEvent("popup");
  await page.locator("#new-tab").click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(new RegExp(`${pageTwo.replaceAll(".", "\\.")}$`));
  await popup.close();
  await expect(page).toHaveURL(/page-one\.html#hash-target$/);
});

test("renders HTTP failures as native document responses", async ({ page }) => {
  let requestType = "";
  await page.route("**/tests/e2e/fixtures/missing.html", async (route) => {
    requestType = route.request().resourceType();
    await route.fulfill({
      status: 500,
      contentType: "text/html",
      body: "<!doctype html><title>Native error</title><h1 id='native-error'>Native error</h1>",
    });
  });

  await page.goto(pageOne);
  await waitForLifecycle(page);
  const responsePromise = page.waitForResponse("**/tests/e2e/fixtures/missing.html");
  await Promise.all([
    page.waitForURL("**/tests/e2e/fixtures/missing.html"),
    page.locator("#broken-page").click(),
  ]);
  const response = await responsePromise;

  expect(requestType).toBe("document");
  expect(response.status()).toBe(500);
  await expect(page.locator("#native-error")).toHaveText("Native error");
});

test("does not block document navigation while an optional request is pending", async ({
  page,
}) => {
  let releaseRequest: (() => void) | undefined;
  let markRequestStarted: (() => void) | undefined;
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/friends**", async (route) => {
    markRequestStarted?.();
    await requestGate;
    await route.abort().catch(() => undefined);
  });

  await page.goto(pageOne);
  await requestStarted;
  await waitForLifecycle(page);
  await Promise.all([page.waitForURL(`**${pageTwo}`), page.locator("#next-page").click()]);
  releaseRequest?.();
  await waitForLifecycle(page);
  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "two");
});
