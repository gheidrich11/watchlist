import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for watchlistEasy iOS PWA testing.
 *
 * The primary project ("Mobile Safari") uses WebKit — the actual Safari
 * browser engine — at iPhone 14 Pro dimensions. This is the closest you can
 * get to real iOS Safari without Xcode's simulator.
 *
 * Setup:
 *   npx playwright install webkit       # one-time, install Safari engine
 *   npm run test:ios                    # run the suite
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3100",
    // Capture traces on failure so you can see exactly what happened
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      // ── Primary: WebKit = real Safari engine ────────────────────────────────
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 14 Pro"],
        // devices["iPhone 14 Pro"] sets:
        //   browserName: "webkit"
        //   viewport: { width: 390, height: 844 }
        //   userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 …) AppleWebKit/…"
        //   deviceScaleFactor: 3
        //   isMobile: true
        //   hasTouch: true
      },
    },
    {
      // ── Secondary: Chromium with iOS user-agent ────────────────────────────
      // Useful to compare manifest/meta parsing across engines.
      name: "Chrome (iOS UA)",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],

  // Auto-start the Next.js dev server on a dedicated port to avoid colliding
  // with any stray dev server already running on the default 3000.
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
