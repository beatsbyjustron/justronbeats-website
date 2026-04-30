"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const CONTAINER_ID = "tsparticles-bg";
const CDN_URL = "https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.bundle.min.js";

const PARTICLE_OPTIONS = {
  fullScreen: { enable: false },
  background: { color: "transparent" },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 60 },
    color: { value: "#CCFF00" },
    opacity: { value: 0.2 },
    size: { value: 1.5 },
    links: { enable: false },
    move: {
      enable: true,
      speed: 0.3,
      direction: "top" as const,
      straight: true,
      random: false,
      outModes: { default: "out" as const }
    }
  }
};

type LoadResult = { destroy?: () => void };

type TsParticlesApi = {
  load: (id: string, options: typeof PARTICLE_OPTIONS) => Promise<LoadResult>;
};

function getTsParticles(): TsParticlesApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { tsParticles?: TsParticlesApi }).tsParticles;
}

export function TsparticlesBackground() {
  const instanceRef = useRef<LoadResult | null>(null);

  const runInit = useCallback(() => {
    const api = getTsParticles();
    if (!api || !document.getElementById(CONTAINER_ID)) return;

    void (async () => {
      try {
        instanceRef.current?.destroy?.();
        instanceRef.current = null;
        const instance = await api.load(CONTAINER_ID, PARTICLE_OPTIONS);
        instanceRef.current = instance;
      } catch {
        /* CDN or options mismatch */
      }
    })();
  }, []);

  useEffect(() => {
    if (getTsParticles()) {
      runInit();
    }
    return () => {
      instanceRef.current?.destroy?.();
      instanceRef.current = null;
    };
  }, [runInit]);

  return (
    <>
      <div
        id={CONTAINER_ID}
        className="pointer-events-none fixed inset-0 -z-[1] h-full w-full"
        aria-hidden
      />
      <Script
        id="tsparticles-cdn"
        src={CDN_URL}
        strategy="afterInteractive"
        onLoad={runInit}
      />
    </>
  );
}
