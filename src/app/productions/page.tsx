import Link from "next/link";

const productions = [
  {
    title: "No Sleep",
    artist: "Rico Lane",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
    url: "https://www.youtube.com"
  },
  {
    title: "Ghost Mode",
    artist: "Maya V",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    url: "https://open.spotify.com"
  },
  {
    title: "After Dark",
    artist: "KXNG II",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
    url: "https://music.apple.com"
  },
  {
    title: "Skyline",
    artist: "Ari Nova",
    image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=900&q=80",
    url: "https://soundcloud.com"
  }
];

export default function ProductionsPage() {
  return (
    <main className="space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Productions</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        {productions.map((production) => (
          <article key={production.title} className="group relative overflow-hidden rounded-2xl border border-zinc-800">
            <img src={production.image} alt={production.title} className="h-64 w-full object-cover" />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
              <div>
                <p className="text-lg font-semibold text-zinc-100">{production.title}</p>
                <p className="text-sm text-zinc-300">{production.artist}</p>
                <Link href={production.url} className="mt-2 inline-block text-sm text-zinc-200 underline">
                  Listen now
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
