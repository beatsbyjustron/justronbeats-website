import { Beat, FeaturedProduction } from "@/components/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

function normalizeStorageUrl(url: string | null) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configuredBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

  // Convert signed URLs to public object URLs for public buckets.
  const signedMatch = trimmed.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signedMatch && supabaseBaseUrl) {
    const bucketFromUrl = signedMatch[1];
    const objectPath = signedMatch[2];
    const bucket = configuredBucket || bucketFromUrl;
    return `${supabaseBaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  if (!configuredBucket) return trimmed;

  return trimmed.replace(/(\/storage\/v1\/object\/public\/)[^/]+/i, `$1${configuredBucket}`);
}

function parseProducedBy(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/,|&| and /i)
    .map((name) => name.trim())
    .filter(Boolean);
}

function mapBeat(row: BeatRow): Beat {
  return {
    id: row.id,
    title: row.title,
    producedBy: Array.isArray(row.produced_by) ? row.produced_by : parseProducedBy(row.producer_credits),
    bpm: row.bpm,
    key: row.key,
    tags: row.tags ?? [],
    coverArtUrl: normalizeStorageUrl(row.cover_art_url),
    mp3Url: normalizeStorageUrl(row.mp3_url),
    wavUrl: normalizeStorageUrl(row.wav_url),
    stemsUrl: normalizeStorageUrl(row.stems_url),
    featured: Boolean(row.featured)
  };
}

export async function fetchBeats(): Promise<Beat[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("beats").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];

  return (data as BeatRow[]).map(mapBeat);
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
