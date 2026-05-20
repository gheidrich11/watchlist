# Watchlist MVP

Local-first movie watchlist that tells you what's actually streaming on services you have.

## Stack

- Next.js 15 (App Router) — single-package, API routes + UI in one place
- Prisma + SQLite — local-first persistence
- TMDB API — search and watch-provider data
- TypeScript

## Setup

1. **Get a TMDB API key.** Free, takes about 2 minutes.
   - Sign up at https://www.themoviedb.org
   - Settings → API → Create → Developer
   - Copy the "API Key (v3 auth)" value

2. **Configure environment.**
   ```
   cp .env.example .env.local
   ```
   Paste your TMDB key into `.env.local`.

3. **Install and initialize.**
   ```
   npm install
   npm run db:generate
   npm run db:push
   ```

4. **Seed your services** (no UI for this yet — see "Seeding services" below).

5. **Run.**
   ```
   npm run dev
   ```

## Before writing UI: verify TMDB data quality

The whole app rests on TMDB's `/watch/providers` data being accurate. Spot-check
before building anything on top of it. Pick 5–10 movies you know the current
streaming status of, then:

```bash
# Search to get a tmdb_id
curl "https://api.themoviedb.org/3/search/movie?api_key=YOUR_KEY&query=dune"

# Pull providers for that movie
curl "https://api.themoviedb.org/3/movie/693134/watch/providers?api_key=YOUR_KEY" \
  | jq '.results.US'
```

You're looking at `.flatrate` (subscription-included) and `.ads` (free-with-ads
on a provider you may have). Compare to reality. If TMDB is wrong on more than
~1 in 5 movies you check, that's a data quality issue worth knowing about
before you've built around it.

## Seeding services

There's no UI yet for configuring which services you have. Until there is,
seed them directly. TMDB provider IDs (US, common ones):

| Service           | provider_id |
|-------------------|-------------|
| Netflix           | 8           |
| Amazon Prime      | 9           |
| Hulu              | 15          |
| Disney+           | 337         |
| Max (HBO)         | 1899        |
| Apple TV+         | 350         |
| Paramount+        | 531         |
| Peacock           | 386         |

Verify current IDs with:
```bash
curl "https://api.themoviedb.org/3/watch/providers/movie?api_key=YOUR_KEY&watch_region=US" \
  | jq '.results[] | {id: .provider_id, name: .provider_name}'
```

Then either use Prisma Studio (`npm run db:studio`) to add rows to
`UserService`, or write a quick seed script.

## API endpoints

- `GET  /api/movies/search?q=<query>` — TMDB-backed search
- `POST /api/movies/bookmark` — add bookmark `{ tmdbId, title, posterPath?, releaseYear? }`
- `GET  /api/movies/bookmark?status=want|watched|dismissed` — list bookmarks
- `PATCH /api/movies/bookmark` — update status `{ tmdbId, status }`
- `DELETE /api/movies/bookmark?tmdbId=<id>` — remove
- `GET  /api/movies/available` — grouped-by-provider current availability

## What's out of scope (and staying that way for MVP)

- Auth and multi-user (schema is ready, no login flow)
- Hosting / deployment (local-first)
- Settings UI for services (seed directly until friction demands it)
- Auto-refresh of provider data (24h cache TTL, manual re-check on load)
- Polished UI (this scaffold has none — frontend is the next thing to build)

## Design decisions worth remembering

- `tmdbId` is the canonical movie identifier. Title and poster are denormalized
  for display so the bookmark list doesn't re-hit TMDB.
- `Bookmark.userId` exists from day one and defaults to 1. Adding auth later
  means a session change, not a migration.
- `ProviderCache` stores the full TMDB response per movie, preserving the
  flatrate / ads / rent / buy / free distinction. Rent and buy are filtered
  out at query time, not at cache time — so when you change your mind later,
  the data's still there.
- Movies appear under every provider that carries them. Same movie on Netflix
  and Prime shows in both groups.
