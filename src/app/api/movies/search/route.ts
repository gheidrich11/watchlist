// GET /api/movies/search?q=dune&mode=movie|actor|director|company
// Proxies TMDB search. Returns enough info to disambiguate (year, poster).
//
// Modes:
//   movie (default) - search movies by title
//   actor - search person, then discover movies with that actor
//   director - search person, then discover movies directed by them
//   company - search company, then discover movies produced by them

import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchPerson, searchCompany, discoverByPerson, discoverByCompany } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const mode = req.nextUrl.searchParams.get("mode") ?? "movie";

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (mode === "movie") {
      const results = await searchMovies(q.trim());
      return NextResponse.json({ results });
    }

    if (mode === "actor" || mode === "director") {
      const people = await searchPerson(q.trim());
      if (people.length === 0) {
        return NextResponse.json({ results: [], entity: null });
      }
      // Use top match
      const person = people[0];
      const role = mode === "actor" ? "cast" : "crew";
      const results = await discoverByPerson(person.id, role);
      return NextResponse.json({ results, entity: { id: person.id, name: person.name } });
    }

    if (mode === "company") {
      const companies = await searchCompany(q.trim());
      if (companies.length === 0) {
        return NextResponse.json({ results: [], entity: null });
      }
      // Prefer US-origin company when multiple share the same name
      const exactMatches = companies.filter((c) => c.name.toLowerCase() === q.trim().toLowerCase());
      const company = exactMatches.find((c) => c.originCountry === "US")
        || exactMatches[0]
        || companies.find((c) => c.originCountry === "US")
        || companies[0];
      const results = await discoverByCompany(company.id);
      return NextResponse.json({ results, entity: { id: company.id, name: company.name } });
    }

    return NextResponse.json({ results: [] });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
