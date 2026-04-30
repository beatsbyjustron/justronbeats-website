import type { Metadata } from "next";
import { ArtistTicker } from "@/components/artist-ticker";
import { BeatStore } from "@/components/beat-store";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { NewsletterCapture } from "@/components/newsletter-capture";
import { ReleaseSpotlightRotator } from "@/components/release-spotlight-rotator";
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
  const BTS_VIDEO_URL = "https://youtu.be/xkQ8nytpA_s?si=s3UN_T9Fjc8opQfr";
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

      <ReleaseSpotlightRotator coverUrl={newestReleaseCover} releaseLinks={releaseLinks} btsUrl={BTS_VIDEO_URL} />

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
