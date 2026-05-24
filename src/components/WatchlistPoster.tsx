import { Bookmark } from "../types/watchlist";
import { POSTER_BASE } from "../lib/constants";
import { EyeIcon, XIcon, UndoIcon } from "./icons";

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

export default WatchlistPoster;
