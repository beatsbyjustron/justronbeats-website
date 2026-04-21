"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CustomAudioPlayerProps = {
  src: string;
  debugLabel?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CustomAudioPlayer({ src, debugLabel }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [barLevels, setBarLevels] = useState<number[]>(() => Array(16).fill(12));
  const [playError, setPlayError] = useState("");

  const bars = useMemo(() => barLevels, [barLevels]);

  useEffect(() => {
    // Debug helper for validating exact audio URL from beat data.
    console.log("[CustomAudioPlayer] audio src", {
      label: debugLabel ?? "unknown beat",
      src
    });
  }, [debugLabel, src]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (contextRef.current) {
        contextRef.current.close();
      }
    };
  }, []);

  const ensureAnalyser = () => {
    if (!audioRef.current) return null;
    if (!contextRef.current) {
      const audioContext = new window.AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const sourceNode = audioContext.createMediaElementSource(audioRef.current);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);

      contextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = sourceNode;
    }
    return analyserRef.current;
  };

  const animateBars = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const next = Array.from({ length: 16 }, (_, index) => {
      const sample = data[index % data.length] ?? 0;
      return Math.max(8, Math.round((sample / 255) * 36));
    });

    setBarLevels(next);
    frameRef.current = requestAnimationFrame(animateBars);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!src) {
      setPlayError("Audio file is unavailable for this beat.");
      console.warn("[CustomAudioPlayer] Missing audio src", { label: debugLabel ?? "unknown beat" });
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const analyser = ensureAnalyser();
    if (contextRef.current?.state === "suspended") {
      await contextRef.current.resume();
    }
    if (!analyser) return;

    try {
      console.log("[CustomAudioPlayer] about to call audio.play()", {
        label: debugLabel ?? "unknown beat",
        src,
        audioCurrentSrc: audio.currentSrc
      });
      await audio.play();
      setPlayError("");
      setIsPlaying(true);
      animateBars();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown playback error";
      const name = error && typeof error === "object" && "name" in error ? String((error as { name?: string }).name) : "UnknownError";
      console.error("[CustomAudioPlayer] play() failed", {
        label: debugLabel ?? "unknown beat",
        src,
        name,
        message
      });
      if (name === "NotAllowedError") {
        console.warn("[CustomAudioPlayer] Browser blocked playback (NotAllowedError). User interaction is required.");
      }
      setPlayError("Unable to play this audio. Verify the uploaded MP3 URL and storage bucket.");
      setIsPlaying(false);
    }
  };

  const onProgressChange = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value;
    setProgress(value);
  };

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onError={() => {
          const mediaError = audioRef.current?.error;
          console.error("[CustomAudioPlayer] audio element error", {
            label: debugLabel ?? "unknown beat",
            src,
            mediaErrorCode: mediaError?.code,
            mediaErrorMessage: mediaError?.message
          });
          setPlayError("Audio failed to load. Check the file URL in Supabase.");
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          setBarLevels(Array(16).fill(12));
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-500"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="flex flex-1 items-end gap-1">
          {bars.map((height, index) => (
            <span
              key={`${index}-${height}`}
              className={`w-1 rounded-full bg-zinc-100/90 transition-all duration-150 ${isPlaying ? "opacity-100" : "opacity-40"}`}
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
          max={duration || 0}
          step={0.01}
          value={progress}
          onChange={(event) => onProgressChange(Number(event.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-zinc-200"
        />
        <span className="w-10 text-right text-xs text-zinc-500">{formatTime(duration)}</span>
      </div>
      {!!playError && <p className="text-xs text-amber-400">{playError}</p>}
    </div>
  );
}
