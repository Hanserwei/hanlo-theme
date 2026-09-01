import { expect, test } from "@playwright/test";

const OPTIONAL_PATTERNS = [
  /DPlayer/i,
  /hls(?:__js|\.js|[-/])/i,
  /swiper/i,
  /tocbot/i,
  /qrcode/i,
  /fast-average-color/i,
  /typed(?:__js|\.js|[-/])/i,
  /features\/link-canvas\/index\.ts/i,
  /features\/shiki\/local\.ts/i,
];

async function collectModuleRequests(
  page: import("@playwright/test").Page,
  route: string,
  settleMilliseconds = 0,
): Promise<string[]> {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  await page.goto(route);
  await page.waitForFunction(() => window.HanloLifecycle?.activeControllers.length);
  await page.evaluate(() => window.HanloLifecycle?.whenIdle());
  if (settleMilliseconds > 0) await page.waitForTimeout(settleMilliseconds);
  return requests;
}

function optionalRequests(requests: readonly string[]): string[] {
  return requests.filter((request) => OPTIONAL_PATTERNS.some((pattern) => pattern.test(request)));
}

test("does not request optional feature modules without target DOM", async ({ page }) => {
  const requests = await collectModuleRequests(page, "/tests/e2e/fixtures/phase4-no-target.html");
  expect(optionalRequests(requests)).toEqual([]);
});

test("requests eligible optional modules only when their target DOM is present", async ({
  page,
}) => {
  const requests = await collectModuleRequests(
    page,
    "/tests/e2e/fixtures/phase4-targets.html",
    2_200,
  );
  for (const dependency of [
    /swiper/i,
    /tocbot/i,
    /qrcode/i,
    /fast-average-color/i,
    /typed(?:__js|\.js|[-/])/i,
    /features\/link-canvas\/index\.ts/i,
  ]) {
    expect(
      requests.some((request) => dependency.test(request)),
      `${dependency} should be requested for eligible target DOM`,
    ).toBe(true);
  }
  await expect(page.locator("#qrcode canvas")).toBeVisible();
  await expect(page.locator(".toc-content")).not.toBeEmpty();
  await expect(page.locator("#link-canvas")).toBeVisible();
  await page.locator("[data-hanlo-action='refresh-link-canvas']").click();
});

test("loads DPlayer for MP4 without loading HLS.js", async ({ page }) => {
  const requests = await collectModuleRequests(page, "/tests/e2e/fixtures/phase4-video-mp4.html");
  expect(requests.some((request) => /DPlayer/i.test(request))).toBe(true);
  expect(requests.filter((request) => /hls(?:__js|\.js|[-/])/i.test(request))).toEqual([]);
  await expect(page.locator(".dplayer")).toBeVisible();
});

test("loads DPlayer and HLS.js for an HLS source", async ({ page }) => {
  const requests = await collectModuleRequests(page, "/tests/e2e/fixtures/phase4-video-hls.html");
  expect(requests.some((request) => /DPlayer/i.test(request))).toBe(true);
  expect(requests.some((request) => /hls(?:__js|\.js|[-/])/i.test(request))).toBe(true);
  await expect(page.locator(".dplayer")).toBeVisible();
});

test("does not request Tocbot for headed content without a TOC target", async ({ page }) => {
  const requests = await collectModuleRequests(
    page,
    "/tests/e2e/fixtures/phase4-headed-no-toc.html",
  );
  expect(requests.filter((request) => /tocbot/i.test(request))).toEqual([]);
  await expect(page.locator(".post-content h1")).toHaveText("Heading without TOC target");
});

test("keeps unsupported code readable without loading the Shiki highlighter", async ({ page }) => {
  const requests = await collectModuleRequests(
    page,
    "/tests/e2e/fixtures/phase4-code-unsupported.html",
  );
  expect(requests.filter((request) => /features\/shiki\/local\.ts/i.test(request))).toEqual([]);
  await expect(page.locator("pre > code")).toHaveText("++[--]");
  await expect(page.locator(".shiki-code-block")).toHaveCount(0);
});

test("loads the bounded Shiki highlighter for supported code", async ({ page }) => {
  const requests = await collectModuleRequests(
    page,
    "/tests/e2e/fixtures/phase4-code-supported.html",
  );
  expect(requests.some((request) => /features\/shiki\/local\.ts/i.test(request))).toBe(true);
  await expect(page.locator(".shiki-code-block pre.shiki")).toBeVisible();
  await expect(page.locator(".shiki-code-block")).toContainText("const answer = 42;");
});

test("traps gallery focus and restores it to the trigger on Escape", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/phase4-gallery.html");
  await page.waitForFunction(() => window.HanloLifecycle?.activeControllers.length);
  const trigger = page.locator("#gallery-image");
  await trigger.click();
  await expect(page.locator(".hanlo-lightbox")).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".hanlo-lightbox__next")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".hanlo-lightbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
