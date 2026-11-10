import { NextResponse } from "next/server";

// Public Supabase settings for Justron Tanks duos (Realtime broadcast only).
// The anon key is already public in the site's client bundle.
export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ error: "Duos are not configured." }, { status: 503 });
  }
  return NextResponse.json({ url, key }, { headers: { "Cache-Control": "public, max-age=300" } });
}
