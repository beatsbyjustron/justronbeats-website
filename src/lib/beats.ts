import { Beat, FeaturedProduction } from "@/components/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabasePublicObjectUrl, toSignedStorageUrl } from "@/lib/storage";

type BeatRow = {
  id: string;
  title: string;
  produced_by?: string[] | null;
  producer_credits: string | null;
  bpm: number;
  key: string;
  tags: string[] | null;
  cover_art_url: string | null;
  mp3_url: string;
  wav_url: string | null;
  stems_url: string | null;
  featured: boolean | null;
};

export function slugifyBeatTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseProducedBy(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/,|&| and /i)
    .map((name) => name.trim())
    .filter(Boolean);
}

async function mapBeat(row: BeatRow, supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>): Promise<Beat> {
  const [coverArtUrl, mp3Url, wavUrl, stemsUrl] = await Promise.all([
    toSignedStorageUrl(supabase, row.cover_art_url),
    toSignedStorageUrl(supabase, row.mp3_url),
    toSignedStorageUrl(supabase, row.wav_url),
    toSignedStorageUrl(supabase, row.stems_url)
  ]);

  const safeCoverArtUrl = isSupabasePublicObjectUrl(coverArtUrl) ? "" : coverArtUrl;
  const safeMp3Url = isSupabasePublicObjectUrl(mp3Url) ? "" : mp3Url;
  const safeWavUrl = isSupabasePublicObjectUrl(wavUrl) ? "" : wavUrl;
  const safeStemsUrl = isSupabasePublicObjectUrl(stemsUrl) ? "" : stemsUrl;

  return {
    id: row.id,
    slug: slugifyBeatTitle(row.title),
    title: row.title,
    producedBy: Array.isArray(row.produced_by) ? row.produced_by : parseProducedBy(row.producer_credits),
    bpm: row.bpm,
    key: row.key,
    tags: row.tags ?? [],
    coverArtUrl: safeCoverArtUrl,
    mp3Url: safeMp3Url,
    wavUrl: safeWavUrl,
    stemsUrl: safeStemsUrl,
    featured: Boolean(row.featured)
  };
}

export async function fetchBeats(): Promise<Beat[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("beats").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];

  return Promise.all((data as BeatRow[]).map((row) => mapBeat(row, supabase)));
}

export async function fetchBeatBySlug(slug: string): Promise<Beat | null> {
  const beats = await fetchBeats();
  return beats.find((beat) => beat.slug === slug) ?? null;
}

export function mapFeaturedProductions(beats: Beat[]): FeaturedProduction[] {
  return beats
    .filter((beat) => beat.featured)
    .map((beat) => ({
      id: beat.id,
      song: beat.title,
      artist: beat.producedBy.length ? `Justron x ${beat.producedBy[0]}` : "Justron",
      coverArt: beat.coverArtUrl
    }));
}
