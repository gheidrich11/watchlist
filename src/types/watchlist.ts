export interface SearchResult {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  overview: string;
}

export interface MovieEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  availabilityType: string;
}

export interface ProviderGroup {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  movies: MovieEntry[];
}

export interface UnavailableEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  rentOptions: { providerName: string }[];
}

export interface Bookmark {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: number | null;
  status: string;
}

export interface ServiceEntry {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  subscribed: boolean;
}

export type View = "available" | "watchlist" | "search" | "services";
