import { NextResponse } from "next/server";

// Public settings for Justron Tanks: Supabase (duos) and PostHog (analytics).
// All of these are already public in the site's client bundle.
export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ error: "Duos are not configured." }, { status: 503 });
  }
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || null;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
  return NextResponse.json({ url, key, posthogKey, posthogHost }, { headers: { "Cache-Control": "public, max-age=300" } });
}
