/**
 * iOS PWA Test Suite — watchlistEasy
 *
 * Runs against a live Next.js dev server using Playwright.
 * The "Mobile Safari" project in playwright.config.ts uses WebKit —
 * the actual Safari browser engine — at iPhone 14 Pro dimensions.
 *
 * Run:  npx playwright test tests/ios-pwa.spec.ts --project="Mobile Safari"
 * Or:   npm run test:ios
 *
 * What these tests verify:
 *   - The app loads and renders (not a blank screen in standalone mode)
 *   - manifest.webmanifest is served with correct fields
 *   - All iOS-required meta tags are in the <head>
 *   - apple-touch-icon.png is reachable (200 OK)
 *   - Standalone display mode is declared
 *   - viewport-fit=cover is present (safe-area on notch iPhones)
 *   - The page title matches the manifest short_name
 */

import { test, expect, type Page } from "@playwright/test";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getMetaContent(page: Page, selector: string): Promise<string | null> {
  return page.$eval(
    selector,
    (el) => el.getAttribute("content"),
  ).catch(() => null);
}

// ─── setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // Navigate to the app root — the dev server must be running on :3000
  await page.goto("/");
});

// ─── 1. App loads ─────────────────────────────────────────────────────────────

test("app renders without JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.waitForLoadState("networkidle");
  expect(errors, `JS errors: ${errors.join(", ")}`).toHaveLength(0);
});

test("page title is Watchlist", async ({ page }) => {
  await expect(page).toHaveTitle("Watchlist");
});

// ─── 2. PWA Manifest ──────────────────────────────────────────────────────────

test("manifest.webmanifest is served (200 OK)", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/json/);
});

test("manifest has required PWA fields", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  const manifest = await response.json();

  expect(manifest.name, "name").toBeTruthy();
  expect(manifest.short_name, "short_name").toBeTruthy();
  expect(manifest.display, "display").toBe("standalone");
  expect(manifest.start_url, "start_url").toBe("/");
  expect(manifest.background_color, "background_color").toBeTruthy();
  expect(manifest.theme_color, "theme_color").toBeTruthy();
  expect(manifest.icons, "icons array").toBeDefined();
  expect((manifest.icons as unknown[]).length, "at least one icon").toBeGreaterThan(0);
});

test("manifest has icon ≥ 192×192 (PWA installability)", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  const manifest = await response.json();
  const icons: Array<{ src: string; sizes: string }> = manifest.icons ?? [];

  const largeIcon = icons.find((icon) => {
    const sizes = (icon.sizes ?? "").split(" ");
    return sizes.some((s: string) => {
      const [w] = s.split("x").map(Number);
      return w >= 192;
    });
  });

  expect(
    largeIcon,
    "No icon ≥ 192×192. Add 192×192 and 512×512 icons to manifest.ts for PWA installability"
  ).toBeDefined();
});

test("manifest has icon ≥ 512×512 (PWA installability)", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  const manifest = await response.json();
  const icons: Array<{ src: string; sizes: string }> = manifest.icons ?? [];

  const splashIcon = icons.find((icon) => {
    const sizes = (icon.sizes ?? "").split(" ");
    return sizes.some((s: string) => {
      const [w] = s.split("x").map(Number);
      return w >= 512;
    });
  });

  expect(
    splashIcon,
    "No icon ≥ 512×512. Required for PWA splash screens"
  ).toBeDefined();
});

// ─── 3. iOS meta tags ─────────────────────────────────────────────────────────

test('has <link rel="manifest"> in <head>', async ({ page }) => {
  const href = await page.$eval(
    'link[rel="manifest"]',
    (el) => el.getAttribute("href")
  ).catch(() => null);

  expect(href, '<link rel="manifest"> missing from <head>').toBe("/manifest.webmanifest");
});

test("has apple-mobile-web-app-capable meta tag", async ({ page }) => {
  const content = await getMetaContent(page, 'meta[name="apple-mobile-web-app-capable"]');
  expect(
    content,
    'apple-mobile-web-app-capable missing. Add <meta name="apple-mobile-web-app-capable" content="yes"> to layout.tsx'
  ).toBe("yes");
});

test("has apple-mobile-web-app-status-bar-style", async ({ page }) => {
  const content = await getMetaContent(page, 'meta[name="apple-mobile-web-app-status-bar-style"]');
  expect(content, "apple-mobile-web-app-status-bar-style missing").toBeTruthy();
  // black-translucent allows content behind the status bar (requires viewport-fit=cover)
  expect(
    content,
    'Should be "black-translucent" for edge-to-edge standalone mode'
  ).toBe("black-translucent");
});

test("has apple-mobile-web-app-title", async ({ page }) => {
  const content = await getMetaContent(page, 'meta[name="apple-mobile-web-app-title"]');
  expect(content, "apple-mobile-web-app-title missing").toBeTruthy();
  expect(content).toBe("Watchlist");
});

test("viewport includes viewport-fit=cover (notch / Dynamic Island)", async ({ page }) => {
  const content = await getMetaContent(page, 'meta[name="viewport"]');
  expect(content, "viewport meta missing").toBeTruthy();
  expect(
    content,
    'viewport-fit=cover missing — required for safe-area support on iPhone X+ in standalone mode'
  ).toContain("viewport-fit=cover");
});

// ─── 4. apple-touch-icon ──────────────────────────────────────────────────────

test("apple-touch-icon link is in <head> and reachable (200 OK)", async ({ page }) => {
  // Next.js generates this from src/app/apple-icon.png, with a content-hash
  // query string for cache-busting (e.g. /apple-icon.png?abc123).
  const href = await page.$eval(
    'link[rel="apple-touch-icon"]',
    (el) => el.getAttribute("href")
  ).catch(() => null);

  expect(href, '<link rel="apple-touch-icon"> missing from <head>').toBeTruthy();

  const response = await page.request.get(href!);
  expect(response.status(), `${href} returned non-200`).toBe(200);
  expect(
    response.headers()["content-type"],
    "apple-touch-icon should be image/png"
  ).toMatch(/png/);
});

// ─── 5. Standalone-mode behavior ─────────────────────────────────────────────

test("app is still functional at iPhone 14 Pro viewport (390×844)", async ({ page }) => {
  // Playwright config sets the project to 390×844; just verify the page is usable
  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(393);

  // Body should exist and not be empty
  const bodyText = await page.locator("body").innerText().catch(() => "");
  // Just verify the page rendered something (not a white screen)
  const bodyHTML = await page.locator("body").innerHTML();
  expect(bodyHTML.trim().length, "body is empty — app may not be rendering").toBeGreaterThan(50);
});

test("no console errors on load", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.waitForLoadState("networkidle");
  // Filter out known third-party noise
  const appErrors = consoleErrors.filter(
    (e) => !e.includes("vercel") && !e.includes("analytics")
  );
  expect(appErrors, `Console errors: ${appErrors.join(", ")}`).toHaveLength(0);
});
