import { ProductionsGrid } from "@/components/productions-grid";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductionRow = {
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

function normalizeStorageUrl(url: string | null) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configuredBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
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

export default async function ProductionsPage() {
  const supabase = getSupabaseServerClient();
  const { data } = supabase
    ? await supabase
        .from("productions")
        .select("id, title, artist, cover_url, spotify_url, apple_url, youtube_url, soundcloud_url, year, created_at")
        .order("created_at", { ascending: false })
    : { data: [] as ProductionRow[] };
  const productions = ((data as ProductionRow[] | null) ?? []).map((row) => ({
    ...row,
    cover_url: normalizeStorageUrl(row.cover_url)
  }));

  return (
    <main className="space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Productions</h1>
      <ProductionsGrid productions={productions} />
    </main>
  );
}
