import { expect, test } from "@playwright/test";

test("preserves the phase 5 design-system visual contract", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name.includes("mobile");
  const mode = testInfo.project.name.endsWith("-dark") ? "dark" : "light";
  const viewport = mobile ? "mobile" : "desktop";

  await page.goto("/tests/e2e/fixtures/phase5-visual.html");
  await page.evaluate((themeMode) => {
    document.documentElement.dataset.theme = themeMode;
  }, mode);

  await expect(page.locator("#phase5-visual-root")).toHaveScreenshot(
    `phase5-design-system-${viewport}-${mode}.png`,
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.005,
    },
  );
});
