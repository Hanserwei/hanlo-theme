import { mkdirSync } from "node:fs";
import path from "node:path";
import { performance as nodePerformance } from "node:perf_hooks";

import { expect, test } from "@playwright/test";

const haloBaseUrl = process.env.HALO_BASE_URL;
const legacyNavigationHeaderPrefix = `x-${["p", "j", "a", "x"].join("")}`;
const baselineColdLcpMilliseconds = 296;
const baselineWarmNavigationMilliseconds = 195.9;
const evidenceRoot = path.resolve(
  process.env.HALO_EVIDENCE_ROOT ?? "test-results/halo-live-evidence",
);

const liveRoutes = [
  { id: "home", route: "/", selector: "#body-wrap", screenshot: true },
  {
    id: "post",
    route: "/archives/spring-boot-starter-api-request-logging-aspect",
    selector: "#article-container",
    screenshot: true,
  },
  { id: "page", route: "/privacy-policy", selector: "#body-wrap", screenshot: true },
  {
    id: "category",
    route: "/categories/spring-backend",
    selector: "#body-wrap",
    screenshot: true,
  },
  {
    id: "tag",
    route: "/tags/java",
    selector: "#body-wrap",
    screenshot: true,
  },
  { id: "comments", route: "/comments", selector: "#body-wrap", screenshot: true },
  { id: "newest", route: "/newest", selector: "#page", screenshot: true },
  { id: "about", route: "/about", selector: ".author-content", screenshot: true },
  { id: "album", route: "/album", selector: "#page", screenshot: true },
  { id: "moments", route: "/moments", selector: "#page", screenshot: false },
  { id: "photos", route: "/photos", selector: "#page", screenshot: false },
  { id: "bangumis", route: "/bangumis", selector: ".bangumi-tabs", screenshot: false },
  { id: "equipments", route: "/equipments", selector: "#page", screenshot: false },
] as const;

async function loadedThemeStyles(
  page: import("@playwright/test").Page,
  route: string,
): Promise<string[]> {
  const response = await page.goto(route, { waitUntil: "networkidle" });
  expect(response?.status(), `${route} should render successfully`).toBe(200);
  return page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map(({ name }) => new URL(name).pathname)
      .filter((pathname) => pathname.includes("/themes/theme-hanlo/assets/css/"))
      .map((pathname) => pathname.split("/").at(-1) ?? "")
      .map((filename) => filename.replace(/-\d+\.\d+\.\d+\.css$/, ""))
      .sort(),
  );
}

test("loads only the CSS entries eligible for each Halo route @live", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const expectedByRoute = new Map([
    ["/", ["full-page", "hanlo-theme", "profile-default", "shiki"]],
    [
      "/archives/spring-boot-starter-api-request-logging-aspect",
      ["hanlo-theme", "post-copyright", "profile-default", "related-posts-six", "shiki"],
    ],
    ["/album", ["album", "hanlo-theme", "shiki"]],
  ]);

  for (const [route, expected] of expectedByRoute) {
    expect([...new Set(await loadedThemeStyles(page, route))]).toEqual(expected);
  }
});

