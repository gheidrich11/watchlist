#!/usr/bin/env node
/**
 * PWA Static Audit — watchlistEasy
 *
 * Runs entirely in Node.js (no browser required). Audits:
 *   1. manifest.webmanifest — field completeness, iOS-required fields, icon sizes
 *   2. Built HTML (index.html) — all iOS meta tags in the actual output
 *   3. apple-touch-icon.png — file exists and is 180×180
 *   4. safe-area CSS — checks for env(safe-area-inset-*) usage
 *
 * Usage:  node tests/pwa-static-audit.mjs
 * Exit 1 if any check fails.
 */

import { readFileSync, existsSync } from "fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, detail = "") {
  console.log(`  ❌  ${label}${detail ? `\n       → ${detail}` : ""}`);
  failed++;
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

// ─── 1. Manifest ─────────────────────────────────────────────────────────────

section("manifest.webmanifest");

const MANIFEST_PATH = resolve(ROOT, ".next/server/app/manifest.webmanifest.body");
if (!existsSync(MANIFEST_PATH)) {
  fail("Built manifest exists at .next/server/app/manifest.webmanifest.body",
    "Run `npm run build` first");
  console.log("\n⛔  Cannot continue without built manifest.\n");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
} catch (e) {
  fail("manifest.webmanifest is valid JSON", e.message);
  process.exit(1);
}

// Required by Web App Manifest spec
const requiredFields = ["name", "short_name", "display", "start_url", "icons"];
for (const field of requiredFields) {
  manifest[field] !== undefined
    ? pass(`Has required field: "${field}"`)
    : fail(`Missing required field: "${field}"`);
}

// PWA installability needs description
manifest.description
  ? pass('Has "description" (Lighthouse installability)')
  : fail('Missing "description"', 'Lighthouse will flag this — add a description to manifest.ts');

// display must be standalone for iOS homescreen
manifest.display === "standalone"
  ? pass('display === "standalone"')
  : fail(`display is "${manifest.display}"`, 'Must be "standalone" for iOS add-to-homescreen');

// background_color / theme_color
manifest.background_color
  ? pass(`background_color: ${manifest.background_color}`)
  : fail('Missing "background_color"');

manifest.theme_color
  ? pass(`theme_color: ${manifest.theme_color}`)
  : fail('Missing "theme_color"');

// Icons — need ≥192×192 and ≥512×512 for PWA installability
const icons = manifest.icons ?? [];

const has192 = icons.some((icon) => {
  const sizes = (icon.sizes || "").split(" ");
  return sizes.some((s) => {
    const [w] = s.split("x").map(Number);
    return w >= 192;
  });
});
const has512 = icons.some((icon) => {
  const sizes = (icon.sizes || "").split(" ");
  return sizes.some((s) => {
    const [w] = s.split("x").map(Number);
    return w >= 512;
  });
});
const hasMaskable = icons.some((icon) =>
  (icon.purpose || "").includes("maskable")
);

has192
  ? pass("Has icon ≥ 192×192 (PWA installability requirement)")
  : fail(
      "No icon ≥ 192×192",
      "Add a 192×192 and 512×512 icon to manifest.ts — required for Chrome/Safari PWA installability"
    );

has512
  ? pass("Has icon ≥ 512×512 (PWA installability requirement)")
  : fail(
      "No icon ≥ 512×512",
      "Add a 512×512 icon to manifest.ts — required for PWA splash screens"
    );

hasMaskable
  ? pass('Has maskable icon (prevents white halo on Android/some iOS)')
  : fail(
      'No maskable icon',
      'Add purpose: "maskable" to one icon in manifest.ts'
    );

// ─── 2. Built HTML meta tags ──────────────────────────────────────────────────

section("Built HTML — iOS meta tags");

const HTML_PATH = resolve(ROOT, ".next/server/app/index.html");
if (!existsSync(HTML_PATH)) {
  fail("Built index.html exists", "Run `npm run build` first");
} else {
  const html = readFileSync(HTML_PATH, "utf-8");

  const checks = [
    {
      name: 'viewport with viewport-fit=cover (safe-area support)',
      re: /viewport-fit=cover/,
    },
    {
      name: '<link rel="manifest" href="/manifest.webmanifest">',
      re: /rel="manifest"/,
    },
    {
      name: 'apple-mobile-web-app-capable (iOS standalone mode gate)',
      re: /apple-mobile-web-app-capable/,
      fix: 'Next.js 15 outputs mobile-web-app-capable instead. Add a custom <meta> in layout.tsx:\n       <meta name="apple-mobile-web-app-capable" content="yes" />',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      re: /apple-mobile-web-app-status-bar-style/,
    },
    {
      name: 'apple-mobile-web-app-title',
      re: /apple-mobile-web-app-title/,
    },
    {
      name: 'theme-color meta tag',
      re: /name="theme-color"|name="mobile-web-app-capable"/,
    },
    {
      name: 'apple-touch-icon link with cache-busting hash (?<hash>)',
      re: /rel="apple-touch-icon"[^>]*href="\/apple-icon\.png\?[^"]+"/,
      fix: 'Expected Next.js to emit <link rel="apple-touch-icon" href="/apple-icon.png?<hash>">.\n' +
        '       Ensure src/app/apple-icon.png exists (the app-dir metadata convention).',
    },
  ];

  for (const check of checks) {
    check.re.test(html)
      ? pass(check.name)
      : fail(check.name, check.fix);
  }
}

