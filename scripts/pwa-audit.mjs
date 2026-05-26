#!/usr/bin/env node
/**
 * Lighthouse PWA Audit — watchlistEasy
 *
 * Requires Chrome/Chromium on PATH (brew install --cask google-chrome on Mac).
 * Requires the Next.js dev server to be running:  npm run dev
 *
 * Usage:
 *   npm run audit:pwa
 *   # or manually:
 *   node scripts/pwa-audit.mjs [url]
 *
 * Outputs a pass/fail table for all PWA categories and flags anything < 90.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Lighthouse v10+ ships as ESM but the CLI entry point is CommonJS-compatible
let lighthouse, chromeLauncher;
try {
  ({ default: lighthouse } = await import("lighthouse"));
  chromeLauncher = await import("chrome-launcher");
} catch (e) {
  console.error(
    "\n⛔  Could not import lighthouse or chrome-launcher.\n" +
    "   Run: npm install --save-dev lighthouse\n"
  );
  process.exit(1);
}

const TARGET_URL = process.argv[2] ?? "http://localhost:3000";

console.log(`\nRunning Lighthouse PWA audit against: ${TARGET_URL}\n`);

let chrome;
try {
  chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--disable-gpu"] });
} catch (e) {
  console.error(
    "\n⛔  Could not launch Chrome.\n" +
    "   Make sure Chrome or Chromium is installed and on PATH.\n" +
    "   macOS:  brew install --cask google-chrome\n"
  );
  process.exit(1);
}

let result;
try {
  result = await lighthouse(TARGET_URL, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    // Only run PWA + best-practices audits to keep it fast
    onlyCategories: ["pwa", "best-practices"],
  });
} finally {
  await chrome.kill();
}

const { lhr } = result;

// ─── Print category scores ────────────────────────────────────────────────────

console.log("Category Scores\n" + "─".repeat(40));
for (const [key, cat] of Object.entries(lhr.categories)) {
  const score = Math.round((cat.score ?? 0) * 100);
  const bar = score >= 90 ? "✅" : score >= 50 ? "⚠️ " : "❌";
  console.log(`  ${bar}  ${cat.title.padEnd(30)} ${String(score).padStart(3)}/100`);
}

// ─── Print PWA audit details ──────────────────────────────────────────────────

console.log("\nPWA Audit Details\n" + "─".repeat(40));

const pwaCategory = lhr.categories["pwa"];
const auditRefs = pwaCategory?.auditRefs ?? [];

let failures = 0;
for (const ref of auditRefs) {
  const audit = lhr.audits[ref.id];
  if (!audit) continue;

  const score = audit.score;
  if (score === null) continue; // informational

  const icon = score === 1 ? "✅" : score === 0 ? "❌" : "⚠️ ";
  if (score !== 1) failures++;

  console.log(`  ${icon}  ${audit.title}`);
  if (score !== 1 && audit.description) {
    // Trim long descriptions to 120 chars
    const desc = audit.description.replace(/\[.*?\]\(.*?\)/g, "").trim();
    console.log(`       → ${desc.slice(0, 120)}${desc.length > 120 ? "…" : ""}`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const pwaScore = Math.round((pwaCategory?.score ?? 0) * 100);
console.log("\n" + "─".repeat(40));
console.log(`  PWA score: ${pwaScore}/100   (${failures} audit(s) failed)`);
console.log("─".repeat(40) + "\n");

if (failures > 0) {
  process.exit(1);
}
