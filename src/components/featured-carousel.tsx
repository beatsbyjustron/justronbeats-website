"use client";

import { useEffect, useMemo, useState } from "react";
import { FeaturedProduction } from "@/components/types";
import { useSignedStorageUrl } from "@/components/use-signed-storage-url";

type FeaturedCarouselProps = {
  productions: FeaturedProduction[];
};

function FeaturedCarouselCard({ item }: { item: FeaturedProduction }) {
  const signedCoverUrl = useSignedStorageUrl(item.coverArt);
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {signedCoverUrl ? (
        <img src={signedCoverUrl} alt={item.song} className="h-44 w-full object-cover" />
      ) : (
        <div className="h-44 w-full animate-pulse bg-zinc-900" aria-hidden="true" />
      )}
      <div className="space-y-1 p-3">
        <p className="font-medium text-zinc-100">{item.song}</p>
        <p className="text-sm text-zinc-400">{item.artist}</p>
      </div>
    </article>
  );
}

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
    <section className="w-full min-w-0 space-y-4">
      <h2 className="text-center text-xl font-semibold text-zinc-100 sm:text-left">Featured Productions</h2>

      <div
        className={`grid grid-cols-1 gap-4 transition-opacity duration-500 sm:grid-cols-2 lg:grid-cols-3 ${fadeIn ? "opacity-100" : "opacity-0"}`}
      >
        {visible.map((item, index) => (
          <FeaturedCarouselCard key={`${item.id}-${startIndex}-${index}`} item={item} />
        ))}
      </div>
    </section>
  );
}