test("runs repeated native document and history navigation on Halo 2.26 @live", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const pageErrors: string[] = [];
  const documentRequests: import("@playwright/test").Request[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request);
  });
  await page.addInitScript(
    (theme) => {
      localStorage.setItem(
        "theme",
        JSON.stringify({ value: theme, expiry: Date.now() + 24 * 60 * 60 * 1_000 }),
      );
    },
    testInfo.project.name.endsWith("-dark") ? "dark" : "light",
  );
  await page.addInitScript(() => {
    const storageKey = "hanlo-live-lifecycle-events";
    const readEvents = (): HanloProbeEvent[] => {
      try {
        return JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      } catch {
        return [];
      }
    };
    window.__hanloLiveEvents = readEvents();
    for (const type of [
      "hanlo:page:initial",
      "hanlo:page:leave",
      "hanlo:page:destroy",
      "hanlo:page:restore",
      "hanlo:page:error",
    ]) {
      document.addEventListener(type, (event) => {
        const detail = (event as CustomEvent).detail;
        const events = readEvents();
        events.push({
          type,
          direction: detail.navigation.direction,
          source: detail.navigation.source,
          url: detail.navigation.url,
        });
        sessionStorage.setItem(storageKey, JSON.stringify(events));
        window.__hanloLiveEvents = events;
      });
    }
  });

  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.HanloLifecycle?.activeControllers))
    .toEqual(
      expect.arrayContaining([
        "theme-mode",
        "content-elements",
        "categories-3d",
        "site-shell",
        "translation",
        "page-widgets",
      ]),
    );
  expect(await page.evaluate(() => window.HanloLifecycle?.activeControllers)).not.toContain(
    "legacy-compatibility",
  );

  const routes = [
    "/archives/spring-boot-starter-api-request-logging-aspect",
    "/",
    "/privacy-policy",
    "/categories/spring-backend",
    "/tags/java",
    "/comments",
    "/",
    "/archives/spring-boot-starter-api-request-logging-aspect",
    "/privacy-policy",
    "/",
  ];

  for (const route of routes) {
    await page.evaluate((url) => {
      const link = document.createElement("a");
      link.id = "hanlo-live-navigation-target";
      link.href = url;
      link.dataset["noPrefetch"] = "";
      link.textContent = "Navigate";
      document.body.append(link);
    }, route);
    await Promise.all([
      page.waitForURL((url) => url.pathname === route),
      page.locator("#hanlo-live-navigation-target").evaluate((link) => {
        if (!(link instanceof HTMLAnchorElement)) throw new TypeError("Expected an anchor link.");
        link.click();
      }),
    ]);
    await expect
      .poll(() => page.evaluate(() => (window.HanloLifecycle?.activeControllers.length ?? 0) > 0))
      .toBe(true);
    await page.evaluate(() => window.HanloLifecycle?.whenIdle());
    await page.waitForTimeout(250);
    expect(await page.locator("#nav").count()).toBe(1);
    expect(await page.locator("#body-wrap").count()).toBe(1);
    expect(await page.evaluate(() => Object.isFrozen(window.GLOBAL_CONFIG))).toBe(true);
  }

  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  await page.goForward({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());

  const events = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("hanlo-live-lifecycle-events") ?? "[]"),
  );
  const arrivals = events.filter(({ type }: HanloProbeEvent) =>
    ["hanlo:page:initial", "hanlo:page:restore"].includes(type),
  );
  expect(arrivals.length).toBeGreaterThanOrEqual(13);
  expect(events.filter(({ type }: HanloProbeEvent) => type === "hanlo:page:enter")).toEqual([]);
  expect(events.filter(({ type }: HanloProbeEvent) => type === "hanlo:page:error")).toEqual([]);
  expect(documentRequests.length).toBeGreaterThanOrEqual(11);
  expect(
    documentRequests.some((request) =>
      Object.keys(request.headers()).some((name) =>
        name.toLowerCase().startsWith(legacyNavigationHeaderPrefix),
      ),
    ),
  ).toBe(false);
  expect(pageErrors).toEqual([]);
});

test("keeps the article card surface linked to a native document navigation @live", async ({
  page,
}, testInfo) => {
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");
  test.skip(
    testInfo.project.name !== "chromium-desktop-light",
    "One fixed desktop project verifies the stretched-link hit target.",
  );

  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  const card = page.locator("#recent-posts > .recent-post-item").first();
  await card.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const target = await card.locator(".hanlo-stretched-link").getAttribute("href");
  const targetUrl = new URL(target ?? "", haloBaseUrl);
  const informationBox = await card.locator(".recent-post-info").boundingBox();
  if (!informationBox) throw new Error("The article card information surface is not visible.");
  const point = {
    x: informationBox.x + informationBox.width * 0.7,
    y: informationBox.y + informationBox.height * 0.6,
  };
  expect(
    await page.evaluate(
      ({ x, y, href }) => document.elementFromPoint(x, y)?.closest("a")?.href === href,
      { ...point, href: targetUrl.href },
    ),
  ).toBe(true);

  const requestPromise = page.waitForRequest(
    (request) =>
      request.resourceType() === "document" &&
      new URL(request.url()).pathname === targetUrl.pathname,
  );
  await Promise.all([
    page.waitForURL((url) => url.pathname === targetUrl.pathname),
    page.mouse.click(point.x, point.y),
  ]);
  const request = await requestPromise;
  expect(
    Object.keys(request.headers()).some((name) =>
      name.toLowerCase().startsWith(legacyNavigationHeaderPrefix),
    ),
  ).toBe(false);
});

