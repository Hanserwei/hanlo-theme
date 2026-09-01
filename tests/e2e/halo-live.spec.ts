import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const haloBaseUrl = process.env.HALO_BASE_URL;
const evidenceRoot = path.resolve("docs/modernization/phase-3/evidence/live");

const liveRoutes = [
  { id: "home", route: "/", selector: "#body-wrap", screenshot: true },
  {
    id: "post",
    route: "/archives/react-dui-zhao-su-cheng-wen-dang",
    selector: "#article-container",
    screenshot: true,
  },
  { id: "page", route: "/bi-ji", selector: "#body-wrap", screenshot: true },
  {
    id: "category",
    route: "/categories/javamian-xiang-dui-xiang",
    selector: "#body-wrap",
    screenshot: true,
  },
  {
    id: "tag",
    route: "/tags/source-code-analysis",
    selector: "#body-wrap",
    screenshot: true,
  },
  { id: "comments", route: "/liu-yan-ban", selector: "#body-wrap", screenshot: true },
  { id: "newest", route: "/newest", selector: "#page", screenshot: true },
  { id: "about", route: "/about", selector: ".author-content", screenshot: true },
  { id: "album", route: "/album", selector: "#page", screenshot: true },
  { id: "moments", route: "/moments", selector: "#page", screenshot: false },
  { id: "photos", route: "/photos", selector: "#page", screenshot: false },
  { id: "bangumis", route: "/bangumis", selector: ".bangumi-tabs", screenshot: false },
  { id: "equipments", route: "/equipments", selector: "#page", screenshot: false },
] as const;

test("runs repeated PJAX and history navigation on Halo 2.26 @live", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  await page.addInitScript(
    (theme) => {
      localStorage.setItem(
        "theme",
        JSON.stringify({ value: theme, expiry: Date.now() + 24 * 60 * 60 * 1_000 }),
      );
    },
    testInfo.project.name.includes("mobile") ? "dark" : "light",
  );
  await page.addInitScript(() => {
    window.__hanloLiveEvents = [];
    for (const type of [
      "hanlo:page:initial",
      "hanlo:page:leave",
      "hanlo:page:destroy",
      "hanlo:page:enter",
      "hanlo:page:error",
    ]) {
      document.addEventListener(type, (event) => {
        const detail = (event as CustomEvent).detail;
        window.__hanloLiveEvents.push({
          type,
          direction: detail.navigation.direction,
          source: detail.navigation.source,
          url: detail.navigation.url,
        });
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
        "site-shell",
        "translation",
        "page-widgets",
      ]),
    );
  expect(await page.evaluate(() => window.HanloLifecycle?.activeControllers)).not.toContain(
    "legacy-compatibility",
  );

  const routes = [
    "/archives/react-dui-zhao-su-cheng-wen-dang",
    "/",
    "/bi-ji",
    "/categories/javamian-xiang-dui-xiang",
    "/tags/source-code-analysis",
    "/liu-yan-ban",
    "/",
    "/archives/react-dui-zhao-su-cheng-wen-dang",
    "/bi-ji",
    "/",
  ];

  for (const route of routes) {
    await page.evaluate(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error(`Timed out waiting for PJAX navigation to ${url}.`)),
            10_000,
          );
          document.addEventListener(
            "hanlo:page:enter",
            () => {
              window.clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          window.pjax?.loadUrl(url);
        }),
      route,
    );
    await page.evaluate(() => window.HanloLifecycle?.whenIdle());
    expect(await page.locator("#nav").count()).toBe(1);
    expect(await page.locator("#body-wrap").count()).toBe(1);
    expect(await page.evaluate(() => Object.isFrozen(window.GLOBAL_CONFIG))).toBe(true);
  }

  for (const direction of ["back", "forward"] as const) {
    await page.evaluate(
      (historyDirection) =>
        new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(
            () => reject(new Error(`Timed out waiting for history ${historyDirection}.`)),
            10_000,
          );
          document.addEventListener(
            "hanlo:page:enter",
            () => {
              window.clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          window.history[historyDirection]();
        }),
      direction,
    );
  }

  const events = await page.evaluate(() => window.__hanloLiveEvents);
  expect(events.filter(({ type }) => type === "hanlo:page:initial")).toHaveLength(1);
  expect(events.filter(({ type }) => type === "hanlo:page:enter")).toHaveLength(12);
  expect(
    events.filter(({ type, source }) => type === "hanlo:page:enter" && source === "history"),
  ).toHaveLength(2);
  expect(
    events
      .filter(({ type, source }) => type === "hanlo:page:enter" && source === "history")
      .map(({ direction }) => direction),
  ).toEqual(["backward", "forward"]);
  expect(events.filter(({ type }) => type === "hanlo:page:error")).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("renders the fixed Halo page matrix without theme runtime errors @live", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  test.skip(!haloBaseUrl, "Set HALO_BASE_URL to run against a compatible Halo instance.");

  const mode = testInfo.project.name.includes("mobile") ? "dark" : "light";
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedThemeRequests: string[] = [];
  const badThemeResponses: string[] = [];
  const badLocalResponses: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(`${message.text()}${location.url ? ` @ ${location.url}` : ""}`);
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
    const response = await page.goto(item.route, { waitUntil: "domcontentloaded" });
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

    if (item.screenshot) {
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidenceRoot, `phase3-live__P-${item.id}__${viewport}__${mode}.png`),
      });
    }
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedThemeRequests).toEqual([]);
  expect(badThemeResponses).toEqual([]);
  expect(badLocalResponses).toEqual([]);
});
