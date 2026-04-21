"use client";

import { useMemo, useState } from "react";
import { BeatCard } from "@/components/beat-card";
import { Beat } from "@/components/types";

type BeatStoreProps = {
  beats: Beat[];
  initiallyVisible?: number;
};

export function BeatStore({ beats, initiallyVisible = 3 }: BeatStoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null);

  const visibleBeats = useMemo(
    () => (expanded ? beats : beats.slice(0, initiallyVisible)),
    [beats, expanded, initiallyVisible]
  );

  const hasMore = beats.length > initiallyVisible;

  const getSuggestions = (currentBeat: Beat) => {
    return beats
      .filter((beat) => beat.id !== currentBeat.id)
      .map((beat) => {
        const bpmDiff = Math.abs(beat.bpm - currentBeat.bpm);
        const sharedTags = beat.tags.filter((tag) => currentBeat.tags.includes(tag)).length;
        const score = sharedTags * 10 - bpmDiff;
        return { beat, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.beat);
  };

  return (
    <section className="space-y-4">
      <div className="space-y-4 transition-all duration-500">
        {visibleBeats.map((beat) => (
          <BeatCard
            key={beat.id}
            beat={beat}
            isExpanded={expandedBeatId === beat.id}
            onToggle={() => setExpandedBeatId((prev) => (prev === beat.id ? null : beat.id))}
            suggestions={getSuggestions(beat)}
          />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          {expanded ? "Show less" : "View more beats"}
        </button>
      )}
    </section>
  );
}