test("covers reported home, comments, envelope, moments, and about regressions @live", async ({
  page,
}) => {
  test.setTimeout(120_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const navigate = async (route: string): Promise<void> => {
    await page.evaluate((url) => {
      const link = document.createElement("a");
      link.id = "hanlo-live-regression-target";
      link.href = url;
      link.dataset["noPrefetch"] = "";
      link.textContent = "Navigate";
      document.body.append(link);
    }, route);
    await Promise.all([
      page.waitForURL((url) => url.pathname === route),
      page.locator("#hanlo-live-regression-target").evaluate((link) => {
        if (!(link instanceof HTMLAnchorElement)) throw new TypeError("Expected an anchor link.");
        link.click();
      }),
    ]);
    await expect
      .poll(() => page.evaluate(() => (window.HanloLifecycle?.activeControllers.length ?? 0) > 0))
      .toBe(true);
    await page.evaluate(() => window.HanloLifecycle?.whenIdle());
    await page.waitForTimeout(250);
  };
  const themeStyleNames = () =>
    page.evaluate(() =>
      Array.from(document.styleSheets)
        .map((sheet) => sheet.href)
        .filter((href): href is string => Boolean(href))
        .map((href) => new URL(href).pathname.split("/").at(-1) ?? ""),
    );

  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  expect(
    await page.locator(".hanlo-moment-swiper").evaluate((element) => element.clientHeight),
  ).toBe(25);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(20_000);

  const albumResponse = await page.goto("/album", { waitUntil: "domcontentloaded" });
  expect(albumResponse?.status()).toBe(200);
  await expect
    .poll(() => page.evaluate(() => (window.HanloLifecycle?.activeControllers.length ?? 0) > 0))
    .toBe(true);
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          document
            .querySelector('#post-comment div[id^="comment-"]')
            ?.scrollIntoView({ block: "center" }),
        );
        await page.waitForTimeout(100);
        return page.locator("#post-comment comment-widget").count();
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  await expect.poll(themeStyleNames).toContainEqual(expect.stringMatching(/^album-/));

  await navigate("/comments");
  await expect.poll(themeStyleNames).toContainEqual(expect.stringMatching(/^comments-envelope-/));
  if ((page.viewportSize()?.width ?? 0) >= 600) {
    await expect(page.locator("#form-wrap")).toHaveCSS("overflow", "hidden");
  } else {
    await expect(page.locator("#beforeimg")).toBeHidden();
    await expect(page.locator("#afterimg")).toBeHidden();
  }

  await navigate("/about");
  await expect.poll(themeStyleNames).toContainEqual(expect.stringMatching(/^ten-year-/));
  await expect(page.locator(".timeline")).toHaveCSS("position", "relative");
  if ((page.viewportSize()?.width ?? 0) < 600) {
    const aboutWidths = await page.evaluate(() => ({
      cards: Array.from(
        document.querySelectorAll<HTMLElement>(".hanlo-about-page .author-content-item"),
        (card) => card.getBoundingClientRect().width,
      ),
      viewport: document.documentElement.clientWidth,
    }));
    expect(aboutWidths.cards.length).toBeGreaterThan(0);
    expect(aboutWidths.cards.every((width) => width >= aboutWidths.viewport * 0.9)).toBe(true);
  }

  const momentsResponse = await page.goto("/moments", { waitUntil: "domcontentloaded" });
  expect(momentsResponse?.status()).toBe(200);
  await expect
    .poll(() => page.evaluate(() => (window.HanloLifecycle?.activeControllers.length ?? 0) > 0))
    .toBe(true);
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  await expect.poll(themeStyleNames).not.toContainEqual(expect.stringMatching(/^ten-year-/));
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("#waterfall")?.classList.contains("show")),
    )
    .toBe(true);
  const measureWaterfall = () =>
    page.locator("#waterfall").evaluate((element) => {
      const items = Array.from(element.children).filter(
        (item): item is HTMLElement => item instanceof HTMLElement,
      );
      return {
        height: (element as HTMLElement).offsetHeight,
        requiredHeight: Math.max(
          ...items.map(
            (item) =>
              item.offsetTop +
              item.offsetHeight +
              (Number.parseFloat(getComputedStyle(item).marginBottom) || 0),
          ),
        ),
        contentFits: items.every((item) => {
          const content = item.querySelector<HTMLElement>(".datacont");
          return !content || content.scrollWidth <= content.clientWidth;
        }),
      };
    });
  await expect
    .poll(async () => {
      const { height, requiredHeight } = await measureWaterfall();
      return height >= requiredHeight - 1;
    })
    .toBe(true);
  const waterfall = await measureWaterfall();
  expect(waterfall.height).toBeGreaterThanOrEqual(waterfall.requiredHeight - 1);
  expect(waterfall.contentFits).toBe(true);
});

