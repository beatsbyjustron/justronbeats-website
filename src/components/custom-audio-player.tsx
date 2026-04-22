"use client";

import { useMemo } from "react";
import { useGlobalAudioPlayer } from "@/components/global-audio-player-provider";

type CustomAudioPlayerProps = {
  src: string;
  debugLabel?: string;
  trackId?: string;
  coverArtUrl?: string;
  slug?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CustomAudioPlayer({ src, debugLabel, trackId, coverArtUrl, slug }: CustomAudioPlayerProps) {
  const { currentBeat, isPlaying, currentTime, duration, playBeat, seekTo, togglePlayPause } = useGlobalAudioPlayer();
  const beatId = trackId || src;
  const isCurrentBeat = currentBeat?.id === beatId;

  const bars = useMemo(() => {
    const active = isCurrentBeat && isPlaying;
    return Array.from({ length: 16 }, (_, index) => {
      if (!active) return 10 + (index % 3);
      return 12 + ((index * 7) % 20);
    });
  }, [isCurrentBeat, isPlaying]);

  const progress = isCurrentBeat ? currentTime : 0;
  const totalDuration = isCurrentBeat ? duration : 0;

  const togglePlay = async () => {
    if (!src) return;
    if (isCurrentBeat) {
      await togglePlayPause();
      return;
    }
    await playBeat({
      id: beatId,
      slug: slug || "",
      title: debugLabel || "Beat",
      coverArtUrl: coverArtUrl || "",
      mp3Url: src
    });
  };

  const onProgressChange = (value: number) => {
    if (!isCurrentBeat) return;
    seekTo(value);
  };

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-500"
        >
          {isCurrentBeat && isPlaying ? "Pause" : "Play"}
        </button>
        <div className="flex flex-1 items-end gap-1">
          {bars.map((height, index) => (
            <span
              key={`${index}-${height}`}
              className={`w-1 rounded-full bg-zinc-100/90 transition-all duration-150 ${
                isCurrentBeat && isPlaying ? "opacity-100" : "opacity-40"
              }`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-10 text-xs text-zinc-500">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={totalDuration || 0}
          step={0.01}
          value={progress}
          onChange={(event) => onProgressChange(Number(event.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-zinc-200"
        />
        <span className="w-10 text-right text-xs text-zinc-500">{formatTime(totalDuration)}</span>
      </div>
    </div>
  );
}