// ─── 3. apple-touch-icon.png ─────────────────────────────────────────────────

section("src/app/apple-icon.png");

const ICON_PATH = resolve(ROOT, "src/app/apple-icon.png");
if (!existsSync(ICON_PATH)) {
  fail("src/app/apple-icon.png exists");
} else {
  pass("src/app/apple-icon.png exists");

  const buf = readFileSync(ICON_PATH);
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validPng = buf.slice(0, 8).equals(PNG_SIG);
  validPng ? pass("Valid PNG signature") : fail("Invalid PNG signature");

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  width === 180 && height === 180
    ? pass(`Dimensions: ${width}×${height} (correct for apple-touch-icon)`)
    : fail(`Dimensions: ${width}×${height}`, "Apple requires exactly 180×180 for apple-touch-icon");
}

// ─── 4. Safe-area CSS ─────────────────────────────────────────────────────────

section("Safe-area CSS (iPhone X+ notch / Dynamic Island)");

const GLOBALS_CSS = resolve(ROOT, "src/app/globals.css");
const cssContent = existsSync(GLOBALS_CSS)
  ? readFileSync(GLOBALS_CSS, "utf-8")
  : "";

const hasSafeArea = cssContent.includes("safe-area-inset") ||
  cssContent.includes("env(safe-area");

hasSafeArea
  ? pass("globals.css uses env(safe-area-inset-*)")
  : fail(
      "No safe-area CSS found",
      "In standalone mode on iPhone X+, the notch/Dynamic Island overlaps content.\n" +
      "       Add to globals.css:\n" +
      "         body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }"
    );

// ─── 5. public/ icons (branded, not placeholder) ─────────────────────────────
//
// Tradeoff: hash-inequality guards the specific known placeholder bytes.
// Dimension check guards wrong-size exports. Neither check guards against an
// arbitrary future flat-color image — that would require perceptual hashing,
// which is out of scope here.

section("public/ icons (branded, not placeholder)");

const PUBLIC_ICONS = [
  {
    file: "public/icon-192.png",
    placeholderHash: "4178aebfac5c11fe1f82446e3b39f364d51a90ace9ea046818fb450855837ed2",
    width: 192,
    height: 192,
  },
  {
    file: "public/icon-512.png",
    placeholderHash: "926e3bd295f47746491533acfcdb401ca199f3c54b8dc87b78383c3ec6e1bfa3",
    width: 512,
    height: 512,
  },
];

const PNG_SIG_PUBLIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

for (const icon of PUBLIC_ICONS) {
  const iconPath = resolve(ROOT, icon.file);
  if (!existsSync(iconPath)) {
    fail(`${icon.file} exists`);
    continue;
  }
  pass(`${icon.file} exists`);

  const buf = readFileSync(iconPath);

  // (a) sha256 must not equal the known black-placeholder hash
  const hash = createHash("sha256").update(buf).digest("hex");
  hash !== icon.placeholderHash
    ? pass(`${icon.file} is not the known placeholder (sha256 differs)`)
    : fail(
        `${icon.file} is still the placeholder image`,
        `Replace ${icon.file} with a branded icon — current sha256 matches the known black placeholder`
      );

  // (b) valid PNG signature
  const validPng = buf.slice(0, 8).equals(PNG_SIG_PUBLIC);
  validPng
    ? pass(`${icon.file} valid PNG signature`)
    : fail(`${icon.file} invalid PNG signature`);

  // (c) exact dimensions from IHDR chunk
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  w === icon.width && h === icon.height
    ? pass(`${icon.file} dimensions: ${w}×${h}`)
    : fail(
        `${icon.file} dimensions: ${w}×${h}`,
        `Expected exactly ${icon.width}×${icon.height}`
      );
}

// ─── 6. Summary ──────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(63)}`);
console.log(`  ${passed} passed   ${failed} failed`);
console.log(`${"─".repeat(63)}\n`);

if (failed > 0) {
  process.exit(1);
}
