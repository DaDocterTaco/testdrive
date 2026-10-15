import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TD_E2E_BASE_URL || "http://127.0.0.1:4177";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: "**/desktop.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "iphone-viewport-emulation",
      testMatch: "**/mobile.spec.ts",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.TD_E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 4177 --strictPort",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
