import { expect, test } from "@playwright/test";

const haloBaseUrl = process.env.HALO_BASE_URL;

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
    .toEqual(["legacy-compatibility"]);

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
