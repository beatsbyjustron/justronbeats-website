"use client";

import { useAuth } from "@/components/auth-provider";

export function FavoriteButton({ beatId, withLabel = false, className = "" }: { beatId: string; withLabel?: boolean; className?: string }) {
  const { enabled, isFavorite, toggleFavorite } = useAuth();
  if (!enabled) return null;
  const saved = isFavorite(beatId);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggleFavorite(beatId);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved beats" : "Save beat"}
      title={saved ? "Saved" : "Save beat"}
      className={`inline-flex items-center gap-1.5 rounded-full border transition ${
        saved ? "border-rose-400/60 bg-rose-500/10 text-rose-300" : "border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      } ${withLabel ? "px-4 py-2 text-sm" : "p-2"} ${className}`}
    >
      <svg viewBox="0 0 24 24" className={withLabel ? "h-4 w-4" : "h-3.5 w-3.5"} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" />
      </svg>
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
