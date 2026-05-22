# Watchlist 2.0 — Architecture & Design Decisions

**Date:** May 2026
**Status:** Decision finalized, implementation pending

---

## Problem Statement

The existing watchlist app runs on a laptop with Next.js + better-sqlite3 (local SQLite file). Goals for v2.0:

1. Access the watchlist from a phone
2. Receive notifications when watchlisted titles become available on streaming services (via TMDB)

The local-first laptop architecture cannot satisfy either goal without changes — the phone cannot reach the laptop's SQLite file, and there is no mechanism to push notifications.

## Paths Considered

### Path 1: Responsive UI + Tailscale (rejected)
- Make existing UI mobile-friendly, access laptop over Tailscale mesh VPN
- Pros: zero architecture change, hours of work
- Cons: no notification path without additional infrastructure; requires laptop always-on
- Could be combined with ntfy.sh + a local cron script to gain notifications while preserving local-first

### Path 2: PWA + Turso (CHOSEN)
- Deploy Next.js to Vercel, swap better-sqlite3 for Turso (libsql)
- Install as PWA on iOS/Android home screen
- Web Push for notifications
- Vercel cron (or GitHub Actions) for TMDB polling
- Pros: existing codebase largely survives, real mobile experience, server-side polling is reliable
- Cons: gives up local-first; database now lives in cloud; iOS requires home-screen install for Web Push

### Path 3: Expo / React Native rewrite (rejected)
- Complete rewrite — Next.js and React Native share almost no code
- iOS background fetch is throttled, so server-side polling still needed
- Weeks of work for marginal UX gain over a well-built PWA

## Chosen Architecture: Path 2, Pattern B

**Source of truth: Turso (server). IndexedDB on device is a read cache.**

### Components

| Layer | Technology | Role |
|---|---|---|
| Frontend | Next.js (existing) | UI, routing, React components |
| Hosting | Vercel | Serverless functions + static assets |
| Database | Turso (libsql) | Bookmarks, push subscriptions, provider history |
| Local cache | IndexedDB via Dexie.js | Read-through cache for instant load + offline browsing |
| Image cache | Service Worker Cache API | TMDB posters cached on device |
| Notifications | Web Push API + VAPID | Push to installed PWA |
| Polling | Vercel Cron OR GitHub Actions | Periodic TMDB availability checks |
| Install surface | PWA via manifest.json | Home screen icon, standalone window |

### Data flow

**On app open:**
1. Render UI immediately from IndexedDB cache (instant)
2. Background: fetch latest bookmarks from `/api/bookmarks` (Turso)
3. Diff against IndexedDB, update if changed, re-render affected components

**On bookmark add/remove:**
1. POST/DELETE to Vercel API route
2. Route writes to Turso
3. On success, update IndexedDB optimistically

**On scheduled poll (every 6h or similar):**
1. Cron hits `/api/check-availability`
2. Handler queries Turso for all bookmarks with stale `available_on` data
3. For each, calls TMDB `/movie/{id}/watch/providers`
4. Diffs new providers vs stored providers
5. If new provider appears, updates Turso and queues a Web Push notification
6. Sends push to all registered subscriptions via `web-push` library

### Why Pattern B (not local-first)

- **Pattern A (local-only IndexedDB):** Phone holds bookmarks, but server has no visibility. Cron can't poll for availability changes without knowing the watchlist. Notifications would only fire when app is opened — defeats the purpose.
- **Pattern B (server source of truth, local cache):** Cron has full access. Phone gets instant load from cache and offline read. Standard PWA pattern.
- **Pattern C (local-first with bidirectional sync):** Over-engineered for single-user. Conflict resolution is mostly a multi-device concern. Skip.

## Key Constraints & Gotchas

### iOS-specific

- **Web Push requires home-screen install.** Cannot request notification permission from Safari browser. Onboarding must direct user to Share → Add to Home Screen → open installed app → grant permission.
- **No automatic install prompt.** Android Chrome shows one; iOS Safari does not. Need a small in-app banner explaining the install gesture.
- **7-day IndexedDB eviction in Safari (uninstalled).** Intelligent Tracking Prevention wipes storage after 7 days of non-use. Does NOT apply once PWA is installed to home screen — installed PWAs get persistent storage.
- **Cold starts are real.** iOS aggressively kills backgrounded PWA processes. Reopening = fresh page load. IndexedDB cache is what makes this feel instant.
- **Splash screen customization is awkward.** Auto-generated from manifest works fine; custom splash requires legacy `apple-touch-startup-image` link tags per device resolution.

