import type { Metadata } from "next";
import { ArtistTicker } from "@/components/artist-ticker";
import { BeatStore } from "@/components/beat-store";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { NewsletterCapture } from "@/components/newsletter-capture";
import { RotatingHeadline } from "@/components/rotating-headline";
import { fetchBeats, mapFeaturedProductions } from "@/lib/beats";
import { fetchCarouselArtists } from "@/lib/carousel-artists";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSignedStorageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Home | Justron Beats",
  description: "Shop official Justron Beats with secure previews, leases, and exclusive offers."
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getSupabaseServerClient();
  const beats = await fetchBeats();
  const featuredProductions = mapFeaturedProductions(beats);
  const carouselArtists = await fetchCarouselArtists();
  const { data: newestRelease } = supabase
    ? await supabase
        .from("productions")
        .select("title, artist, cover_url, spotify_url, apple_url, youtube_url, soundcloud_url")
        .ilike("title", "%lifestyle%")
        .or("artist.ilike.%yuck%,artist.ilike.%yung fazo%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const newestReleaseCover =
    supabase && newestRelease?.cover_url ? await toSignedStorageUrl(supabase, newestRelease.cover_url) : "";

  const releaseLinks = [
    { label: "Spotify", href: newestRelease?.spotify_url ?? "" },
    { label: "YouTube", href: newestRelease?.youtube_url ?? "" },
    { label: "Apple Music", href: newestRelease?.apple_url ?? "" },
    { label: "SoundCloud", href: newestRelease?.soundcloud_url ?? "" }
  ].filter((link) => Boolean(link.href));

  return (
    <main className="w-full min-w-0 space-y-12">
      <section className="mx-auto max-w-3xl space-y-4 text-center sm:text-left">
        <RotatingHeadline />
        <h1 className="text-4xl font-bold text-zinc-100 sm:text-5xl">Official Store for Justron Beats</h1>
        <p className="text-zinc-400">Browse beats. Own your sound.</p>
      </section>

      <section className="rounded-2xl border border-lime-300/30 bg-lime-300/[0.06] p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-lime-200/80">Newest Release</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {newestReleaseCover ? (
              <img
                src={newestReleaseCover}
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
            <p className="text-xl font-semibold text-zinc-100">Lifestyle • Yung Fazo × Yuck</p>
            <p className="text-sm text-zinc-300">Listen your way, then explore a collection of beats built to inspire your next track.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {releaseLinks.length ? (
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
            )}
            <span className="inline-flex shrink-0 animate-pulse [animation-duration:3.8s] items-center justify-center rounded-full bg-lime-300 px-5 py-2.5 text-sm font-semibold text-zinc-900">
              Listen Now
            </span>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 space-y-3">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500 sm:text-left">Produced For</p>
        <ArtistTicker artists={carouselArtists} />
      </section>

      <FeaturedCarousel productions={featuredProductions} />
      <BeatStore beats={beats} initiallyVisible={beats.length} />

      <section className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
        <p className="text-sm text-zinc-300">Follow the movement</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://www.instagram.com/justronbeats"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@justronbeats"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            aria-label="TikTok"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M14 4v8.5a3.5 3.5 0 1 1-2.7-3.4" />
              <path d="M14 7.2a5.5 5.5 0 0 0 3.8 1.6" />
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@justron"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            aria-label="YouTube"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2.5" y="6" width="19" height="12" rx="3" />
              <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </section>

      <NewsletterCapture />
    </main>
  );
}
