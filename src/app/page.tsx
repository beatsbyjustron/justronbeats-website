import type { Metadata } from "next";
import { ArtistTicker } from "@/components/artist-ticker";
import { BeatStore } from "@/components/beat-store";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { NewsletterCapture } from "@/components/newsletter-capture";
import { fetchBeats, mapFeaturedProductions } from "@/lib/beats";
import { fetchCarouselArtists } from "@/lib/carousel-artists";

export const metadata: Metadata = {
  title: "Home | Justron Beats",
  description: "Shop official Justron Beats with secure previews, leases, and exclusive offers."
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const beats = await fetchBeats();
  const featuredProductions = mapFeaturedProductions(beats);
  const carouselArtists = await fetchCarouselArtists();

  return (
    <main className="w-full min-w-0 space-y-12">
      <section className="mx-auto max-w-3xl space-y-4 text-center sm:text-left">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Beat Store</p>
        <h1 className="text-4xl font-bold text-zinc-100 sm:text-5xl">Official Store for Justron Beats</h1>
        <p className="text-zinc-400">Browse beats. Own your sound.</p>
      </section>

      <section className="w-full min-w-0 space-y-3">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500 sm:text-left">Produced For</p>
        <ArtistTicker artists={carouselArtists} />
      </section>

      <FeaturedCarousel productions={featuredProductions} />
      <BeatStore beats={beats} initiallyVisible={beats.length} />
      <NewsletterCapture />
    </main>
  );
}
