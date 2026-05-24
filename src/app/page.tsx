"use client";

import { useState, useEffect, useRef } from "react";
import { POSTER_BASE, LOGO_BASE } from "../lib/constants";
import type { SearchResult, Suggestion, ProviderGroup, UnavailableEntry, Bookmark, ServiceEntry, View } from "../types/watchlist";
import { FilmIcon, ListIcon, PlusCircleIcon, TvIcon, XIcon, SearchIcon, CheckIcon } from "../components/icons";
import { PosterCard } from "../components/PosterCard";
import SearchCard from "../components/SearchCard";
import AccordionHeader from "../components/AccordionHeader";
import WatchlistPoster from "../components/WatchlistPoster";

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
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
      setSearchPage(1);
      setSearchTotalResults(0);
      setSearchTotalPages(1);
      setSuggestions([]);
      setShowSuggestions(false);
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
    setSearchPage(1);
    setSearchTotalResults(0);
    setSearchTotalPages(1);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [searchMode]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || searchResults.length > 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/suggest?q=${encodeURIComponent(query.trim())}&mode=${searchMode}`
        );
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSuggestions((data.suggestions ?? []).length > 0);
      } catch {
        // ignore suggestion errors silently
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchMode, searchResults.length]);

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

  async function executeSearch(q: string, mode: string, page: number) {
    setLoading(true);
    setShowSuggestions(false);
    const res = await fetch(
      `/api/movies/search?q=${encodeURIComponent(q)}&mode=${mode}&page=${page}`
    );
    const data = await res.json();
    setSearchResults(data.results ?? []);
    if (mode === "movie") {
      setSearchPage(page);
      setSearchTotalResults(data.totalResults ?? 0);
      setSearchTotalPages(data.totalPages ?? 1);
    } else {
      setSearchPage(1);
      setSearchTotalResults(data.results?.length ?? 0);
      setSearchTotalPages(1);
    }
    if (data.entity) setSearchEntity(data.entity.name);
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchEntity(null);
    await executeSearch(query.trim(), searchMode, 1);
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
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none z-10" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim() === "") {
                      setSearchResults([]);
                      setSearchEntity(null);
                      setSearchPage(1);
                      setSearchTotalResults(0);
                      setSearchTotalPages(1);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQuery("");
                      setSearchResults([]);
                      setSearchEntity(null);
                      setSearchPage(1);
                      setSearchTotalResults(0);
                      setSearchTotalPages(1);
                      setSuggestions([]);
                      setShowSuggestions(false);
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
                      setSearchPage(1);
                      setSearchTotalResults(0);
                      setSearchTotalPages(1);
                      setSuggestions([]);
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors duration-150 cursor-pointer z-10"
                    aria-label="Clear search"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}

                {/* Autocomplete dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/40 overflow-hidden z-50">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuery(s.value);
                            setShowSuggestions(false);
                            setSuggestions([]);
                            setSearchEntity(null);
                            executeSearch(s.value, searchMode, 1);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors duration-100 cursor-pointer"
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
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

            {/* Entity label + result count */}
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between mb-4 flex-wrap gap-y-1">
                <p className="text-zinc-500 text-sm">
                  {searchEntity ? (
                    <>
                      Results for{" "}
                      <span className="text-zinc-300 font-semibold">{searchEntity}</span>
                    </>
                  ) : null}
                </p>
                {searchMode === "movie" && searchTotalResults > 0 && (
                  <p className="text-zinc-600 text-xs tabular-nums">
                    {((searchPage - 1) * 20 + 1).toLocaleString()}–
                    {Math.min(searchPage * 20, searchTotalResults).toLocaleString()}
                    {" "}of{" "}
                    <span className="text-zinc-400">{searchTotalResults.toLocaleString()}</span>
                  </p>
                )}
              </div>
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

            {/* Pagination controls */}
            {searchMode === "movie" && searchTotalPages > 1 && searchResults.length > 0 && (
              <div className="flex items-center justify-between mt-5 gap-3">
                <button
                  type="button"
                  disabled={searchPage <= 1 || loading}
                  onClick={() => executeSearch(query.trim(), searchMode, searchPage - 1)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="text-zinc-600 text-xs tabular-nums whitespace-nowrap">
                  {searchPage} / {searchTotalPages}
                </span>
                <button
                  type="button"
                  disabled={searchPage >= searchTotalPages || loading}
                  onClick={() => executeSearch(query.trim(), searchMode, searchPage + 1)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                >
                  Next →
                </button>
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
