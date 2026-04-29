"use client";

import { useEffect, useMemo, useState } from "react";
import { BeatCard } from "@/components/beat-card";
import { useGlobalAudioPlayer } from "@/components/global-audio-player-provider";
import { Beat } from "@/components/types";

type BeatStoreProps = {
  beats: Beat[];
  initiallyVisible?: number;
};

const BPM_RANGE_MIN = 60;
const BPM_RANGE_MAX = 200;

function normalizeTagValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

export function BeatStore({ beats, initiallyVisible = 3 }: BeatStoreProps) {
  const { setQueue } = useGlobalAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("all");
  const [bpmMin, setBpmMin] = useState(BPM_RANGE_MIN);
  const [bpmMax, setBpmMax] = useState(BPM_RANGE_MAX);

  useEffect(() => {
    setQueue(beats);
  }, [beats, setQueue]);

  const filteredBeats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedTagQuery = normalizeTagValue(query);
    const hasBpmFilter = bpmMin > BPM_RANGE_MIN || bpmMax < BPM_RANGE_MAX;

    return beats.filter((beat) => {
      const matchesTitle = !query || beat.title.toLowerCase().includes(query);
      const matchesArtists = !query || beat.producedBy.some((artist) => artist.toLowerCase().includes(query));
      const matchesTags = !query || beat.tags.some((tag) => normalizeTagValue(tag).includes(normalizedTagQuery));
      const matchesBpmText = !query || String(beat.bpm).includes(query);
      const matchesKeyText = !query || beat.key.toLowerCase().includes(query);
      const matchesQuery = matchesTitle || matchesArtists || matchesTags || matchesBpmText || matchesKeyText;

      const matchesKey = selectedKey === "all" || beat.key.toLowerCase() === selectedKey.toLowerCase();
      const matchesBpm = !hasBpmFilter || (beat.bpm >= bpmMin && beat.bpm <= bpmMax);
      return matchesQuery && matchesKey && matchesBpm;
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

  const minPercent = ((bpmMin - BPM_RANGE_MIN) / (BPM_RANGE_MAX - BPM_RANGE_MIN)) * 100;
  const maxPercent = ((bpmMax - BPM_RANGE_MIN) / (BPM_RANGE_MAX - BPM_RANGE_MIN)) * 100;

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
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
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
          <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 sm:col-span-1">
            <p className="text-xs text-zinc-400">{bpmMin} - {bpmMax} BPM</p>
            <div className="relative mt-3 h-6">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-zinc-800" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400"
                style={{
                  left: `${minPercent}%`,
                  right: `${100 - maxPercent}%`
                }}
              />
              <input
                type="range"
                min={BPM_RANGE_MIN}
                max={BPM_RANGE_MAX}
                step={1}
                value={bpmMin}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setBpmMin(Math.min(next, bpmMax - 1));
                }}
                className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-emerald-200 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:shadow-emerald-900/60 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-emerald-200 [&::-moz-range-thumb]:bg-emerald-400"
                aria-label="Minimum BPM"
              />
              <input
                type="range"
                min={BPM_RANGE_MIN}
                max={BPM_RANGE_MAX}
                step={1}
                value={bpmMax}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setBpmMax(Math.max(next, bpmMin + 1));
                }}
                className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-emerald-200 [&::-webkit-slider-thumb]:bg-lime-300 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:shadow-emerald-900/60 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-emerald-200 [&::-moz-range-thumb]:bg-lime-300"
                aria-label="Maximum BPM"
              />
            </div>
          </div>
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
