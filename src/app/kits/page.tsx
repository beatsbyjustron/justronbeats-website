import type { Metadata } from "next";
import { KitsGrid } from "@/components/kits-grid";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSignedStorageUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Kits | Justron Beats",
  description: "Browse official Justron drum kits and download free or paid packs securely."
};

export const dynamic = "force-dynamic";

type DrumKitRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_path: string | null;
  zip_path: string;
};

export default async function KitsPage() {
  const supabase = getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.from("drum_kits").select("id, name, description, price, image_path, zip_path, created_at").order("created_at", { ascending: false })
    : { data: [] as DrumKitRow[] };

  const kits = await Promise.all(
    ((data as DrumKitRow[] | null) ?? []).map(async (kit) => ({
      id: kit.id,
      name: kit.name,
      description: kit.description,
      price: Number(kit.price ?? 0),
      imageUrl: supabase ? await toSignedStorageUrl(supabase, kit.image_path) : ""
    }))
  );

  return (
    <main className="space-y-8">
      <section className="max-w-3xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sound Packs</p>
        <h1 className="text-4xl font-bold text-zinc-100 sm:text-5xl">Official Drum Kits</h1>
        <p className="text-zinc-400">Download free kits or buy premium packs instantly.</p>
      </section>
      <KitsGrid kits={kits} />
    </main>
  );
}
