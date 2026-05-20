// Provider cache - the rate-limit safety net.
//
// TMDB allows ~40 req/10s. A 30-movie watchlist refreshing on every page load
// would burn through that fast. We cache provider responses with a 24h TTL.
//
// Cache invalidation is age-based, not event-based. If providers change for a
// movie between cache writes, you'll see stale data until TTL expires. For a
// personal watchlist that's an acceptable tradeoff.

import { PrismaClient } from "@prisma/client";
import { getWatchProviders, type TmdbProviderResponse } from "./tmdb";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getProvidersForMovie(
  prisma: PrismaClient,
  tmdbId: number,
  region: string = "US"
): Promise<TmdbProviderResponse | null> {
  const cached = await prisma.providerCache.findUnique({
    where: { tmdbId_region: { tmdbId, region } },
  });

  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return JSON.parse(cached.providerData) as TmdbProviderResponse;
  }

  // Stale or missing - refetch from TMDB.
  const fresh = await getWatchProviders(tmdbId, region);
  const serialized = JSON.stringify(fresh ?? {});

  await prisma.providerCache.upsert({
    where: { tmdbId_region: { tmdbId, region } },
    create: { tmdbId, region, providerData: serialized },
    update: { providerData: serialized, fetchedAt: new Date() },
  });

  return fresh;
}
