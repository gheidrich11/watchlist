// /api/movies/bookmark
//
// POST   - add a bookmark (tmdbId required, plus denormalized display fields)
// GET    - list bookmarks, optional ?status= filter
// PATCH  - update status (want/watched/dismissed)
// DELETE - remove bookmark
//
// All operations scoped to userId=1 until auth lands.

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const DEFAULT_USER_ID = 1;
const VALID_STATUSES = ["want", "watched", "dismissed"] as const;
type Status = (typeof VALID_STATUSES)[number];

const insertStmt = db.prepare(
  `INSERT INTO bookmark (user_id, tmdb_id, title, poster_path, release_year)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(user_id, tmdb_id) DO NOTHING`
);

const getByUserTmdb = db.prepare(
  `SELECT * FROM bookmark WHERE user_id = ? AND tmdb_id = ?`
);

const updateStatusStmt = db.prepare(
  `UPDATE bookmark SET status = ?, updated_at = datetime('now') WHERE user_id = ? AND tmdb_id = ?`
);

const deleteStmt = db.prepare(
  `DELETE FROM bookmark WHERE user_id = ? AND tmdb_id = ?`
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tmdbId, title, posterPath, releaseYear } = body;

  if (typeof tmdbId !== "number" || typeof title !== "string") {
    return NextResponse.json(
      { error: "tmdbId (number) and title (string) required" },
      { status: 400 }
    );
  }

  insertStmt.run(DEFAULT_USER_ID, tmdbId, title, posterPath ?? null, releaseYear ?? null);
  const bookmark = getByUserTmdb.get(DEFAULT_USER_ID, tmdbId);

  return NextResponse.json({ bookmark });
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  let bookmarks;
  if (status && VALID_STATUSES.includes(status as Status)) {
    const stmt = db.prepare(
      `SELECT * FROM bookmark WHERE user_id = ? AND status = ? ORDER BY created_at DESC`
    );
    bookmarks = stmt.all(DEFAULT_USER_ID, status);
  } else {
    const stmt = db.prepare(
      `SELECT * FROM bookmark WHERE user_id = ? ORDER BY created_at DESC`
    );
    bookmarks = stmt.all(DEFAULT_USER_ID);
  }

  return NextResponse.json({ bookmarks });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { tmdbId, status } = body;

  if (typeof tmdbId !== "number" || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "tmdbId (number) and status (want|watched|dismissed) required" },
      { status: 400 }
    );
  }

  updateStatusStmt.run(status, DEFAULT_USER_ID, tmdbId);
  const bookmark = getByUserTmdb.get(DEFAULT_USER_ID, tmdbId);

  return NextResponse.json({ bookmark });
}

export async function DELETE(req: NextRequest) {
  const tmdbId = Number(req.nextUrl.searchParams.get("tmdbId"));
  const status = req.nextUrl.searchParams.get("status");

  if (status && VALID_STATUSES.includes(status as Status)) {
    // Bulk delete by status
    const bulkDelete = db.prepare(
      `DELETE FROM bookmark WHERE user_id = ? AND status = ?`
    );
    bulkDelete.run(DEFAULT_USER_ID, status);
    return NextResponse.json({ ok: true });
  }

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId or status required" }, { status: 400 });
  }

  deleteStmt.run(DEFAULT_USER_ID, tmdbId);

  return NextResponse.json({ ok: true });
}
