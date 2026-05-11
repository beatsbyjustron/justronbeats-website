"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

type LinkItem = {
  label: string;
  href: string;
};

type ReleaseSpotlightRotatorProps = {
  coverUrl: string;
  releaseTitle: string;
  releaseArtist: string;
  /** Shown as “Featuring …” under the track title on the release slide */
  featuringCredit: string;
  releaseLinks: LinkItem[];
  btsUrl: string;
};

export function ReleaseSpotlightRotator({
  coverUrl,
  releaseTitle,
  releaseArtist,
  featuringCredit,
  releaseLinks,
  btsUrl,
}: ReleaseSpotlightRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 2);
    }, 4500);
    return () => window.clearInterval(interval);
  }, []);

  const isReleaseSlide = activeIndex === 0;
  const coverAlt = isReleaseSlide ? `${releaseTitle} cover art` : `${releaseTitle} — behind the scenes`;
  const primaryHref = releaseLinks[0]?.href;

  const spotlightGlow = [
    "0 0 0 1px rgba(190,242,100,0.08), 0 12px 40px -18px rgba(163,230,53,0.12)",
    "0 0 0 1px rgba(190,242,100,0.2), 0 16px 48px -14px rgba(163,230,53,0.22)",
    "0 0 0 1px rgba(190,242,100,0.08), 0 12px 40px -18px rgba(163,230,53,0.12)",
  ] as const;

  return (
    <motion.section
      className="relative overflow-hidden rounded-2xl border border-lime-300/30 bg-lime-300/[0.06] p-5 sm:p-6"
      initial={{ boxShadow: spotlightGlow[0] }}
      animate={{ boxShadow: [...spotlightGlow] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:items-stretch lg:gap-10 lg:text-left"
        >
          <div className="relative shrink-0">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={coverAlt}
                className="h-44 w-44 rounded-xl border border-lime-200/30 object-cover shadow-lg sm:h-56 sm:w-56"
              />
            ) : (
              <div
                className="flex h-44 w-44 items-center justify-center rounded-xl border border-lime-200/20 bg-zinc-900/60 text-xs text-zinc-500 sm:h-56 sm:w-56"
                aria-hidden
              >
                Art
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              {isReleaseSlide ? (
                <>
                  <span className="inline-flex items-center rounded-full border border-lime-200/50 bg-lime-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-lime-100">
                    Out now
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/90">
                    Newest release
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/90">
                  Behind the scenes
                </span>
              )}
            </div>

            <div className="space-y-2">
              {isReleaseSlide ? (
                <>
                  <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                    {releaseTitle}
                  </h2>
                  <p className="text-lg font-semibold tracking-tight text-lime-100/95 sm:text-xl">
                    Featuring {featuringCredit}
                  </p>
                  <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-zinc-300 lg:mx-0 sm:text-base">
                    Stream it everywhere, then dig into the beat store for tracks in the same lane.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                    {releaseTitle} • Studio breakdown
                  </h2>
                  <p className="text-lg font-semibold tracking-tight text-lime-100/95 sm:text-xl">{releaseArtist}</p>
                  <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-zinc-300 lg:mx-0 sm:text-base">
                    Watch how the record came together — full YouTube breakdown with Justron in the studio.
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
              {isReleaseSlide ? (
                <>
                  {primaryHref ? (
                    <a
                      href={primaryHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-lime-300 px-8 text-base font-bold text-zinc-950 shadow-[0_0_32px_-4px_rgba(190,242,100,0.55)] transition hover:bg-lime-200 hover:shadow-[0_0_40px_-2px_rgba(217,249,157,0.65)]"
                    >
                      Listen on {releaseLinks[0].label}
                    </a>
                  ) : (
                    <Link
                      href="/productions"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-lime-300 px-8 text-base font-bold text-zinc-950 shadow-[0_0_32px_-4px_rgba(190,242,100,0.55)] transition hover:bg-lime-200"
                    >
                      View productions
                    </Link>
                  )}

                  {releaseLinks.length > 1 ? (
                    <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                      {releaseLinks.slice(1).map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-lime-200/45 bg-zinc-950/50 px-4 py-2.5 text-xs font-semibold text-lime-50 backdrop-blur-sm transition hover:border-lime-200/80 hover:bg-zinc-900/80"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <a
                  href={btsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-lime-300 px-8 text-base font-bold text-zinc-950 shadow-[0_0_32px_-4px_rgba(190,242,100,0.55)] transition hover:bg-lime-200"
                >
                  Watch on YouTube
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
