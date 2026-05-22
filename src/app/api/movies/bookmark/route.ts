// /api/movies/bookmark
//
// POST   - add a bookmark (tmdbId required, plus denormalized display fields)
// GET    - list bookmarks, optional ?status= filter
// PATCH  - update status (want/watched/dismissed)
// DELETE - remove bookmark
//
// All operations scoped to userId=1 until auth lands.

import { NextRequest, NextResponse } from "next/server";
import db, { ensureSchema } from "@/lib/db";

const DEFAULT_USER_ID = 1;
const VALID_STATUSES = ["want", "watched", "dismissed"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json();
  const { tmdbId, title, posterPath, releaseYear } = body;

  if (typeof tmdbId !== "number" || typeof title !== "string") {
    return NextResponse.json(
      { error: "tmdbId (number) and title (string) required" },
      { status: 400 }
    );
  }

  await db.execute(
    `INSERT INTO bookmark (user_id, tmdb_id, title, poster_path, release_year)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, tmdb_id) DO NOTHING`,
    [DEFAULT_USER_ID, tmdbId, title, posterPath ?? null, releaseYear ?? null]
  );

  const result = await db.execute(
    `SELECT * FROM bookmark WHERE user_id = ? AND tmdb_id = ?`,
    [DEFAULT_USER_ID, tmdbId]
  );
  const bookmark = result.rows[0];

  return NextResponse.json({ bookmark });
}

export async function GET(req: NextRequest) {
  await ensureSchema();
  const status = req.nextUrl.searchParams.get("status");

  let result;
  if (status && VALID_STATUSES.includes(status as Status)) {
    result = await db.execute(
      `SELECT * FROM bookmark WHERE user_id = ? AND status = ? ORDER BY created_at DESC`,
      [DEFAULT_USER_ID, status]
    );
  } else {
    result = await db.execute(
      `SELECT * FROM bookmark WHERE user_id = ? ORDER BY created_at DESC`,
      [DEFAULT_USER_ID]
    );
  }

  return NextResponse.json({ bookmarks: result.rows });
}

export async function PATCH(req: NextRequest) {
  await ensureSchema();
  const body = await req.json();
  const { tmdbId, status } = body;

  if (typeof tmdbId !== "number" || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "tmdbId (number) and status (want|watched|dismissed) required" },
      { status: 400 }
    );
  }

  await db.execute(
    `UPDATE bookmark SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND tmdb_id = ?`,
    [status, DEFAULT_USER_ID, tmdbId]
  );

  const result = await db.execute(
    `SELECT * FROM bookmark WHERE user_id = ? AND tmdb_id = ?`,
    [DEFAULT_USER_ID, tmdbId]
  );
  const bookmark = result.rows[0];

  return NextResponse.json({ bookmark });
}

export async function DELETE(req: NextRequest) {
  await ensureSchema();
  const tmdbId = Number(req.nextUrl.searchParams.get("tmdbId"));
  const status = req.nextUrl.searchParams.get("status");

  if (status && VALID_STATUSES.includes(status as Status)) {
    // Bulk delete by status
    await db.execute(
      `DELETE FROM bookmark WHERE user_id = ? AND status = ?`,
      [DEFAULT_USER_ID, status]
    );
    return NextResponse.json({ ok: true });
  }

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId or status required" }, { status: 400 });
  }

  await db.execute(
    `DELETE FROM bookmark WHERE user_id = ? AND tmdb_id = ?`,
    [DEFAULT_USER_ID, tmdbId]
  );

  return NextResponse.json({ ok: true });
}
