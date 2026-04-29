import { NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify/artist";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

export async function GET(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") ?? "").trim();
    if (!query) {
      return NextResponse.json({ artists: [] });
    }

    const artists = await searchSpotifyArtists(query, 8);
    return NextResponse.json({ artists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search Spotify artists.";
    console.error("[api/spotify/search] Request failed", {
      message,
      query: (() => {
        try {
          return String(new URL(request.url).searchParams.get("q") ?? "").slice(0, 120);
        } catch {
          return "";
        }
      })()
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

