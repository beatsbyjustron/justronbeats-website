"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCallback } from "react";
import { Beat } from "@/components/types";

type QueueBeat = Pick<Beat, "id" | "slug" | "title" | "coverArtUrl" | "mp3Url">;

type AudioPlayerContextValue = {
  queue: QueueBeat[];
  currentBeat: QueueBeat | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  setQueue: (beats: Beat[]) => void;
  playBeat: (beat: Beat | QueueBeat) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (time: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function mapQueueBeat(beat: Beat | QueueBeat): QueueBeat {
  return {
    id: beat.id,
    slug: beat.slug,
    title: beat.title,
    coverArtUrl: beat.coverArtUrl,
    mp3Url: beat.mp3Url
  };
}

export function GlobalAudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueueState] = useState<QueueBeat[]>([]);
  const [currentBeat, setCurrentBeat] = useState<QueueBeat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const setQueue = useCallback((beats: Beat[]) => {
    const nextQueue = beats.map(mapQueueBeat);
    setQueueState(nextQueue);
  }, []);

  const playBeat = useCallback(async (beat: Beat | QueueBeat) => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextBeat = mapQueueBeat(beat);
    const isSameBeat = currentBeat?.id === nextBeat.id;

    if (!isSameBeat) {
      setCurrentBeat(nextBeat);
      audio.src = nextBeat.mp3Url;
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    await audio.play();
    setIsPlaying(true);
  }, [currentBeat]);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentBeat) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    await audio.play();
    setIsPlaying(true);
  }, [currentBeat, isPlaying]);

  const playByIndex = useCallback(async (index: number) => {
    if (index < 0 || index >= queue.length) return;
    await playBeat(queue[index]);
  }, [playBeat, queue]);

  const playNext = useCallback(async () => {
    if (!currentBeat) return;
    const currentIndex = queue.findIndex((beat) => beat.id === currentBeat.id);
    if (currentIndex === -1) return;
    await playByIndex(currentIndex + 1);
  }, [currentBeat, playByIndex, queue]);

  const playPrevious = useCallback(async () => {
    if (!currentBeat) return;
    const currentIndex = queue.findIndex((beat) => beat.id === currentBeat.id);
    if (currentIndex === -1) return;
    await playByIndex(currentIndex - 1);
  }, [currentBeat, playByIndex, queue]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const currentIndex = currentBeat ? queue.findIndex((beat) => beat.id === currentBeat.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
      if (isTypingTarget) return;

      if (event.code === "Space") {
        if (!currentBeat) return;
        event.preventDefault();
        void togglePlayPause();
        return;
      }

      if (event.code === "ArrowLeft") {
        if (!currentBeat || !hasPrevious) return;
        event.preventDefault();
        void playPrevious();
        return;
      }

      if (event.code === "ArrowRight") {
        if (!currentBeat || !hasNext) return;
        event.preventDefault();
        void playNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentBeat, hasNext, hasPrevious, playNext, playPrevious, togglePlayPause]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      queue,
      currentBeat,
      isPlaying,
      currentTime,
      duration,
      setQueue,
      playBeat,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo
    }),
    [queue, currentBeat, isPlaying, currentTime, duration, setQueue, playBeat, togglePlayPause, playNext, playPrevious, seekTo]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          if (hasNext) {
            void playNext();
            return;
          }
          setIsPlaying(false);
        }}
      />
      {children}

      {currentBeat && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="border-b border-zinc-800/70 px-3 py-1.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(event) => seekTo(Number(event.target.value))}
              aria-label="Playback progress"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-200"
            />
          </div>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={currentBeat.coverArtUrl || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=300&q=80"}
                alt={currentBeat.title}
                className="h-11 w-11 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{currentBeat.title}</p>
                <p className="text-[11px] text-zinc-500">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void playPrevious()}
                disabled={!hasPrevious}
                className="rounded-full border border-zinc-700 p-2 text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous beat"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M6 6h2v12H6zM18 6v12l-8-6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => void togglePlayPause()}
                className="rounded-full bg-zinc-100 p-2 text-zinc-900 transition hover:bg-zinc-200"
                aria-label={isPlaying ? "Pause playback" : "Play playback"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M7 6h4v12H7zM13 6h4v12h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => void playNext()}
                disabled={!hasNext}
                className="rounded-full border border-zinc-700 p-2 text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next beat"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M16 6h2v12h-2zM6 6l8 6-8 6z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-full border border-zinc-700 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5z" />
                    <path d="m16 9 5 5" />
                    <path d="m21 9-5 5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18 6a8.5 8.5 0 0 1 0 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AudioPlayerContext.Provider>
  );
}

export function useGlobalAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error("useGlobalAudioPlayer must be used inside GlobalAudioPlayerProvider");
  return context;
}
