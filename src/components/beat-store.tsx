"use client";

import { useEffect, useMemo, useState } from "react";
import { BeatCard } from "@/components/beat-card";
import { useGlobalAudioPlayer } from "@/components/global-audio-player-provider";
import { Beat } from "@/components/types";

type BeatStoreProps = {
  beats: Beat[];
  initiallyVisible?: number;
};

function normalizeTagValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

export function BeatStore({ beats, initiallyVisible = 3 }: BeatStoreProps) {
  const { setQueue } = useGlobalAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("all");
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");

  useEffect(() => {
    setQueue(beats);
  }, [beats, setQueue]);

  const filteredBeats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedTagQuery = normalizeTagValue(query);
    const min = Number(bpmMin);
    const max = Number(bpmMax);
    const hasMin = bpmMin.trim() !== "" && Number.isFinite(min);
    const hasMax = bpmMax.trim() !== "" && Number.isFinite(max);

    return beats.filter((beat) => {
      const matchesTitle = !query || beat.title.toLowerCase().includes(query);
      const matchesArtists = !query || beat.producedBy.some((artist) => artist.toLowerCase().includes(query));
      const matchesTags = !query || beat.tags.some((tag) => normalizeTagValue(tag).includes(normalizedTagQuery));
      const matchesBpmText = !query || String(beat.bpm).includes(query);
      const matchesKeyText = !query || beat.key.toLowerCase().includes(query);
      const matchesQuery = matchesTitle || matchesArtists || matchesTags || matchesBpmText || matchesKeyText;

      const matchesKey = selectedKey === "all" || beat.key.toLowerCase() === selectedKey.toLowerCase();
      const matchesMin = !hasMin || beat.bpm >= min;
      const matchesMax = !hasMax || beat.bpm <= max;
      return matchesQuery && matchesKey && matchesMin && matchesMax;
    });
  }, [beats, searchQuery, selectedKey, bpmMin, bpmMax]);

  const keys = useMemo(() => {
    const mapped = beats.map((beat) => beat.key).filter(Boolean);
    return Array.from(new Set(mapped)).sort((a, b) => a.localeCompare(b));
  }, [beats]);

  const visibleBeats = useMemo(
    () => (expanded ? filteredBeats : filteredBeats.slice(0, initiallyVisible)),
    [filteredBeats, expanded, initiallyVisible]
  );

  const hasMore = filteredBeats.length > initiallyVisible;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const returnBeatId = sessionStorage.getItem("justronbeats:returnBeatId");
    if (!returnBeatId) return;

    const beatIndex = beats.findIndex((beat) => beat.id === returnBeatId);
    if (beatIndex === -1) {
      sessionStorage.removeItem("justronbeats:returnBeatId");
      return;
    }

    if (beatIndex >= initiallyVisible) {
      setExpanded(true);
    }

    // Wait for render (and optional expansion) before scrolling.
    const timeout = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-beat-id="${returnBeatId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      sessionStorage.removeItem("justronbeats:returnBeatId");
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [beats, initiallyVisible]);

  const getSuggestions = (currentBeat: Beat) => {
    return filteredBeats
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
    <section className="w-full min-w-0 space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="beat-search"
          className="block text-center text-xs uppercase tracking-[0.2em] text-zinc-500 sm:text-left"
        >
          Search Beats
        </label>
        <input
          id="beat-search"
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by beat name, artist, or tags..."
          className="w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-zinc-500 placeholder:text-zinc-500 focus:ring-2"
        />
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="all">All keys</option>
            {keys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={bpmMin}
            onChange={(event) => setBpmMin(event.target.value)}
            placeholder="Min BPM"
            className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            type="number"
            value={bpmMax}
            onChange={(event) => setBpmMax(event.target.value)}
            placeholder="Max BPM"
            className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>

      <div className="space-y-4 transition-all duration-500">
        {visibleBeats.length ? (
          visibleBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              isExpanded={expandedBeatId === beat.id}
              onToggle={() => setExpandedBeatId((prev) => (prev === beat.id ? null : beat.id))}
              suggestions={getSuggestions(beat)}
              onTagClick={(tag) => setSearchQuery(tag)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
            No beats found.
          </div>
        )}
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
