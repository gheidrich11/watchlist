import type { SearchResult } from "../types/watchlist";
import { POSTER_BASE } from "../lib/constants";
import { CheckIcon } from "./icons";

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

export default SearchCard;
