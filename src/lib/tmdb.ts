// TMDB client - server-side only.
// API key lives in process.env.TMDB_API_KEY and never leaves the server.
//
// Notes:
// - We use the v3 API with api_key query param (simpler than v4 bearer).
// - All functions return typed results. No `any` leaking into the app.
// - Provider data is returned raw-ish so callers can decide what to surface
//   (flatrate vs ads vs rent vs buy vs free).

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342"; // good default for posters

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set in environment");
  return key;
}

import type { SearchResult } from "../types/watchlist";
export type TmdbSearchResult = SearchResult;

export interface TmdbSearchPage {
  results: TmdbSearchResult[];
  totalResults: number;
  totalPages: number;
}

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchPage> {
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);

  const data = await res.json();
  return {
    results: (data.results ?? []).map((r: {
      id: number;
      title: string;
      release_date?: string;
      poster_path: string | null;
      overview: string;
    }) => ({
      tmdbId: r.id,
      title: r.title,
      releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
      posterPath: r.poster_path,
      posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
      overview: r.overview,
    })),
    totalResults: data.total_results ?? 0,
    totalPages: data.total_pages ?? 1,
  };
}

// Raw provider shape we store. Mirrors TMDB's structure so we keep
// the flatrate/ads/rent/buy/free categories intact.
export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbProviderResponse {
  flatrate?: TmdbProvider[];
  ads?: TmdbProvider[];
  free?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  link?: string;
}

export async function getWatchProviders(
  tmdbId: number,
  region: string = "US"
): Promise<TmdbProviderResponse | null> {
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}/watch/providers`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB providers failed: ${res.status}`);

  const data = await res.json();
  return data.results?.[region] ?? null;
}

export async function discoverMovies(
  providerIds: number[],
  region: string = "US"
): Promise<TmdbSearchResult[]> {
  if (providerIds.length === 0) return [];

  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("watch_region", region);
  url.searchParams.set("with_watch_providers", providerIds.join("|"));
  url.searchParams.set("with_watch_monetization_types", "flatrate|ads");
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: {
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
  }) => ({
    tmdbId: r.id,
    title: r.title,
    releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterPath: r.poster_path,
    posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    overview: r.overview,
  }));
}

// --- Person search (actors, directors) ---

export interface TmdbPersonResult {
  id: number;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
}

export async function searchPerson(query: string): Promise<TmdbPersonResult[]> {
  const url = new URL(`${TMDB_BASE}/search/person`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB person search failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: {
    id: number;
    name: string;
    known_for_department: string;
    profile_path: string | null;
  }) => ({
    id: r.id,
    name: r.name,
    knownForDepartment: r.known_for_department,
    profilePath: r.profile_path,
  }));
}

// --- Company search (studios like A24, Blumhouse) ---

export interface TmdbCompanyResult {
  id: number;
  name: string;
  logoPath: string | null;
  originCountry: string;
}

export async function searchCompany(query: string): Promise<TmdbCompanyResult[]> {
  const url = new URL(`${TMDB_BASE}/search/company`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB company search failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }) => ({
    id: r.id,
    name: r.name,
    logoPath: r.logo_path,
    originCountry: r.origin_country ?? "",
  }));
}

// --- Discover by person (cast or crew) ---

export async function discoverByPerson(
  personId: number,
  role: "cast" | "crew"
): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  if (role === "cast") {
    url.searchParams.set("with_cast", String(personId));
  } else {
    url.searchParams.set("with_crew", String(personId));
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB discover by person failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: {
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
  }) => ({
    tmdbId: r.id,
    title: r.title,
    releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterPath: r.poster_path,
    posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    overview: r.overview,
  }));
}

// --- Discover by company ---

export async function discoverByCompany(
  companyId: number
): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("with_companies", String(companyId));
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB discover by company failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: {
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
  }) => ({
    tmdbId: r.id,
    title: r.title,
    releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterPath: r.poster_path,
    posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    overview: r.overview,
  }));
}
