import { defineConfig, devices } from "@playwright/test";

const chromiumExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const chromiumLaunch = chromiumExecutable
  ? ({ launchOptions: { executablePath: chromiumExecutable } } as const)
  : ({} as const);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.HALO_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop-light",
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        viewport: { width: 1_440, height: 900 },
      },
    },
    {
      name: "chromium-desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        colorScheme: "dark",
        viewport: { width: 1_440, height: 900 },
      },
    },
    {
      name: "chromium-mobile-light",
      use: {
        ...devices["Pixel 5"],
        ...chromiumLaunch,
        deviceScaleFactor: 1,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-mobile-dark",
      use: {
        ...devices["Pixel 5"],
        ...chromiumLaunch,
        colorScheme: "dark",
        deviceScaleFactor: 1,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-reduced-motion",
      testMatch: /lifecycle\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        contextOptions: { reducedMotion: "reduce" },
        viewport: { width: 1_440, height: 900 },
      },
    },
    {
      name: "chromium-no-javascript",
      testMatch: /navigation-semantics\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        javaScriptEnabled: false,
        viewport: { width: 1_440, height: 900 },
      },
    },
    {
      name: "firefox-desktop",
      testMatch: /(?:lifecycle|navigation-semantics)\.spec\.ts/,
      use: { ...devices["Desktop Firefox"], viewport: { width: 1_440, height: 900 } },
    },
    {
      name: "webkit-desktop",
      testMatch: /(?:lifecycle|navigation-semantics)\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 1_440, height: 900 } },
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