### Vercel-specific

- **Hobby tier cron limit: 2 invocations/day.** A 6-hour poll cadence (4/day) requires Vercel Pro ($20/mo) OR moving the schedule to GitHub Actions (free, generous limits) that hits the Vercel endpoint, OR Upstash QStash (free tier sufficient).
- **TMDB API key stays in Vercel env vars** — never shipped to client.
- **Same-region deployment matters.** Turso DB region should match Vercel function region to keep query latency under 50ms.

### TMDB-specific

- `/watch/providers` returns provider data by country. US data is reliable; other regions vary.
- Provider changes are silent — a title can leave Netflix with no signal beyond the next poll's response showing different providers. Diff logic in cron is what catches it.
- Search uses `/search/movie`; details use `/movie/{id}`; providers use `/movie/{id}/watch/providers`.

## Migration Plan (concrete changes)

### Code changes
- [ ] Replace `better-sqlite3` import with `@libsql/client`
- [ ] Convert all DB call sites from sync to async/await
  - `db.prepare(...).all()` → `await db.execute({ sql, args })`
  - Results structure changes: `{ rows, columns }` instead of array
- [ ] Add `/api/bookmarks` GET/POST/DELETE route handlers
- [ ] Add `/api/search` route (proxy to TMDB, keeps API key server-side)
- [ ] Add `/api/check-availability` route (cron target)
- [ ] Add `/api/subscribe-push` route (store push subscriptions in Turso)
- [ ] Add Dexie schema + read-through cache logic in client
- [ ] Add service worker (`/public/sw.js`) for poster caching + push event handling
- [ ] Add service worker registration in root layout
- [ ] Add `manifest.json` in `/public`
- [ ] Add iOS install-prompt banner component
- [ ] Add notification permission request flow (after install detected)

### Infrastructure
- [ ] Create Turso database, get URL + auth token
- [ ] Generate VAPID key pair (`npx web-push generate-vapid-keys`)
- [ ] Add env vars to Vercel: `TURSO_URL`, `TURSO_TOKEN`, `TMDB_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- [ ] Decide cron host: Vercel Pro OR GitHub Actions OR Upstash QStash
- [ ] Configure cron schedule (e.g., every 6 hours)
- [ ] Design app icons (512x512 + 192x192, both `any` and `maskable` purpose)

### Schema (Turso)

```sql
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'movie' | 'tv'
  poster_path TEXT,
  added_at INTEGER NOT NULL,
  last_checked_at INTEGER,
  providers_json TEXT -- last seen providers, for diffing
);

CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  keys_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

## On Async

better-sqlite3 was synchronous (file-local, microsecond reads, blocking acceptable).
libsql + IndexedDB + fetch are all async — required by their underlying transport (network, browser main thread).

Migration is mostly mechanical:
- Mark containing functions `async`
- Add `await` before DB and fetch calls
- Use `Promise.all([...])` for parallel independent calls
- Wrap awaits in try/catch for error handling

Decided: proceed with async. The cost is cosmetic; the benefit (phone access + notifications) is the entire point of v2.0.

## What's NOT Changing

- React components and UI logic
- TMDB search/details fetching logic (just moves behind a route)
- Overall app structure and routing
- Tailwind/CSS approach

## Resolved Decisions

1. **Cron schedule: Daily.** Fits Vercel hobby tier (2 invocations/day) without workarounds. No need for GitHub Actions or QStash.
2. **Provider scope: Flatrate only.** Same as v1. `ads` tier may be added later as a user preference toggle — TMDB already returns it, just widen the filter at query time.
3. **Notification grouping: Batched digest.** One push per cron run summarizing all new availability (e.g., "3 movies now streaming on your services"), not per-title pings.
4. **Multi-device: Single device (primary phone).** `push_subscriptions` table supports multiple rows if needed later, but onboarding targets one device. No multi-device sync logic.
5. **Backup/export: Not building.** Turso is durable (replication + point-in-time recovery). For <500 rows in a managed DB, a JSON export endpoint is trivial to add later if ever wanted. Not worth proactive work.

---

*This document captures the v2.0 architecture decision. Future chats should reference Pattern B (server source of truth, IndexedDB cache) when discussing implementation.*