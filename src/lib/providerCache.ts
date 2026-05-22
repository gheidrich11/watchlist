// Provider cache - 24h TTL over TMDB watch/providers data.
// Async libsql operations for cached provider data.

import db, { ensureSchema } from "./db";
import { getWatchProviders, type TmdbProviderResponse } from "./tmdb";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheRow {
  provider_data: string;
  fetched_at: string;
}

export async function getProvidersForMovie(
  tmdbId: number,
  region: string = "US"
): Promise<TmdbProviderResponse | null> {
  await ensureSchema();
  
  const result = await db.execute(
    `SELECT provider_data, fetched_at FROM provider_cache WHERE tmdb_id = ? AND region = ?`,
    [tmdbId, region]
  );
  const cached = result.rows[0] as unknown as CacheRow | undefined;

  if (cached) {
    const fetchedAt = new Date(cached.fetched_at + "Z").getTime();
    if (Date.now() - fetchedAt < CACHE_TTL_MS) {
      return JSON.parse(cached.provider_data) as TmdbProviderResponse;
    }
  }

  // Stale or missing — fetch from TMDB
  const fresh = await getWatchProviders(tmdbId, region);
  const serialized = JSON.stringify(fresh ?? {});

  await db.execute(
    `INSERT INTO provider_cache (tmdb_id, region, provider_data, fetched_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(tmdb_id, region)
     DO UPDATE SET provider_data = excluded.provider_data, fetched_at = CURRENT_TIMESTAMP`,
    [tmdbId, region, serialized]
  );

  return fresh;
}
