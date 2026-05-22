// GET /api/movies/discover
//
// Returns popular movies currently streaming on the user's subscribed services.
// Excludes movies already bookmarked.

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { discoverMovies } from "@/lib/tmdb";

const DEFAULT_USER_ID = 1;
const DEFAULT_REGION = "US";

const getServices = db.prepare(
  `SELECT provider_id FROM user_service WHERE user_id = ? AND region = ?`
);

const getBookmarkedTmdbIds = db.prepare(
  `SELECT tmdb_id FROM bookmark WHERE user_id = ?`
);

export async function GET() {
  const services = getServices.all(DEFAULT_USER_ID, DEFAULT_REGION) as { provider_id: number }[];
  const providerIds = services.map((s) => s.provider_id);

  if (providerIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = await discoverMovies(providerIds, DEFAULT_REGION);

  // Filter out already-bookmarked movies
  const bookmarked = new Set(
    (getBookmarkedTmdbIds.all(DEFAULT_USER_ID) as { tmdb_id: number }[]).map((b) => b.tmdb_id)
  );

  const filtered = results.filter((r) => !bookmarked.has(r.tmdbId));

  return NextResponse.json({ results: filtered });
}
