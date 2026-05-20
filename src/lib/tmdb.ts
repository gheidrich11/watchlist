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

export interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  overview: string;
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);

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
