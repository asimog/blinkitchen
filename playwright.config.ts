import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/*.mobile.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: "**/*.mobile.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    // Tests run against a production build: it is what ships, it is faster,
    // and it avoids the dev-server's persistent-cache noise on slow volumes.
    // Stop any running `npm run dev` first (Next refuses a second dev server).
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
