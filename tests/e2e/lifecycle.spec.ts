import { expect, test } from "@playwright/test";

const pageOne = "/tests/e2e/fixtures/page-one.html";

async function waitForLifecycle(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(() => window.HanloLifecycle?.activeControllers.includes("e2e-probe"));
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
}

test("serializes consecutive PJAX and history navigations without resource leaks", async ({
  page,
}) => {
  await page.goto(pageOne);
  await waitForLifecycle(page);

  await page.evaluate(() => document.dispatchEvent(new Event("hanlo:e2e:probe")));
  await page.locator("#next-page").click();
  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "two");
  await waitForLifecycle(page);
  expect(await page.evaluate(() => window.__newPageDestroyCount)).toBe(0);
  await page.evaluate(() => document.dispatchEvent(new Event("hanlo:e2e:probe")));

  await page.goBack();
  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "one");
  await waitForLifecycle(page);
  expect(await page.evaluate(() => window.__newPageDestroyCount)).toBe(0);
  await page.evaluate(() => document.dispatchEvent(new Event("hanlo:e2e:probe")));

  await page.goForward();
  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "two");
  await waitForLifecycle(page);
  expect(await page.evaluate(() => window.__newPageDestroyCount)).toBe(0);
  await page.evaluate(() => document.dispatchEvent(new Event("hanlo:e2e:probe")));

  const result = await page.evaluate(() => ({
    active: window.HanloLifecycle?.activeControllers,
    configFrozen: Object.isFrozen(window.GLOBAL_CONFIG),
    lazyloadFrozen: Object.isFrozen(window.GLOBAL_CONFIG.lazyload),
    configType: window.HanloLifecycle?.config.htmlType,
    probe: window.__hanloProbe,
  }));

  expect(result.active).toEqual([
    "theme-mode",
    "content-elements",
    "categories-3d",
    "site-shell",
    "translation",
    "page-widgets",
    "e2e-probe",
  ]);
  expect(result.configFrozen).toBe(true);
  expect(result.lazyloadFrozen).toBe(true);
  expect(result.configType).toBe("page-two");
  expect(result.probe.clicks).toBe(4);
  expect(result.probe.mounts).toBe(4);
  expect(result.probe.unmounts).toBe(3);
  expect(result.probe.cleanups).toBe(3);
  expect(result.probe.observerDisconnects).toBe(3);
  expect(result.probe.events.filter(({ type }) => type === "hanlo:page:initial")).toHaveLength(1);
  expect(
    result.probe.events.filter(
      ({ type, source }) => type === "hanlo:page:enter" && source === "history",
    ),
  ).toHaveLength(2);
  expect(result.probe.events.map(({ type }) => type)).toEqual([
    "hanlo:page:initial",
    "hanlo:page:leave",
    "hanlo:page:destroy",
    "hanlo:page:enter",
    "hanlo:page:leave",
    "hanlo:page:destroy",
    "hanlo:page:enter",
    "hanlo:page:leave",
    "hanlo:page:destroy",
    "hanlo:page:enter",
  ]);
  expect(
    result.probe.events
      .filter(({ type, source }) => type === "hanlo:page:enter" && source === "history")
      .map(({ direction }) => direction),
  ).toEqual(["backward", "forward"]);
  const enteredUrls = result.probe.events
    .filter(({ type }) => type === "hanlo:page:enter")
    .map(({ url }) => new URL(url).pathname);
  expect(enteredUrls).toEqual([
    "/tests/e2e/fixtures/page-two.html",
    "/tests/e2e/fixtures/page-one.html",
    "/tests/e2e/fixtures/page-two.html",
  ]);
});

test("synchronizes route styles and executes opted-in module scripts after PJAX", async ({
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
  await expect(page.locator("html")).toHaveAttribute("data-pjax-module-page", "one");

  await page.locator("#next-page").click();
  await waitForLifecycle(page);
  await expect.poll(pageResource).toBe("two");
  await expect(page.locator("html")).toHaveAttribute("data-pjax-module-page", "two");
  await expect(page.locator("link[data-hanlo-page-style]")).toHaveCount(1);

  await page.goBack();
  await waitForLifecycle(page);
  await expect.poll(pageResource).toBe("one");
  await expect(page.locator("link[data-hanlo-page-style]")).toHaveCount(1);
});

test("preserves native download-anchor behavior outside PJAX", async ({ page }) => {
  await page.goto(pageOne);
  await waitForLifecycle(page);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-file").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("config.js");
  await expect(page).toHaveURL(new RegExp(`${pageOne.replaceAll(".", "\\.")}$`));
});

test("falls back to a document navigation when PJAX fails", async ({ page }) => {
  let xhrFailures = 0;
  await page.route("**/tests/e2e/fixtures/missing.html", async (route) => {
    if (route.request().resourceType() === "xhr") {
      xhrFailures++;
      await route.fulfill({ status: 500, contentType: "text/html", body: "PJAX failed" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Fallback</title><h1 id='fallback-loaded'>Fallback loaded</h1>",
    });
  });

  await page.goto(pageOne);
  await waitForLifecycle(page);
  await page.evaluate(() => window.pjax?.loadUrl("/tests/e2e/fixtures/missing.html"));

  await page.waitForURL("**/tests/e2e/fixtures/missing.html");
  await expect(page.locator("#fallback-loaded")).toHaveText("Fallback loaded");
  expect(xhrFailures).toBe(1);
});

test("does not block navigation while an optional friend request is pending", async ({ page }) => {
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
  await page.locator("#next-page").click();
  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "two");
  await waitForLifecycle(page);
  releaseRequest?.();
});
