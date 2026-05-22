// GET /api/movies/available
//
// Cross-references active bookmarks (status="want") against the user's
// configured streaming services, returning movies grouped by provider.
//
// A movie appears under EVERY provider that carries it (flatrate OR ads).
// Rent and buy are deliberately excluded.

import { NextRequest, NextResponse } from "next/server";
import db, { ensureSchema } from "@/lib/db";
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
  logoPath: string | null;
  movies: MovieEntry[];
}

interface UnavailableEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  rentOptions: { providerName: string; }[];
}

interface BookmarkRow {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: number | null;
}

interface ServiceRow {
  provider_id: number;
  provider_name: string;
}

export async function GET(_req: NextRequest) {
  await ensureSchema();
  
  const servicesResult = await db.execute(
    `SELECT provider_id, provider_name FROM user_service WHERE user_id = ? AND region = ?`,
    [DEFAULT_USER_ID, DEFAULT_REGION]
  );
  const services = servicesResult.rows as unknown as ServiceRow[];
  
  const bookmarksResult = await db.execute(
    `SELECT tmdb_id, title, poster_path, release_year FROM bookmark WHERE user_id = ? AND status = 'want'`,
    [DEFAULT_USER_ID]
  );
  const bookmarks = bookmarksResult.rows as unknown as BookmarkRow[];

  const ownedProviderIds = new Set(services.map((s) => s.provider_id));

  // Group by provider name (not ID) so that tier variants like
  // "Paramount Plus Premium" / "Paramount Plus Essential" merge into one group.
  const providerGroups = new Map<string, ProviderGroup>();
  services.forEach((s) => {
    if (!providerGroups.has(s.provider_name)) {
      providerGroups.set(s.provider_name, {
        providerId: s.provider_id,
        providerName: s.provider_name,
        logoPath: null,
        movies: [],
      });
    }
  });

  // Groups for services the user does NOT subscribe to
  const otherProviderGroups = new Map<string, ProviderGroup>();

  const unavailable: UnavailableEntry[] = [];

  // Build a lookup: provider_id -> provider_name (for group resolution)
  const idToName = new Map<number, string>();
  services.forEach((s) => idToName.set(s.provider_id, s.provider_name));

  // TMDB returns tier-variant provider names (e.g. "Paramount Plus Premium")
  // that have different IDs than the base service (531 = "Paramount Plus").
  // This resolves a TMDB provider to the matching owned-service group name,
  // first by exact ID, then by name-prefix (tier variant fallback).
  function resolveOwnedGroup(providerId: number, providerName: string): string | null {
    if (ownedProviderIds.has(providerId)) return idToName.get(providerId)!;
    for (const [, ownedName] of idToName) {
      if (providerName.startsWith(ownedName + " ") || providerName === ownedName) {
        return ownedName;
      }
    }
    return null;
  }

  for (const bookmark of bookmarks) {
    const providerData = await getProvidersForMovie(bookmark.tmdb_id, DEFAULT_REGION);

    let foundOnAny = false;
    const seenGroups = new Set<string>(); // prevent duplicate entries in same group

    for (const type of ["flatrate", "ads"] as const) {
      const providers = providerData?.[type] ?? [];
      for (const p of providers) {
        const ownedGroupName = resolveOwnedGroup(p.provider_id, p.provider_name);
        if (ownedGroupName !== null) {
          const groupName = ownedGroupName;
          const dedupeKey = `${groupName}:${bookmark.tmdb_id}`;
          if (seenGroups.has(dedupeKey)) continue;
          seenGroups.add(dedupeKey);

          const group = providerGroups.get(groupName)!;
          if (!group.logoPath) group.logoPath = p.logo_path || null;
          group.movies.push({
            tmdbId: bookmark.tmdb_id,
            title: bookmark.title,
            posterPath: bookmark.poster_path,
            releaseYear: bookmark.release_year,
            availabilityType: type,
          });
          foundOnAny = true;
        } else {
          // Available on a service the user doesn't subscribe to
          // Skip noise providers (channel add-ons, live TV bundles)
          const name = p.provider_name;
          if (name.includes("Amazon Channel") || name === "YouTube TV") continue;

          const groupName = name;
          const dedupeKey = `${groupName}:${bookmark.tmdb_id}`;
          if (seenGroups.has(dedupeKey)) continue;
          seenGroups.add(dedupeKey);

          if (!otherProviderGroups.has(groupName)) {
            otherProviderGroups.set(groupName, {
              providerId: p.provider_id,
              providerName: groupName,
              logoPath: p.logo_path || null,
              movies: [],
            });
          }
          otherProviderGroups.get(groupName)!.movies.push({
            tmdbId: bookmark.tmdb_id,
            title: bookmark.title,
            posterPath: bookmark.poster_path,
            releaseYear: bookmark.release_year,
            availabilityType: type,
          });
          foundOnAny = true;
        }
      }
    }

    if (!foundOnAny) {
      const rentProviders = providerData?.rent ?? [];
      unavailable.push({
        tmdbId: bookmark.tmdb_id,
        title: bookmark.title,
        posterPath: bookmark.poster_path,
        releaseYear: bookmark.release_year,
        rentOptions: rentProviders.slice(0, 3).map((p) => ({ providerName: p.provider_name })),
      });
    }
  }

  return NextResponse.json({
    providers: Array.from(providerGroups.values()),
    otherProviders: Array.from(otherProviderGroups.values()),
    unavailable,
  });
}
