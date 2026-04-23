"use client";

import { motion } from "framer-motion";

type ProductionItem = {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  spotify_url: string | null;
  apple_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  year: number | null;
};

function PlatformIcon({ type }: { type: "spotify" | "apple" | "youtube" | "soundcloud" }) {
  if (type === "spotify") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm4.6 14.4a.93.93 0 0 1-1.28.3c-3.5-2.14-7.9-2.62-13.1-1.4a.93.93 0 0 1-.43-1.8c5.66-1.35 10.5-.8 14.5 1.62.44.27.58.84.31 1.28Zm1.82-3.06a1.16 1.16 0 0 1-1.59.37c-4-2.43-10.1-3.13-14.84-1.71a1.16 1.16 0 1 1-.66-2.22c5.41-1.62 12.14-.84 16.7 1.94.54.34.72 1.05.39 1.62Zm.16-3.2C14.01 7.44 6.37 7.19 2.02 8.5a1.39 1.39 0 1 1-.8-2.66c5.01-1.5 13.34-1.21 18.06 1.67a1.39 1.39 0 1 1-1.45 2.35Z" />
      </svg>
    );
  }
  if (type === "apple") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M16.37 1.43c0 1.14-.41 2.2-1.11 2.98-.76.84-2.01 1.49-3.18 1.4-.15-1.09.42-2.24 1.11-3 .76-.84 2.07-1.45 3.18-1.38Zm3.34 15.25c-.43.98-.64 1.42-1.2 2.29-.78 1.22-1.88 2.74-3.23 2.75-1.2.01-1.5-.78-3.13-.77-1.63.01-1.96.78-3.16.77-1.35-.01-2.39-1.38-3.17-2.6-2.19-3.41-2.42-7.41-1.07-9.47.96-1.48 2.48-2.35 3.91-2.35 1.46 0 2.39.79 3.6.79 1.17 0 1.88-.79 3.59-.79 1.27 0 2.62.69 3.58 1.88-3.13 1.71-2.62 6.22.28 7.5Z" />
      </svg>
    );
  }
  if (type === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.7.6 9.4.6 9.4.6s7.7 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.86 8.17 6.83 9.49-.09-.78-.17-1.99.04-2.85.19-.75 1.21-4.77 1.21-4.77s-.31-.62-.31-1.53c0-1.43.83-2.5 1.86-2.5.88 0 1.3.66 1.3 1.45 0 .88-.56 2.2-.85 3.42-.25 1.03.52 1.87 1.54 1.87 1.85 0 3.1-2.38 3.1-5.2 0-2.15-1.44-3.75-4.04-3.75-2.95 0-4.79 2.2-4.79 4.66 0 .85.26 1.46.66 1.92.19.22.22.31.15.56-.05.18-.16.62-.21.79-.07.26-.28.36-.52.26-1.46-.6-2.14-2.22-2.14-4.04 0-3 2.53-6.61 7.56-6.61 4.04 0 6.7 2.92 6.7 6.05 0 4.14-2.3 7.23-5.68 7.23-1.14 0-2.21-.62-2.58-1.32l-.7 2.66c-.25.91-.74 1.99-1.1 2.67.83.24 1.71.37 2.62.37A10 10 0 1 0 12 2Z" />
    </svg>
  );
}

export function ProductionsGrid({ productions }: { productions: ProductionItem[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {productions.map((production) => {
        const primaryUrl =
          production.spotify_url ?? production.youtube_url ?? production.apple_url ?? production.soundcloud_url ?? null;
        const Card = primaryUrl ? motion.a : motion.article;

        return (
          <Card
            key={production.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800"
            {...(primaryUrl
              ? { href: primaryUrl, target: "_blank", rel: "noopener noreferrer", title: `Open ${production.title}` }
              : {})}
          >
          <img src={production.cover_url} alt={production.title} className="h-64 w-full object-cover" />
          <div className="absolute inset-0 flex items-end bg-black/60 p-4 opacity-100 transition duration-300 sm:opacity-0 sm:group-hover:opacity-100">
            <div>
              <p className="text-lg font-semibold text-zinc-100">{production.title}</p>
              <p className="text-sm text-zinc-300">
                {production.artist}
                {production.year ? ` • ${production.year}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2 text-zinc-200">
                {production.spotify_url && (
                  <span className="rounded-full border border-zinc-600 p-2">
                    <PlatformIcon type="spotify" />
                  </span>
                )}
                {production.apple_url && (
                  <span className="rounded-full border border-zinc-600 p-2">
                    <PlatformIcon type="apple" />
                  </span>
                )}
                {production.youtube_url && (
                  <span className="rounded-full border border-zinc-600 p-2">
                    <PlatformIcon type="youtube" />
                  </span>
                )}
                {production.soundcloud_url && (
                  <span className="rounded-full border border-zinc-600 p-2">
                    <PlatformIcon type="soundcloud" />
                  </span>
                )}
              </div>
            </div>
          </div>
          </Card>
        );
      })}
      {!productions.length && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">No productions added yet.</div>
      )}
    </section>
  );
}
