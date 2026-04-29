import { CarouselArtist } from "@/components/types";

type ArtistTickerProps = {
  artists: CarouselArtist[];
};

export function ArtistTicker({ artists }: ArtistTickerProps) {
  const items = [...artists, ...artists];

  return (
    <section className="artist-ticker-container mx-auto w-full max-w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 py-4">
      <div className="artist-ticker-track flex w-max min-w-max max-w-none items-center gap-6 px-4 sm:gap-8 sm:px-6">
        {items.map((artist, index) => (
          <article key={`${artist.name}-${index}`} className="min-w-[180px] text-white">
            <div className="flex items-center gap-3">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={`${artist.name} profile`}
                  className="h-10 w-10 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{artist.name}</p>
                <p className="truncate text-xs text-zinc-400">
                  {new Intl.NumberFormat("en-US").format(artist.monthlyListeners)} monthly listeners
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
