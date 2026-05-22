// GET /api/movies/discover
//
// Returns popular movies currently streaming on the user's subscribed services.
// Excludes movies already bookmarked.

import { NextResponse } from "next/server";
import db, { ensureSchema } from "@/lib/db";
import { discoverMovies } from "@/lib/tmdb";

const DEFAULT_USER_ID = 1;
const DEFAULT_REGION = "US";

export async function GET() {
  await ensureSchema();
  
  const servicesResult = await db.execute(
    `SELECT provider_id FROM user_service WHERE user_id = ? AND region = ?`,
    [DEFAULT_USER_ID, DEFAULT_REGION]
  );
  const providerIds = (servicesResult.rows as any[]).map((s) => s.provider_id);

  if (providerIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = await discoverMovies(providerIds, DEFAULT_REGION);

  // Filter out already-bookmarked movies
  const bookmarkedResult = await db.execute(
    `SELECT tmdb_id FROM bookmark WHERE user_id = ?`,
    [DEFAULT_USER_ID]
  );
  const bookmarked = new Set((bookmarkedResult.rows as any[]).map((b) => b.tmdb_id));

  const filtered = results.filter((r) => !bookmarked.has(r.tmdbId));

  return NextResponse.json({ results: filtered });
}
