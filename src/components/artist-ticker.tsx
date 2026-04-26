const artists = [
  { name: "Nettspend", listeners: "1,765,272 monthly listeners" },
  { name: "Glokk40Spazz", listeners: "1,459,955 monthly listeners" },
  { name: "Hardrock", listeners: "235,802 monthly listeners" },
  { name: "Slimesito", listeners: "144,258 monthly listeners" },
  { name: "Backend", listeners: "27,535 monthly listeners" },
  { name: "Yung Fazo", listeners: "529,239 monthly listeners" },
  { name: "Brennan Jones", listeners: "90,547 monthly listeners" },
  { name: "Lazer Dim 700", listeners: "1,455,792 monthly listeners" }
];

export function ArtistTicker() {
  const items = [...artists, ...artists];

  return (
    <section className="artist-ticker-container overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 py-4">
      <div className="artist-ticker-track flex min-w-max items-center gap-8 px-6">
        {items.map((artist, index) => (
          <article key={`${artist.name}-${index}`} className="min-w-[180px] text-white">
            <p className="text-sm font-medium">{artist.name}</p>
            <p className="text-xs text-zinc-400">{artist.listeners}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
