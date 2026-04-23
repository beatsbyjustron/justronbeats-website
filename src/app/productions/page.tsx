import type { Metadata } from "next";
import { ProductionsGrid } from "@/components/productions-grid";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSignedStorageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Productions | Justron Beats",
  description: "Browse production credits from Justron and open each song on streaming platforms."
};

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

export default async function ProductionsPage() {
  const supabase = getSupabaseServerClient();
  const { data } = supabase
    ? await supabase
        .from("productions")
        .select("id, title, artist, cover_url, spotify_url, apple_url, youtube_url, soundcloud_url, year, created_at")
        .order("created_at", { ascending: false })
    : { data: [] as ProductionRow[] };
  const productions = await Promise.all(
    ((data as ProductionRow[] | null) ?? []).map(async (row) => ({
      ...row,
      cover_url: supabase ? await toSignedStorageUrl(supabase, row.cover_url) : row.cover_url
    }))
  );

  return (
    <main className="space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Productions</h1>
      <ProductionsGrid productions={productions} />
    </main>
  );
}
