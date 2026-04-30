"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type LinkItem = {
  label: string;
  href: string;
};

type ReleaseSpotlightRotatorProps = {
  coverUrl: string;
  releaseLinks: LinkItem[];
  btsUrl: string;
};

export function ReleaseSpotlightRotator({ coverUrl, releaseLinks, btsUrl }: ReleaseSpotlightRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 2);
    }, 4500);
    return () => window.clearInterval(interval);
  }, []);

  const isReleaseSlide = activeIndex === 0;

  return (
    <section className="rounded-2xl border border-lime-300/30 bg-lime-300/[0.06] p-5 sm:p-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-lime-200/80">
            {isReleaseSlide ? "Newest Release" : "Behind The Scenes"}
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Lifestyle cover art"
                  className="h-16 w-16 rounded-xl border border-lime-200/30 object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl border border-lime-200/20 bg-zinc-900/60 sm:h-20 sm:w-20"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-xl font-semibold text-zinc-100">
                  {isReleaseSlide ? "Lifestyle • Yung Fazo & Yuck" : "Lifestyle • Studio Breakdown"}
                </p>
                <p className="text-sm text-zinc-300">
                  {isReleaseSlide
                    ? "Listen your way, then explore a collection of beats built to inspire your next track."
                    : "Watch how the record came together behind the scenes with the full YouTube breakdown."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isReleaseSlide ? (
                releaseLinks.length ? (
                  releaseLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-lime-200/40 bg-zinc-900/70 px-4 py-2 text-xs font-semibold text-lime-100 transition hover:border-lime-200/70 hover:bg-zinc-900"
                    >
                      {link.label}
                    </a>
                  ))
                ) : (
                  <a
                    href="/productions"
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-lime-200/40 bg-zinc-900/70 px-4 py-2 text-xs font-semibold text-lime-100 transition hover:border-lime-200/70 hover:bg-zinc-900"
                  >
                    View Productions
                  </a>
                )
              ) : (
                <a
                  href={btsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-lime-200/40 bg-zinc-900/70 px-4 py-2 text-xs font-semibold text-lime-100 transition hover:border-lime-200/70 hover:bg-zinc-900"
                >
                  Watch On YouTube
                </a>
              )}

              <span className="inline-flex shrink-0 animate-pulse [animation-duration:3.8s] items-center justify-center rounded-full bg-lime-300 px-5 py-2.5 text-sm font-semibold text-zinc-900">
                {isReleaseSlide ? "Listen Now" : "Watch Now"}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
