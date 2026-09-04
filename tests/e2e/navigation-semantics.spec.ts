import { expect, test } from "@playwright/test";

const pageOne = "/tests/e2e/fixtures/page-one.html";
const pageTwo = "/tests/e2e/fixtures/page-two.html";

test("keeps document navigation usable without client JavaScript", async ({ page }) => {
  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request.url());
  });

  await page.goto(pageOne);
  await expect(page.locator("#loading-box")).toBeHidden();
  await expect(page.locator("#next-page")).toHaveAttribute("href", pageTwo);
  await Promise.all([page.waitForURL(`**${pageTwo}`), page.locator("#next-page").click()]);

  await expect(page.locator("#body-wrap")).toHaveAttribute("data-page", "two");
  expect(documentRequests).toHaveLength(2);
});
