// /api/movies/bookmark
//
// POST   - add a bookmark (tmdbId required, plus denormalized display fields)
// GET    - list bookmarks, optional ?status= filter
// PATCH  - update status (want/watched/dismissed)
// DELETE - remove bookmark
//
// All operations scoped to userId=1 until auth lands.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = 1;
const VALID_STATUSES = ["want", "watched", "dismissed"] as const;
type Status = typeof VALID_STATUSES[number];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tmdbId, title, posterPath, releaseYear } = body;

  if (typeof tmdbId !== "number" || typeof title !== "string") {
    return NextResponse.json(
      { error: "tmdbId (number) and title (string) required" },
      { status: 400 }
    );
  }

  const bookmark = await prisma.bookmark.upsert({
    where: { userId_tmdbId: { userId: DEFAULT_USER_ID, tmdbId } },
    create: {
      userId: DEFAULT_USER_ID,
      tmdbId,
      title,
      posterPath: posterPath ?? null,
      releaseYear: releaseYear ?? null,
    },
    update: {}, // already bookmarked - no-op
  });

  return NextResponse.json({ bookmark });
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const where: { userId: number; status?: Status } = { userId: DEFAULT_USER_ID };
  if (status && VALID_STATUSES.includes(status as Status)) {
    where.status = status as Status;
  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

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

  const bookmark = await prisma.bookmark.update({
    where: { userId_tmdbId: { userId: DEFAULT_USER_ID, tmdbId } },
    data: { status },
  });

  return NextResponse.json({ bookmark });
}

export async function DELETE(req: NextRequest) {
  const tmdbId = Number(req.nextUrl.searchParams.get("tmdbId"));
  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId required" }, { status: 400 });
  }

  await prisma.bookmark.delete({
    where: { userId_tmdbId: { userId: DEFAULT_USER_ID, tmdbId } },
  });

  return NextResponse.json({ ok: true });
}
