import { POSTER_BASE } from "../lib/constants";

// ─── Poster Card (for scroll rows) ───────────────────────────────────────────

export function PosterCard({
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
