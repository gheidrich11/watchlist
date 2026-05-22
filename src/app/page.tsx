"use client";

import { useState, useEffect, useRef } from "react";

const POSTER_BASE = "https://image.tmdb.org/t/p/w185";
const LOGO_BASE = "https://image.tmdb.org/t/p/w45";

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

function Poster({ path, title, size = 92 }: { path: string | null; title: string; size?: number }) {
  if (!path) return <div style={{ width: size, height: size * 1.5, background: "#222", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 11, textAlign: "center", padding: 4, flexShrink: 0 }}>{title}</div>;
  return <img src={`${POSTER_BASE}${path}`} alt={title} style={{ width: size, height: size * 1.5, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />;
}

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

  useEffect(() => {
    fetchAvailable();
    fetchBookmarkIds();
  }, []);

  useEffect(() => {
    if (view === "services") fetchServices();
    if (view === "search") fetchRecommended();
  }, [view]);

  useEffect(() => {
    if (view === "search" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

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
    setServices((prev) => prev.map((s) => s.providerId === service.providerId ? { ...s, subscribed: newState } : s));
    await fetch("/api/movies/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: service.providerId, providerName: service.providerName, subscribed: newState }),
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
    setBookmarkedIds(new Set((data.bookmarks ?? []).map((b: Bookmark) => b.tmdb_id)));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearchEntity(null);
    const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query.trim())}&mode=${searchMode}`);
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

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#e8e8e8", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: "0.5rem", fontSize: "1.5rem" }}>Watchlist</h1>

      <nav style={{ marginBottom: "1.5rem", display: "flex", gap: "0.25rem", borderBottom: "1px solid #333", paddingBottom: "0.5rem" }}>
        {([["available", "Tonight"], ["watchlist", "Full List"], ["search", "+ Add"], ["services", "Services"]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "0.4rem 1rem",
              background: view === v ? "#333" : "transparent",
              color: view === v ? "#fff" : "#888",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* SEARCH VIEW */}
      {view === "search" && (
        <div>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
            {([["movie", "Movie"], ["actor", "Actor"], ["director", "Director"], ["company", "Studio"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => { setSearchMode(mode); setSearchResults([]); setSearchEntity(null); inputRef.current?.focus(); }}
                style={{
                  padding: "0.3rem 0.7rem",
                  background: searchMode === mode ? "#2563eb" : "#222",
                  color: searchMode === mode ? "#fff" : "#888",
                  border: searchMode === mode ? "1px solid #2563eb" : "1px solid #444",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim() === "") { setSearchResults([]); setSearchEntity(null); }
              }}
              placeholder={searchMode === "movie" ? "Search movies..." : searchMode === "actor" ? "Search by actor..." : searchMode === "director" ? "Search by director..." : "Search by studio..."}
              style={{ padding: "0.5rem 0.75rem", flex: 1, background: "#222", border: "1px solid #444", borderRadius: 4, color: "#eee", fontSize: "1rem" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") { setQuery(""); setSearchResults([]); setSearchEntity(null); }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSearchResults([]); setSearchEntity(null); inputRef.current?.focus(); }}
                style={{ padding: "0.5rem 0.75rem", background: "#333", color: "#aaa", border: "none", borderRadius: 4, cursor: "pointer" }}
              >
                Clear
              </button>
            )}
            <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
              {loading ? "..." : "Search"}
            </button>
          </form>

          {searchEntity && searchResults.length > 0 && (
            <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "1rem" }}>Showing movies for <strong style={{ color: "#e8e8e8" }}>{searchEntity}</strong></p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {searchResults.map((r) => (
              <div key={r.tmdbId} style={{ display: "flex", gap: "0.75rem", padding: "0.75rem", background: "#1a1a1a", borderRadius: 6 }}>
                <Poster path={r.posterPath} title={r.title} size={72} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.title} {r.releaseYear && <span style={{ color: "#888", fontWeight: 400 }}>({r.releaseYear})</span>}</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 4, lineHeight: 1.3 }}>{r.overview.slice(0, 100)}{r.overview.length > 100 && "..."}</div>
                  <div style={{ marginTop: 8 }}>
                    {bookmarkedIds.has(r.tmdbId) ? (
                      <span style={{ color: "#4ade80", fontSize: "0.8rem" }}>✓ Added</span>
                    ) : (
                      <button onClick={() => addBookmark(r)} style={{ padding: "0.25rem 0.6rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: "0.8rem" }}>+ Add</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations when no search active */}
          {searchResults.length === 0 && !query && recommended.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Popular on Your Services</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                {recommended.map((r) => (
                  <div key={r.tmdbId} style={{ display: "flex", gap: "0.75rem", padding: "0.75rem", background: "#1a1a1a", borderRadius: 6 }}>
                    <Poster path={r.posterPath} title={r.title} size={72} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.title} {r.releaseYear && <span style={{ color: "#888", fontWeight: 400 }}>({r.releaseYear})</span>}</div>
                      <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 4, lineHeight: 1.3 }}>{r.overview.slice(0, 100)}{r.overview.length > 100 && "..."}</div>
                      <div style={{ marginTop: 8 }}>
                        {bookmarkedIds.has(r.tmdbId) ? (
                          <span style={{ color: "#4ade80", fontSize: "0.8rem" }}>✓ Added</span>
                        ) : (
                          <button onClick={() => addBookmark(r)} style={{ padding: "0.25rem 0.6rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: "0.8rem" }}>+ Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AVAILABLE TONIGHT VIEW */}
      {view === "available" && (
        <div>
          {providers.filter((p) => p.movies.length > 0).length === 0 && otherProviders.filter((p) => p.movies.length > 0).length === 0 && unavailable.length === 0 && (
            <p style={{ color: "#888" }}>No bookmarks yet. Switch to &quot;+ Add&quot; to search for movies.</p>
          )}

          {/* Subscribed services */}
          {providers
            .filter((p) => p.movies.length > 0)
            .map((p) => (
              <div key={p.providerName} style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1rem", color: "#aaa", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {p.logoPath && <img src={`${LOGO_BASE}${p.logoPath}`} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />}
                  {p.providerName}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {p.movies.map((m) => (
                    <div key={`${p.providerName}-${m.tmdbId}`} style={{ width: 110, position: "relative" }}>
                      <Poster path={m.posterPath} title={m.title} size={110} />
                      <div style={{ marginTop: 4, fontSize: "0.7rem", lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                        {m.availabilityType === "ads" && <div style={{ color: "#888", fontSize: "0.65rem" }}>w/ ads</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Divider between subscribed and unsubscribed */}
          {otherProviders.filter((p) => p.movies.length > 0).length > 0 && (
            <div style={{ margin: "2rem 0 1.5rem", borderTop: "2px solid #333", position: "relative" }}>
              <span style={{ position: "absolute", top: -10, left: 0, background: "#111", paddingRight: "0.75rem", fontSize: "0.75rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Not Subscribed</span>
            </div>
          )}

          {/* Non-subscribed services */}
          {otherProviders
            .filter((p) => p.movies.length > 0)
            .map((p) => (
              <div key={p.providerName} style={{ marginBottom: "2rem", opacity: 0.7 }}>
                <h3 style={{ fontSize: "1rem", color: "#666", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {p.logoPath && <img src={`${LOGO_BASE}${p.logoPath}`} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />}
                  {p.providerName}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {p.movies.map((m) => (
                    <div key={`${p.providerName}-${m.tmdbId}`} style={{ width: 110, position: "relative" }}>
                      <Poster path={m.posterPath} title={m.title} size={110} />
                      <div style={{ marginTop: 4, fontSize: "0.7rem", lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                        {m.availabilityType === "ads" && <div style={{ color: "#888", fontSize: "0.65rem" }}>w/ ads</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {unavailable.length > 0 && (
            <div style={{ marginTop: "2rem", borderTop: "2px solid #333", paddingTop: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#555", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Not Streaming Anywhere</h3>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {unavailable.map((m) => (
                  <div key={m.tmdbId} style={{ width: 110, opacity: 0.5 }}>
                    <Poster path={m.posterPath} title={m.title} size={110} />
                    <div style={{ marginTop: 4, fontSize: "0.7rem", lineHeight: 1.2 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                      {m.rentOptions.length > 0 && (
                        <div style={{ color: "#888", fontSize: "0.6rem", marginTop: 2 }}>
                          Rent: {m.rentOptions.map((r) => r.providerName).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL WATCHLIST VIEW */}
      {view === "watchlist" && (
        <div>
          {bookmarks.length === 0 && <p style={{ color: "#888" }}>No bookmarks yet.</p>}

          {/* Want section */}
          {bookmarks.filter((b) => b.status === "want").length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {bookmarks.filter((b) => b.status === "want").map((b) => (
                  <div key={b.id} style={{ width: 110, position: "relative" }}>
                    <Poster path={b.poster_path} title={b.title} size={110} />
                    <div style={{ marginTop: 4, fontSize: "0.7rem", lineHeight: 1.2 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    </div>
                    <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 2, flexDirection: "column" }}>
                      <button onClick={() => updateStatus(b.tmdb_id, "watched")} title="Watched" style={{ background: "rgba(0,0,0,0.7)", color: "#4ade80", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                      <button onClick={() => updateStatus(b.tmdb_id, "dismissed")} title="Dismiss" style={{ background: "rgba(0,0,0,0.7)", color: "#888", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: "0.65rem" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watched section */}
          {bookmarks.filter((b) => b.status === "watched").length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1rem", color: "#666", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Watched</h3>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {bookmarks.filter((b) => b.status === "watched").map((b) => (
                  <div key={b.id} style={{ width: 92, opacity: 0.7, position: "relative" }}>
                    <Poster path={b.poster_path} title={b.title} size={92} />
                    <div style={{ marginTop: 4, fontSize: "0.65rem", lineHeight: 1.2 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                    </div>
                    <button onClick={() => removeBookmark(b.tmdb_id)} title="Remove" style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)", color: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.55rem" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dismissed section */}
          {bookmarks.filter((b) => b.status === "dismissed").length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "1rem", color: "#555", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Dismissed</h3>
                <button onClick={async () => { if (!confirm("Remove all dismissed movies?")) return; await fetch("/api/movies/bookmark?status=dismissed", { method: "DELETE" }); fetchBookmarkIds(); fetchAvailable(); }} style={{ padding: "0.25rem 0.6rem", background: "#2a1a1a", color: "#ef4444", border: "1px solid #4a2020", borderRadius: 4, cursor: "pointer", fontSize: "0.7rem" }}>Clear All</button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {bookmarks.filter((b) => b.status === "dismissed").map((b) => (
                  <div key={b.id} style={{ width: 72, opacity: 0.4, position: "relative" }}>
                    <Poster path={b.poster_path} title={b.title} size={72} />
                    <div style={{ position: "absolute", top: 2, right: 2, display: "flex", gap: 2 }}>
                      <button onClick={() => updateStatus(b.tmdb_id, "want")} title="Restore" style={{ background: "rgba(0,0,0,0.7)", color: "#60a5fa", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.55rem" }}>↩</button>
                      <button onClick={() => removeBookmark(b.tmdb_id)} title="Remove" style={{ background: "rgba(0,0,0,0.7)", color: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.55rem" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERVICES VIEW */}
      {view === "services" && (
        <div>
          <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.85rem" }}>Toggle the streaming services you subscribe to. The &quot;Tonight&quot; view uses this to separate what&apos;s available on your services vs. others.</p>
          <div style={{ display: "grid", gap: "0.5rem", maxWidth: 400 }}>
            {services.map((s) => (
              <button
                key={s.providerId}
                onClick={() => toggleService(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 1rem",
                  background: s.subscribed ? "#1a2e1a" : "#1a1a1a",
                  border: s.subscribed ? "1px solid #2d5a2d" : "1px solid #333",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: s.subscribed ? "#4ade80" : "#888",
                  fontSize: "0.9rem",
                  textAlign: "left",
                }}
              >
                <span style={{ width: 20, textAlign: "center" }}>{s.subscribed ? "✓" : ""}</span>
                {s.logoPath && <img src={`${LOGO_BASE}${s.logoPath}`} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />}
                <span>{s.providerName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
