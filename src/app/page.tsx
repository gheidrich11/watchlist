"use client";

import { useState, useEffect, useRef } from "react";

const POSTER_BASE = "https://image.tmdb.org/t/p/w185";
const LOGO_BASE = "https://image.tmdb.org/t/p/w45";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  overview: string;
}

interface MovieEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  availabilityType: string;
}

interface ProviderGroup {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  movies: MovieEntry[];
}

interface UnavailableEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  rentOptions: { providerName: string }[];
}

interface Bookmark {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: number | null;
  status: string;
}

interface ServiceEntry {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  subscribed: boolean;
}

type View = "available" | "watchlist" | "search" | "services";

// ─── Icons ────────────────────────────────────────────────────────────────────

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function TvIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <polyline points="8 21 12 17 16 21" />
    </svg>
  );
}

function ChevronDownIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""} ${className ?? ""}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Poster Card (for scroll rows) ───────────────────────────────────────────

function PosterCard({
  path,
  title,
  badge,
  width = "w-28",
}: {
  path: string | null;
  title: string;
  badge?: string;
  width?: string;
}) {
  return (
    <div className={`${width} flex-shrink-0 group`}>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-zinc-800 group-hover:ring-violet-500/40 transition-all duration-200 aspect-[2/3]">
        {path ? (
          <img
            src={`${POSTER_BASE}${path}`}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 text-[10px] text-center p-2 leading-tight">
            {title}
          </div>
        )}
        {badge && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-zinc-300 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500 truncate leading-tight group-hover:text-zinc-300 transition-colors duration-150">
        {title}
      </p>
    </div>
  );
}

// ─── Watchlist Poster (with always-visible action buttons) ───────────────────

function WatchlistPoster({
  bookmark,
  size = "lg",
  onUpdate,
  onRemove,
}: {
  bookmark: Bookmark;
  size?: "sm" | "md" | "lg";
  onUpdate: (tmdbId: number, status: string) => void;
  onRemove: (tmdbId: number) => void;
}) {
  const widthClass = size === "lg" ? "w-28" : size === "md" ? "w-24" : "w-16";

  return (
    <div className={`${widthClass} flex-shrink-0 group`}>
      <div className="relative overflow-hidden rounded-xl ring-1 ring-zinc-800 group-hover:ring-violet-500/40 transition-all duration-200 aspect-[2/3]">
        {bookmark.poster_path ? (
          <img
            src={`${POSTER_BASE}${bookmark.poster_path}`}
            alt={bookmark.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 text-[10px] text-center p-2 leading-tight">
            {bookmark.title}
          </div>
        )}

        {/* Action buttons — top-right corner, always visible */}
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
          {bookmark.status === "want" && (
            <>
              <button
                onClick={() => onUpdate(bookmark.tmdb_id, "watched")}
                title="Mark watched"
                className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-sm text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <EyeIcon className="w-3 h-3" />
              </button>
              <button
                onClick={() => onUpdate(bookmark.tmdb_id, "dismissed")}
                title="Dismiss"
                className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </>
          )}
          {bookmark.status === "watched" && (
            <button
              onClick={() => onRemove(bookmark.tmdb_id)}
              title="Remove"
              className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-sm text-red-500 hover:bg-red-950 hover:text-red-400 flex items-center justify-center transition-colors duration-150 cursor-pointer"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
          {bookmark.status === "dismissed" && (
            <>
              <button
                onClick={() => onUpdate(bookmark.tmdb_id, "want")}
                title="Restore"
                className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-sm text-blue-400 hover:bg-blue-950 hover:text-blue-300 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <UndoIcon className="w-3 h-3" />
              </button>
              <button
                onClick={() => onRemove(bookmark.tmdb_id)}
                title="Remove"
                className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-sm text-red-500 hover:bg-red-950 hover:text-red-400 flex items-center justify-center transition-colors duration-150 cursor-pointer"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500 truncate leading-tight">
        {bookmark.title}
      </p>
    </div>
  );
}

// ─── Accordion Header ─────────────────────────────────────────────────────────

function AccordionHeader({
  open,
  onToggle,
  label,
  count,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full py-3 text-left group cursor-pointer"
    >
      <div className="h-px flex-1 bg-zinc-800/80" />
      <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest whitespace-nowrap group-hover:text-zinc-400 transition-colors duration-150">
        {label}
      </span>
      <span className="text-[11px] text-zinc-700 group-hover:text-zinc-500 transition-colors duration-150">
        ({count})
      </span>
      <div className="h-px flex-1 bg-zinc-800/80" />
      <ChevronDownIcon
        open={open}
        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors duration-150"
      />
    </button>
  );
}

// ─── Search Result Card ───────────────────────────────────────────────────────

function SearchCard({
  result,
  bookmarked,
  onAdd,
}: {
  result: SearchResult;
  bookmarked: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-3 p-3 bg-zinc-900/50 rounded-xl ring-1 ring-zinc-800/60 hover:ring-zinc-700/60 transition-all duration-150">
      {result.posterPath ? (
        <img
          src={`${POSTER_BASE}${result.posterPath}`}
          alt={result.title}
          className="w-14 aspect-[2/3] object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-14 aspect-[2/3] bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center text-zinc-600 text-[9px] text-center p-1 leading-tight">
          {result.title}
        </div>
      )}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-zinc-100 leading-tight">
            {result.title}
          </span>
          {result.releaseYear && (
            <span className="text-xs text-zinc-600">{result.releaseYear}</span>
          )}
        </div>
        {result.overview && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">
            {result.overview}
          </p>
        )}
        <div className="mt-2.5">
          {bookmarked ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
              <CheckIcon className="w-3 h-3" />
              Added
            </span>
          ) : (
            <button
              onClick={onAdd}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [view, setView] = useState<View>("available");
  const [providers, setProviders] = useState<ProviderGroup[]>([]);
  const [otherProviders, setOtherProviders] = useState<ProviderGroup[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [recommended, setRecommended] = useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = useState<"movie" | "actor" | "director" | "company">("movie");
  const [searchEntity, setSearchEntity] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Accordion states — all closed by default
  const [otherProvidersOpen, setOtherProvidersOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const [watchedOpen, setWatchedOpen] = useState(false);
  const [dismissedOpen, setDismissedOpen] = useState(false);

  useEffect(() => {
    fetchAvailable();
    fetchBookmarkIds();
  }, []);

  useEffect(() => {
    if (view === "services") fetchServices();
    if (view === "search") fetchRecommended();
    if (view !== "search") {
      setQuery("");
      setSearchResults([]);
      setSearchEntity(null);
    }
  }, [view]);

  useEffect(() => {
    if (view === "search" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  useEffect(() => {
    setQuery("");
    setSearchResults([]);
    setSearchEntity(null);
    inputRef.current?.focus();
  }, [searchMode]);

  async function fetchServices() {
    const res = await fetch("/api/movies/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  async function fetchRecommended() {
    const res = await fetch("/api/movies/discover");
    const data = await res.json();
    setRecommended(data.results ?? []);
  }

  async function toggleService(service: ServiceEntry) {
    const newState = !service.subscribed;
    setServices((prev) =>
      prev.map((s) =>
        s.providerId === service.providerId ? { ...s, subscribed: newState } : s
      )
    );
    await fetch("/api/movies/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: service.providerId,
        providerName: service.providerName,
        subscribed: newState,
      }),
    });
    fetchAvailable();
  }

  async function fetchAvailable() {
    const res = await fetch("/api/movies/available");
    const data = await res.json();
    setProviders(data.providers ?? []);
    setOtherProviders(data.otherProviders ?? []);
    setUnavailable(data.unavailable ?? []);
  }

  async function fetchBookmarkIds() {
    const res = await fetch("/api/movies/bookmark");
    const data = await res.json();
    setBookmarks(data.bookmarks ?? []);
    setBookmarkedIds(
      new Set((data.bookmarks ?? []).map((b: Bookmark) => b.tmdb_id))
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearchEntity(null);
    const res = await fetch(
      `/api/movies/search?q=${encodeURIComponent(query.trim())}&mode=${searchMode}`
    );
    const data = await res.json();
    setSearchResults(data.results ?? []);
    if (data.entity) setSearchEntity(data.entity.name);
    setLoading(false);
  }

  async function addBookmark(result: SearchResult) {
    await fetch("/api/movies/bookmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: result.tmdbId,
        title: result.title,
        posterPath: result.posterPath,
        releaseYear: result.releaseYear,
      }),
    });
    setBookmarkedIds((prev) => new Set(prev).add(result.tmdbId));
    fetchBookmarkIds();
    fetchAvailable();
  }

  async function updateStatus(tmdbId: number, status: string) {
    await fetch("/api/movies/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, status }),
    });
    fetchBookmarkIds();
    fetchAvailable();
  }

  async function removeBookmark(tmdbId: number) {
    if (!confirm("Remove this movie from your list?")) return;
    await fetch(`/api/movies/bookmark?tmdbId=${tmdbId}`, { method: "DELETE" });
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      next.delete(tmdbId);
      return next;
    });
    fetchBookmarkIds();
    fetchAvailable();
  }

  // ─── Nav config ─────────────────────────────────────────────────────────────

  const navItems = [
    { view: "available" as View, label: "Tonight", Icon: FilmIcon },
    { view: "watchlist" as View, label: "My List", Icon: ListIcon },
    { view: "search" as View, label: "Add", Icon: PlusCircleIcon },
    { view: "services" as View, label: "Services", Icon: TvIcon },
  ];

  const activeNav = navItems.find((n) => n.view === view)!;
  const ActiveIcon = activeNav.Icon;

  // ─── Derived data ────────────────────────────────────────────────────────────

  const wantBookmarks = bookmarks.filter((b) => b.status === "want");
  const watchedBookmarks = bookmarks.filter((b) => b.status === "watched");
  const dismissedBookmarks = bookmarks.filter((b) => b.status === "dismissed");
  const activeProviders = providers.filter((p) => p.movies.length > 0);
  const activeOtherProviders = otherProviders.filter((p) => p.movies.length > 0);
  const otherProviderMovieCount = activeOtherProviders.reduce(
    (acc, p) => acc + p.movies.length,
    0
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">

      {/* ── Desktop Header ───────────────────────────────────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-6 h-16 border-b border-zinc-800/50 sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <FilmIcon className="w-5 h-5 text-violet-400" />
          <span className="text-base font-bold tracking-tight text-zinc-100">
            Watchlist
          </span>
        </div>
        <nav className="flex gap-1">
          {navItems.map(({ view: v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                view === v
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Mobile Page Title ────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center gap-2.5 px-4 pb-1" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}>
        <ActiveIcon className="w-5 h-5 text-violet-400" />
        <h1 className="text-2xl font-bold tracking-tight">{activeNav.label}</h1>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 pt-3 md:pt-6 pb-28 md:pb-10">

        {/* ╔══════════════════════════════════════════════════════════════════╗ */}
        {/* ║  SEARCH VIEW                                                     ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════╝ */}
        {view === "search" && (
          <div>
            {/* Mode pills */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(
                [
                  ["movie", "Movie"],
                  ["actor", "Actor"],
                  ["director", "Director"],
                  ["company", "Studio"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    searchMode === mode
                      ? "bg-violet-600 text-white ring-1 ring-violet-500/60 shadow-lg shadow-violet-900/30"
                      : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/70 ring-1 ring-zinc-700/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim() === "") {
                      setSearchResults([]);
                      setSearchEntity(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("");
                      setSearchResults([]);
                      setSearchEntity(null);
                    }
                  }}
                  placeholder={
                    searchMode === "movie"
                      ? "Search movies…"
                      : searchMode === "actor"
                      ? "Search by actor…"
                      : searchMode === "director"
                      ? "Search by director…"
                      : "Search by studio…"
                  }
                  className="w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-700/60 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all duration-150"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSearchResults([]);
                      setSearchEntity(null);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors duration-150 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer shadow-lg shadow-violet-900/30"
              >
                {loading ? "…" : "Search"}
              </button>
            </form>

            {/* Entity label */}
            {searchEntity && searchResults.length > 0 && (
              <p className="text-zinc-500 text-sm mb-4">
                Results for{" "}
                <span className="text-zinc-300 font-semibold">{searchEntity}</span>
              </p>
            )}

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2.5">
                {searchResults.map((r) => (
                  <SearchCard
                    key={r.tmdbId}
                    result={r}
                    bookmarked={bookmarkedIds.has(r.tmdbId)}
                    onAdd={() => addBookmark(r)}
                  />
                ))}
              </div>
            )}

            {/* Recommendations when idle */}
            {searchResults.length === 0 && !query && recommended.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
                  Popular on Your Services
                </h3>
                <div className="space-y-2.5">
                  {recommended.map((r) => (
                    <SearchCard
                      key={r.tmdbId}
                      result={r}
                      bookmarked={bookmarkedIds.has(r.tmdbId)}
                      onAdd={() => addBookmark(r)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════╗ */}
        {/* ║  TONIGHT VIEW                                                    ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════╝ */}
        {view === "available" && (
          <div className="space-y-6">
            {/* Empty state */}
            {activeProviders.length === 0 &&
              activeOtherProviders.length === 0 &&
              unavailable.length === 0 && (
                <div className="flex flex-col items-center justify-center py-28 text-center">
                  <FilmIcon className="w-14 h-14 text-zinc-800 mb-4" />
                  <p className="text-zinc-600 text-sm">Nothing on your list yet.</p>
                  <button
                    onClick={() => setView("search")}
                    className="mt-3 text-violet-400 text-sm hover:text-violet-300 transition-colors duration-150 cursor-pointer font-medium"
                  >
                    + Add movies
                  </button>
                </div>
              )}

            {/* ── Subscribed providers (always open) */}
            {activeProviders.map((p) => (
              <section key={p.providerName}>
                <div className="flex items-center gap-2 mb-3">
                  {p.logoPath && (
                    <img
                      src={`${LOGO_BASE}${p.logoPath}`}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  )}
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {p.providerName}
                  </h2>
                </div>
                {/* Netflix-style horizontal scroll strip */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {p.movies.map((m) => (
                    <PosterCard
                      key={`${p.providerName}-${m.tmdbId}`}
                      path={m.posterPath}
                      title={m.title}
                      badge={m.availabilityType === "ads" ? "Ads" : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* ── Not on Your Services accordion (closed by default) */}
            {activeOtherProviders.length > 0 && (
              <div>
                <AccordionHeader
                  open={otherProvidersOpen}
                  onToggle={() => setOtherProvidersOpen((o) => !o)}
                  label="Not on Your Services"
                  count={otherProviderMovieCount}
                />
                {otherProvidersOpen && (
                  <div className="space-y-6 mt-2 opacity-55">
                    {activeOtherProviders.map((p) => (
                      <section key={p.providerName}>
                        <div className="flex items-center gap-2 mb-3">
                          {p.logoPath && (
                            <img
                              src={`${LOGO_BASE}${p.logoPath}`}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover"
                            />
                          )}
                          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            {p.providerName}
                          </h2>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                          {p.movies.map((m) => (
                            <PosterCard
                              key={`${p.providerName}-${m.tmdbId}`}
                              path={m.posterPath}
                              title={m.title}
                              badge={m.availabilityType === "ads" ? "Ads" : undefined}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Not Streaming Anywhere accordion (closed by default) */}
            {unavailable.length > 0 && (
              <div>
                <AccordionHeader
                  open={unavailableOpen}
                  onToggle={() => setUnavailableOpen((o) => !o)}
                  label="Not Streaming Anywhere"
                  count={unavailable.length}
                />
                {unavailableOpen && (
                  <div className="flex gap-3 flex-wrap mt-2 opacity-45">
                    {unavailable.map((m) => (
                      <div key={m.tmdbId} className="w-24 flex-shrink-0">
                        <div className="relative overflow-hidden rounded-xl ring-1 ring-zinc-800 aspect-[2/3]">
                          {m.posterPath ? (
                            <img
                              src={`${POSTER_BASE}${m.posterPath}`}
                              alt={m.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-[9px] text-center p-2 leading-tight">
                              {m.title}
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[10px] text-zinc-600 truncate leading-tight">
                          {m.title}
                        </p>
                        {m.rentOptions.length > 0 && (
                          <p className="text-[9px] text-zinc-700 truncate mt-0.5">
                            Rent: {m.rentOptions.map((r) => r.providerName).join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════╗ */}
        {/* ║  WATCHLIST VIEW                                                  ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════╝ */}
        {view === "watchlist" && (
          <div className="space-y-4">
            {/* Empty state */}
            {bookmarks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <ListIcon className="w-14 h-14 text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-sm">Your list is empty.</p>
                <button
                  onClick={() => setView("search")}
                  className="mt-3 text-violet-400 text-sm hover:text-violet-300 transition-colors duration-150 cursor-pointer font-medium"
                >
                  + Add some movies
                </button>
              </div>
            )}

            {/* Want to Watch (always open) */}
            {wantBookmarks.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  Want to Watch
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {wantBookmarks.map((b) => (
                    <WatchlistPoster
                      key={b.id}
                      bookmark={b}
                      size="lg"
                      onUpdate={updateStatus}
                      onRemove={removeBookmark}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Watched accordion */}
            {watchedBookmarks.length > 0 && (
              <div>
                <AccordionHeader
                  open={watchedOpen}
                  onToggle={() => setWatchedOpen((o) => !o)}
                  label="Watched"
                  count={watchedBookmarks.length}
                />
                {watchedOpen && (
                  <div className="flex gap-3 flex-wrap mt-2 opacity-65">
                    {watchedBookmarks.map((b) => (
                      <WatchlistPoster
                        key={b.id}
                        bookmark={b}
                        size="md"
                        onUpdate={updateStatus}
                        onRemove={removeBookmark}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dismissed accordion */}
            {dismissedBookmarks.length > 0 && (
              <div>
                <AccordionHeader
                  open={dismissedOpen}
                  onToggle={() => setDismissedOpen((o) => !o)}
                  label="Dismissed"
                  count={dismissedBookmarks.length}
                />
                {dismissedOpen && (
                  <>
                    <div className="flex justify-end mb-2 mt-1">
                      <button
                        onClick={async () => {
                          if (!confirm("Remove all dismissed movies?")) return;
                          await fetch("/api/movies/bookmark?status=dismissed", {
                            method: "DELETE",
                          });
                          fetchBookmarkIds();
                          fetchAvailable();
                        }}
                        className="text-xs text-red-500/60 hover:text-red-400 border border-red-900/40 hover:border-red-700/50 px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex gap-2.5 flex-wrap opacity-45">
                      {dismissedBookmarks.map((b) => (
                        <WatchlistPoster
                          key={b.id}
                          bookmark={b}
                          size="sm"
                          onUpdate={updateStatus}
                          onRemove={removeBookmark}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════╗ */}
        {/* ║  SERVICES VIEW                                                   ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════╝ */}
        {view === "services" && (
          <div>
            <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
              Toggle the services you subscribe to. The Tonight view shows what&apos;s
              available on your services first.
            </p>
            <div className="space-y-2 max-w-sm">
              {services.map((s) => (
                <button
                  key={s.providerId}
                  onClick={() => toggleService(s)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ring-1 transition-all duration-150 cursor-pointer text-left ${
                    s.subscribed
                      ? "bg-violet-950/50 ring-violet-700/50 text-zinc-100 shadow-glow-violet-sm"
                      : "bg-zinc-900/40 ring-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 hover:ring-zinc-700/60"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                      s.subscribed ? "bg-violet-600" : "bg-zinc-800"
                    }`}
                  >
                    {s.subscribed && <CheckIcon className="w-3 h-3 text-white" />}
                  </span>
                  {s.logoPath && (
                    <img
                      src={`${LOGO_BASE}${s.logoPath}`}
                      alt=""
                      className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium">{s.providerName}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Tab Bar ─────────────────────────────────────────────── */}
      <nav
        aria-hidden="true"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-800/50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {navItems.map(({ view: v, label, Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                view === v
                  ? "text-violet-400"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
