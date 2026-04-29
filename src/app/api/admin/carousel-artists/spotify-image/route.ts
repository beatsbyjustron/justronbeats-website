import { NextResponse } from "next/server";
import { fetchSpotifyArtistImageFromUrl } from "@/lib/spotify/artist";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

export async function POST(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { spotifyUrl?: string; spotify_url?: string };
    const spotifyUrl = String(body.spotifyUrl ?? body.spotify_url ?? "").trim();
    if (!spotifyUrl) {
      return NextResponse.json({ error: "Missing spotify_url" }, { status: 400 });
    }

    const { imageUrl, name, spotifyArtistId } = await fetchSpotifyArtistImageFromUrl(spotifyUrl);
    return NextResponse.json({ imageUrl, name, spotifyArtistId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Spotify artist image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

