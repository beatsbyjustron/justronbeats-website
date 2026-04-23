"use client";

import { useEffect, useMemo, useState } from "react";
import { FeaturedProduction } from "@/components/types";
import { isSupabasePublicObjectUrl } from "@/lib/storage";

type FeaturedCarouselProps = {
  productions: FeaturedProduction[];
};

export function FeaturedCarousel({ productions }: FeaturedCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (productions.length <= 3) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setStartIndex((prev) => (prev + 1) % productions.length);
        setFadeIn(true);
      }, 180);
    }, 4000);

    return () => clearInterval(interval);
  }, [productions.length]);

  const visible = useMemo(() => {
    if (!productions.length) return [];
    if (productions.length <= 3) return productions;
    return Array.from({ length: 3 }, (_, offset) => productions[(startIndex + offset) % productions.length]);
  }, [productions, startIndex]);

  if (!productions.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-100">Featured Productions</h2>

      <div className={`grid gap-4 sm:grid-cols-3 transition-opacity duration-500 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
        {visible.map((item, index) => (
          <article key={`${item.id}-${startIndex}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <img
              src={
                !item.coverArt || isSupabasePublicObjectUrl(item.coverArt)
                  ? "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80"
                  : item.coverArt
              }
              alt={item.song}
              className="h-44 w-full object-cover"
            />
            <div className="space-y-1 p-3">
              <p className="font-medium text-zinc-100">{item.song}</p>
              <p className="text-sm text-zinc-400">{item.artist}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