test("renders the fixed Halo page matrix without theme runtime errors @live", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const mode = testInfo.project.name.endsWith("-dark") ? "dark" : "light";
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedThemeRequests: string[] = [];
  const badThemeResponses: string[] = [];
  const badLocalResponses: string[] = [];
  const forbiddenLegacyRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(`${message.text()}${location.url ? ` @ ${location.url}` : ""}`);
    }
  });
  page.on("request", (request) => {
    if (/\/assets\/libs\/|jquery|fancybox|vue(?:\.min)?\.js/i.test(request.url())) {
      forbiddenLegacyRequests.push(request.url());
    }
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname.startsWith("/themes/theme-hanlo/")) {
      failedThemeRequests.push(`${request.url()} — ${request.failure()?.errorText ?? "failed"}`);
    }
  });
  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (response.status() >= 400 && responseUrl.origin === new URL(haloBaseUrl!).origin) {
      badLocalResponses.push(`${response.status()} ${response.url()}`);
    }
    if (response.status() >= 400 && responseUrl.pathname.startsWith("/themes/theme-hanlo/")) {
      badThemeResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript((themeMode) => {
    localStorage.setItem(
      "theme",
      JSON.stringify({ value: themeMode, expiry: Date.now() + 24 * 60 * 60 * 1_000 }),
    );
  }, mode);
  mkdirSync(evidenceRoot, { recursive: true });

  for (const item of liveRoutes) {
    const response = await page.goto(item.route, { waitUntil: "networkidle" });
    expect(response?.status(), `${item.route} should render successfully`).toBe(200);
    await expect(page.locator(item.selector).first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.HanloLifecycle?.activeControllers))
      .not.toEqual([]);
    await page.evaluate(() => window.HanloLifecycle?.whenIdle());
    expect(await page.locator("#nav").count()).toBe(1);
    expect(await page.locator("#body-wrap").count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
    expect(await page.evaluate(() => Object.isFrozen(window.GLOBAL_CONFIG))).toBe(true);

    if (viewport === "mobile") {
      const layout = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const content = document.querySelector<HTMLElement>("#content-inner > :first-child");
        const originalX = window.scrollX;
        const originalY = window.scrollY;
        window.scrollTo(document.documentElement.scrollWidth, originalY);
        const horizontalScroll = window.scrollX;
        window.scrollTo(originalX, originalY);
        return {
          contentWidth: content?.getBoundingClientRect().width ?? viewportWidth,
          horizontalScroll,
          viewportWidth,
        };
      });
      expect(layout.contentWidth).toBeGreaterThanOrEqual(layout.viewportWidth * 0.9);
      expect(layout.horizontalScroll).toBeLessThanOrEqual(1);
    }

    if (item.screenshot) {
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidenceRoot, `phase6-live__P-${item.id}__${viewport}__${mode}.png`),
        type: "png",
      });
    }
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedThemeRequests).toEqual([]);
  expect(badThemeResponses).toEqual([]);
  expect(badLocalResponses).toEqual([]);
  expect(forbiddenLegacyRequests).toEqual([]);
});

