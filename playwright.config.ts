import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.HALO_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  projects: [
    {
      name: "chromium-desktop-light",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile-dark",
      use: { ...devices["Pixel 5"], colorScheme: "dark" },
    },
  ],
  webServer: process.env.HALO_BASE_URL
    ? undefined
    : {
        command: "pnpm exec vite --config tests/e2e/vite.config.ts --host 127.0.0.1",
        url: "http://127.0.0.1:4173/tests/e2e/fixtures/page-one.html",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
