import { NextResponse } from "next/server";
import { fetchBeats } from "@/lib/beats";
import { getAdminClient } from "@/lib/supabase/admin";

// The store's beats for Justron Tanks: each mission plays a random one.
// mp3 links are the same signed preview URLs the store's player uses.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const beats = await fetchBeats();
  // Beats switched off in admin ("In Tanks") stay out of the game. If the column
  // doesn't exist yet, every beat plays.
  const off = new Set<string>();
  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin.from("beats").select("id, in_tanks").eq("in_tanks", false);
    if (!error) for (const row of data ?? []) off.add(row.id as string);
  }
  const list = beats
    .filter((beat) => beat.mp3Url && !off.has(beat.id))
    .map((beat) => ({
      id: beat.id,
      title: beat.title,
      slug: beat.slug,
      bpm: beat.bpm,
      key: beat.key,
      producedBy: beat.producedBy,
      url: beat.mp3Url
    }));
  return NextResponse.json({ beats: list }, { headers: { "Cache-Control": "private, no-store" } });
}
