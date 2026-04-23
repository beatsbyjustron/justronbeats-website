"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCallback } from "react";
import { Beat } from "@/components/types";
import { isSupabasePublicObjectUrl } from "@/lib/storage";

type QueueBeat = Pick<Beat, "id" | "slug" | "title" | "coverArtUrl" | "mp3Url">;

type AudioPlayerContextValue = {
  queue: QueueBeat[];
  currentBeat: QueueBeat | null;
  isPlaying: boolean;
  visualizerLevels: number[];
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
  const safeCoverArtUrl = isSupabasePublicObjectUrl(beat.coverArtUrl) ? "" : beat.coverArtUrl;
  const safeMp3Url = isSupabasePublicObjectUrl(beat.mp3Url) ? "" : beat.mp3Url;
  return {
    id: beat.id,
    slug: beat.slug,
    title: beat.title,
    coverArtUrl: safeCoverArtUrl,
    mp3Url: safeMp3Url
  };
}

export function GlobalAudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const lastNonZeroVolumeRef = useRef(1);

  const [queue, setQueueState] = useState<QueueBeat[]>([]);
  const [currentBeat, setCurrentBeat] = useState<QueueBeat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [visualizerLevels, setVisualizerLevels] = useState<number[]>(() => Array(24).fill(10));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const setQueue = useCallback((beats: Beat[]) => {
    const nextQueue = beats.map(mapQueueBeat);
    setQueueState(nextQueue);
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const resetVisualizer = useCallback(() => {
    setVisualizerLevels(Array(24).fill(10));
  }, []);

  const runVisualizerFrame = useCallback(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    const nextBars = Array.from({ length: 24 }, (_, index) => {
      const sample = dataArray[index % dataArray.length] ?? 0;
      return Math.max(8, Math.round((sample / 255) * 34));
    });

    setVisualizerLevels(nextBars);
    animationRef.current = requestAnimationFrame(runVisualizerFrame);
  }, []);

  const startVisualizer = useCallback(() => {
    stopVisualizer();
    animationRef.current = requestAnimationFrame(runVisualizerFrame);
  }, [runVisualizerFrame, stopVisualizer]);

  const ensureAnalyser = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return null;

    if (!audioContextRef.current) {
      const context = new window.AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;

      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);

      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    return {
      context: audioContextRef.current,
      analyser: analyserRef.current
    };
  }, []);

  const preparePlaybackGraph = useCallback(async () => {
    const graph = ensureAnalyser();
    if (!graph?.context) return;
    if (graph.context.state === "suspended") {
      await graph.context.resume();
    }
  }, [ensureAnalyser]);

  const playBeat = useCallback(async (beat: Beat | QueueBeat) => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextBeat = mapQueueBeat(beat);
    const isSameBeat = currentBeat?.id === nextBeat.id;

    if (!isSameBeat) {
      setCurrentBeat(nextBeat);
      if (!nextBeat.mp3Url || isSupabasePublicObjectUrl(nextBeat.mp3Url)) {
        setIsPlaying(false);
        return;
      }
      audio.src = nextBeat.mp3Url;
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    await preparePlaybackGraph();
    await audio.play();
    startVisualizer();
    setIsPlaying(true);
  }, [currentBeat, preparePlaybackGraph, startVisualizer]);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentBeat) return;

    if (isPlaying) {
      audio.pause();
      stopVisualizer();
      resetVisualizer();
      setIsPlaying(false);
      return;
    }

    await preparePlaybackGraph();
    await audio.play();
    startVisualizer();
    setIsPlaying(true);
  }, [currentBeat, isPlaying, preparePlaybackGraph, resetVisualizer, startVisualizer, stopVisualizer]);

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

    if (audio.muted || volume === 0) {
      const restoredVolume = Math.max(0.1, lastNonZeroVolumeRef.current || 1);
      audio.muted = false;
      audio.volume = restoredVolume;
      setIsMuted(false);
      setVolume(restoredVolume);
      return;
    }

    if (audio.volume > 0) {
      lastNonZeroVolumeRef.current = audio.volume;
    }
    audio.muted = true;
    setIsMuted(true);
  }, [volume]);

  const onVolumeChange = useCallback((nextValue: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const normalized = Math.min(1, Math.max(0, nextValue));
    audio.volume = normalized;
    setVolume(normalized);

    if (normalized <= 0) {
      audio.muted = true;
      setIsMuted(true);
      return;
    }

    lastNonZeroVolumeRef.current = normalized;
    audio.muted = false;
    setIsMuted(false);
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

  useEffect(() => {
    return () => {
      stopVisualizer();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [stopVisualizer]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      queue,
      currentBeat,
      isPlaying,
      visualizerLevels,
      currentTime,
      duration,
      setQueue,
      playBeat,
      togglePlayPause,
      playNext,
      playPrevious,
      seekTo
    }),
    [queue, currentBeat, isPlaying, visualizerLevels, currentTime, duration, setQueue, playBeat, togglePlayPause, playNext, playPrevious, seekTo]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={() => {
          // Smooth updates are driven by requestAnimationFrame while playing.
          // Keep this as a fallback for paused/seeking edge cases.
          if (!isPlaying && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onPause={() => {
          setIsPlaying(false);
          stopVisualizer();
          resetVisualizer();
        }}
        onPlay={() => {
          setIsPlaying(true);
          startVisualizer();
        }}
        onEnded={() => {
          stopVisualizer();
          resetVisualizer();
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

          <div className="px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 sm:gap-3">
              <img
                src={currentBeat.coverArtUrl || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=300&q=80"}
                alt={currentBeat.title}
                className="h-9 w-9 rounded-md object-cover sm:h-11 sm:w-11"
              />
              <div className="min-w-0 max-w-[130px] sm:max-w-[220px]">
                <p className="truncate text-xs font-medium text-zinc-100 sm:text-sm">{currentBeat.title}</p>
                <p className="text-[10px] text-zinc-500 sm:text-[11px]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>

              <div className="ml-1 hidden h-8 items-end gap-1 sm:flex">
                {visualizerLevels.slice(0, 18).map((height, index) => (
                  <span
                    key={`bottom-bar-${index}-${height}`}
                    className={`w-1 shrink-0 rounded-full transition-all duration-100 ${
                      isPlaying ? "bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300" : "bg-zinc-700"
                    }`}
                    style={{ height: `${Math.max(6, Math.round(height * 0.75))}px` }}
                  />
                ))}
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:ml-2 sm:gap-2">
                <button
                  type="button"
                  onClick={() => void playPrevious()}
                  disabled={!hasPrevious}
                  className="rounded-full border border-zinc-700 p-1.5 text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
                  aria-label="Previous beat"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden="true">
                    <path d="M6 6h2v12H6zM18 6v12l-8-6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => void togglePlayPause()}
                  className="rounded-full bg-zinc-100 p-1.5 text-zinc-900 transition hover:bg-zinc-200 sm:p-2"
                  aria-label={isPlaying ? "Pause playback" : "Play playback"}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden="true">
                      <path d="M7 6h4v12H7zM13 6h4v12h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void playNext()}
                  disabled={!hasNext}
                  className="rounded-full border border-zinc-700 p-1.5 text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
                  aria-label="Next beat"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden="true">
                    <path d="M16 6h2v12h-2zM6 6l8 6-8 6z" />
                  </svg>
                </button>
              </div>

              <div className="ml-2 hidden items-center gap-2 pr-1 sm:flex">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-full border border-zinc-700 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
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
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => onVolumeChange(Number(event.target.value))}
                  aria-label="Volume"
                  className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-200 sm:w-28"
                />
                <span className="w-8 text-right text-[11px] text-zinc-500">{Math.round(volume * 100)}</span>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className="ml-1 rounded-full border border-zinc-700 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 sm:hidden"
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5z" />
                    <path d="m16 9 5 5" />
                    <path d="m21 9-5 5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
