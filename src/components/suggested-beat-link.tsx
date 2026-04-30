"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Beat } from "@/components/types";
import { useSignedStorageUrl } from "@/components/use-signed-storage-url";

type SuggestedBeatLinkProps = {
  beat: Beat;
  /** e.g. stopPropagation when nested in a clickable card */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  compact?: boolean;
};

export function SuggestedBeatLink({ beat, onNavigate, compact }: SuggestedBeatLinkProps) {
  const coverUrl = useSignedStorageUrl(beat.coverArtUrl);

  const imgClass = compact ? "h-12 w-12 shrink-0 rounded-lg object-cover" : "h-14 w-14 shrink-0 rounded-lg object-cover";
  const shellClass = compact
    ? "flex gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 p-2 transition hover:border-zinc-600"
    : "flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-600";

  return (
    <Link href={`/beats/${beat.slug}`} className={shellClass} onClick={onNavigate}>
      {coverUrl ? (
        <img src={coverUrl} alt={beat.title} className={imgClass} loading="lazy" />
      ) : (
        <div
          className={`${imgClass} animate-pulse border border-zinc-800 bg-zinc-900`}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-zinc-200 ${compact ? "text-sm" : ""}`}>{beat.title}</p>
        <p className={`text-zinc-500 ${compact ? "text-xs" : "mt-1 text-xs"}`}>
          {beat.bpm} BPM • {beat.key}
        </p>
      </div>
    </Link>
  );
}