test("meets cold-load and warm native-navigation performance budgets @live", async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");
  test.skip(
    testInfo.project.name !== "chromium-desktop-light",
    "Performance budgets use one fixed Chromium desktop environment.",
  );

  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.addInitScript(() => {
    window.__hanloPerformance = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) window.__hanloPerformance.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          "hadRecentInput" in entry &&
          entry.hadRecentInput === false &&
          "value" in entry &&
          typeof entry.value === "number"
        ) {
          window.__hanloPerformance.cls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const coldSamples: Array<{ cls: number; lcp: number }> = [];
  for (let index = 0; index < 3; index++) {
    await page.goto(`/?performance_run=${index}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_500);
    coldSamples.push(await page.evaluate(() => window.__hanloPerformance));
  }
  const medianCls = [...coldSamples].sort((left, right) => left.cls - right.cls)[1]!.cls;
  const medianLcp = [...coldSamples].sort((left, right) => left.lcp - right.lcp)[1]!.lcp;
  expect(medianCls).toBeLessThanOrEqual(0.1);
  expect(medianLcp).toBeGreaterThan(0);
  expect(medianLcp).toBeLessThanOrEqual(baselineColdLcpMilliseconds * 1.05);

  await session.send("Network.setCacheDisabled", { cacheDisabled: false });
  const postRoute = "/archives/spring-boot-starter-api-request-logging-aspect";
  await page.goto(postRoute, { waitUntil: "networkidle" });
  await page.goto("/", { waitUntil: "networkidle" });

  const durations: number[] = [];
  const documents: import("@playwright/test").Request[] = [];
  const trackersByDocument = new Map<number, number>();
  let documentGeneration = 0;
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentGeneration += 1;
      documents.push(request);
    }
    if (request.method() === "POST" && request.url().includes("/trackers/counter")) {
      trackersByDocument.set(
        documentGeneration,
        (trackersByDocument.get(documentGeneration) ?? 0) + 1,
      );
    }
  });

  for (let index = 0; index < 10; index++) {
    const route = index % 2 === 0 ? postRoute : "/";
    await page.evaluate((url) => {
      const link = document.createElement("a");
      link.id = "hanlo-performance-target";
      link.href = url;
      link.dataset["noPrefetch"] = "";
      document.body.append(link);
    }, route);
    const startedAt = nodePerformance.now();
    await Promise.all([
      page.waitForURL((url) => url.pathname === route),
      page.locator("#hanlo-performance-target").evaluate((link) => {
        if (!(link instanceof HTMLAnchorElement)) throw new TypeError("Expected an anchor link.");
        link.click();
      }),
    ]);
    await expect
      .poll(() => page.evaluate(() => (window.HanloLifecycle?.activeControllers.length ?? 0) > 0))
      .toBe(true);
    await page.evaluate(() => window.HanloLifecycle?.whenIdle());
    durations.push(nodePerformance.now() - startedAt);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(500);

  const sortedDurations = [...durations].sort((left, right) => left - right);
  const median = (sortedDurations[4]! + sortedDurations[5]!) / 2;
  expect(median).toBeLessThanOrEqual(baselineWarmNavigationMilliseconds + 250);
  expect(documents).toHaveLength(10);
  expect(
    documents.some((request) =>
      Object.keys(request.headers()).some((name) =>
        name.toLowerCase().startsWith(legacyNavigationHeaderPrefix),
      ),
    ),
  ).toBe(false);
  expect([...trackersByDocument.values()].every((count) => count <= 1)).toBe(true);

  const coreTransfers = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry instanceof PerformanceResourceTiming &&
          /hanlo-theme|hanlo-runtime|build-entry/.test(entry.name),
      )
      .map(({ transferSize }) => transferSize),
  );
  expect(coreTransfers.length).toBeGreaterThan(0);
  expect(coreTransfers.every((transferSize) => transferSize === 0)).toBe(true);
});
