// GET /api/movies/suggest?q=...&mode=movie|actor|director|company
// Returns up to 6 lightweight autocomplete suggestions.
//   movie      → movie titles with year
//   actor/director → person names
//   company    → studio/production company names

import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchPerson, searchCompany } from "@/lib/tmdb";
import type { Suggestion } from "@/types/watchlist";

export type { Suggestion };

const MAX = 6;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const mode = req.nextUrl.searchParams.get("mode") ?? "movie";

  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    if (mode === "movie") {
      const { results } = await searchMovies(q, 1);
      const suggestions: Suggestion[] = results.slice(0, MAX).map((r) => ({
        id: r.tmdbId,
        label: r.releaseYear ? `${r.title} (${r.releaseYear})` : r.title,
        value: r.title,
      }));
      return NextResponse.json({ suggestions });
    }

    if (mode === "actor" || mode === "director") {
      const people = await searchPerson(q);
      const suggestions: Suggestion[] = people.slice(0, MAX).map((p) => ({
        id: p.id,
        label: p.name,
        value: p.name,
      }));
      return NextResponse.json({ suggestions });
    }

    if (mode === "company") {
      const companies = await searchCompany(q);
      const suggestions: Suggestion[] = companies.slice(0, MAX).map((c) => ({
        id: c.id,
        label: c.name,
        value: c.name,
      }));
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ suggestions: [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
