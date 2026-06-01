/**
 * Apple-touch-icon verification — watchlistEasy
 *
 * Answers the question "did my new home-screen icon actually ship?" without
 * touching a physical iPhone. Whether iOS picks up the icon is fully determined
 * by two things this suite checks deterministically:
 *
 *   1. The <link rel="apple-touch-icon"> tag in the served HTML head.
 *   2. The bytes served at that URL.
 *
 * Playwright gives each test a brand-new browser context (no cookies, no cache),
 * so there is no stale-state to fight — unlike Safari on the phone.
 *
 * The icon lives at src/app/apple-icon.png (Next.js app-dir metadata convention).
 * Next emits the link with a content-hash query string (/apple-icon.png?<hash>),
 * which means every time the file's bytes change the URL changes too — so iOS
 * can never serve a cached old icon. This suite asserts that hash is present and
 * that the served bytes match the source file exactly.
 *
 * Run against the local build:   npm run test:icon
 * Run against the live deploy:    PLAYWRIGHT_BASE_URL=https://your-app.vercel.app \
 *                                   npx playwright test tests/apple-icon.spec.ts --project="Mobile Safari"
 */

import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";

// Playwright runs from the project root, so resolve the source icon from cwd.
const SOURCE_ICON = resolve(process.cwd(), "src/app/apple-icon.png");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

test.describe("apple-touch-icon", () => {
  test("<head> exposes an apple-touch-icon link with a cache-busting hash", async ({ page }) => {
    await page.goto("/");

    const href = await page.$eval(
      'link[rel="apple-touch-icon"]',
      (el) => el.getAttribute("href"),
    ).catch(() => null);

    expect(href, '<link rel="apple-touch-icon"> is missing from <head>').toBeTruthy();
    expect(
      href,
      "apple-touch-icon href has no ?<hash> query — cache-busting is not active. " +
        "Confirm the icon lives at src/app/apple-icon.png (app-dir convention), not public/.",
    ).toMatch(/\/apple-icon\.png\?.+/);
  });

  test("served icon bytes match src/app/apple-icon.png exactly", async ({ page }) => {
    await page.goto("/");

    const href = await page.$eval(
      'link[rel="apple-touch-icon"]',
      (el) => el.getAttribute("href"),
    );

    const response = await page.request.get(href!);
    expect(response.status(), `${href} returned non-200`).toBe(200);
    expect(response.headers()["content-type"], "icon should be image/png").toMatch(/png/);

    const servedBytes = await response.body();
    const sourceBytes = readFileSync(SOURCE_ICON);

    expect(
      sha256(servedBytes),
      "Served apple-touch-icon does NOT match src/app/apple-icon.png.\n" +
        `  served hash: ${sha256(servedBytes)}\n` +
        `  source hash: ${sha256(sourceBytes)}\n` +
        "  → If this fails against a live URL, the new icon has not deployed yet.",
    ).toBe(sha256(sourceBytes));
  });

  test("manifest 180×180 entry resolves to the same icon", async ({ page }) => {
    const response = await page.request.get("/apple-icon.png");
    expect(response.status(), "/apple-icon.png (manifest path) returned non-200").toBe(200);

    const servedBytes = await response.body();
    const sourceBytes = readFileSync(SOURCE_ICON);
    expect(sha256(servedBytes)).toBe(sha256(sourceBytes));
  });
});
