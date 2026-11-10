import { NextResponse } from "next/server";
import { fetchBeats } from "@/lib/beats";

// The store's beats for Justron Tanks: each mission plays a random one.
// mp3 links are the same signed preview URLs the store's player uses.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const beats = await fetchBeats();
  const list = beats
    .filter((beat) => beat.mp3Url)
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
