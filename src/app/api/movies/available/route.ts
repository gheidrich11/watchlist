// GET /api/movies/available
//
// The heart of the app. Cross-references active bookmarks (status="want")
// against the user's configured streaming services, returning movies grouped
// by provider.
//
// Shape returned: { providers: [{ providerId, providerName, movies: [...] }],
//                   unavailable: [...] }
//
// A movie appears under EVERY provider that carries it (flatrate OR ads).
// flatrate/ads distinction preserved per-movie-per-provider via availability[].
// Rent and buy are deliberately excluded - "available to me" means included
// in a subscription I already pay for.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvidersForMovie } from "@/lib/providerCache";

const DEFAULT_USER_ID = 1;
const DEFAULT_REGION = "US";

type AvailabilityType = "flatrate" | "ads";

interface MovieEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  availabilityType: AvailabilityType;
}

interface ProviderGroup {
  providerId: number;
  providerName: string;
  movies: MovieEntry[];
}

export async function GET(_req: NextRequest) {
  // Pull the user's services and active bookmarks in parallel.
  const [services, bookmarks] = await Promise.all([
    prisma.userService.findMany({
      where: { userId: DEFAULT_USER_ID, region: DEFAULT_REGION },
    }),
    prisma.bookmark.findMany({
      where: { userId: DEFAULT_USER_ID, status: "want" },
    }),
  ]);

  const ownedProviderIds = new Set(services.map((s) => s.providerId));
  const providerGroups = new Map<number, ProviderGroup>();
  services.forEach((s) => {
    providerGroups.set(s.providerId, {
      providerId: s.providerId,
      providerName: s.providerName,
      movies: [],
    });
  });

  const unavailable: Omit<MovieEntry, "availabilityType">[] = [];

  // Fetch provider data for each bookmark (cached, so this is cheap on repeat).
  for (const bookmark of bookmarks) {
    const providerData = await getProvidersForMovie(
      prisma,
      bookmark.tmdbId,
      DEFAULT_REGION
    );

    let foundOnOwned = false;

    // flatrate first (subscription), then ads (free with ads on services you have)
    for (const type of ["flatrate", "ads"] as const) {
      const providers = providerData?.[type] ?? [];
      for (const p of providers) {
        if (ownedProviderIds.has(p.provider_id)) {
          const group = providerGroups.get(p.provider_id)!;
          group.movies.push({
            tmdbId: bookmark.tmdbId,
            title: bookmark.title,
            posterPath: bookmark.posterPath,
            releaseYear: bookmark.releaseYear,
            availabilityType: type,
          });
          foundOnOwned = true;
        }
      }
    }

    if (!foundOnOwned) {
      unavailable.push({
        tmdbId: bookmark.tmdbId,
        title: bookmark.title,
        posterPath: bookmark.posterPath,
        releaseYear: bookmark.releaseYear,
      });
    }
  }

  return NextResponse.json({
    providers: Array.from(providerGroups.values()),
    unavailable,
  });
}
