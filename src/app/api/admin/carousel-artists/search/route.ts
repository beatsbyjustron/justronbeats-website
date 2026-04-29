import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

type SpotifySearchArtist = {
  id?: string;
  name?: string;
  images?: Array<{ url?: string | null }>;
  followers?: { total?: number | null };
  external_urls?: { spotify?: string | null };
};

function normalizeSpotifyArtists(items: SpotifySearchArtist[]) {
  return items
    .map((artist) => {
      const id = String(artist.id ?? "").trim();
      const name = String(artist.name ?? "").trim();
      if (!id || !name) return null;
      const images = Array.isArray(artist.images) ? artist.images : [];
      const imageUrlRaw = images.find((img) => img?.url)?.url;
      return {
        spotifyArtistId: id,
        name,
        spotifyUrl: String(artist.external_urls?.spotify ?? "").trim(),
        imageUrl: imageUrlRaw ? String(imageUrlRaw).trim() : null,
        monthlyListeners: Math.max(0, Number(artist.followers?.total ?? 0) || 0)
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function GET(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json({ artists: [] });
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
    console.info("[carousel-artists/search] Incoming query", {
      queryLength: query.length,
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length
    });

    if (!clientId || !clientSecret) {
      console.error("[carousel-artists/search] Missing Spotify env vars.");
      return NextResponse.json(
        { error: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars." },
        { status: 500 }
      );
    }

    // 1) Client credentials token request
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenRawBody = await tokenResponse.text();
    console.info("[carousel-artists/search] Token response", {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      body: tokenRawBody
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: `Spotify token request failed (${tokenResponse.status}).`,
          spotifyResponse: tokenRawBody
        },
        { status: 500 }
      );
    }

    let accessToken = "";
    try {
      const parsed = JSON.parse(tokenRawBody) as { access_token?: string };
      accessToken = String(parsed.access_token ?? "").trim();
    } catch (parseErr) {
      console.error("[carousel-artists/search] Token JSON parse failed", parseErr);
      return NextResponse.json(
        {
          error: "Spotify token response was not valid JSON.",
          spotifyResponse: tokenRawBody
        },
        { status: 500 }
      );
    }

    if (!accessToken) {
      console.error("[carousel-artists/search] Missing access_token in token response.");
      return NextResponse.json(
        {
          error: "Spotify token response missing access_token.",
          spotifyResponse: tokenRawBody
        },
        { status: 500 }
      );
    }

    // 2) Search request
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "artist");
    searchUrl.searchParams.set("limit", "8");

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const searchRawBody = await searchResponse.text();
    console.info("[carousel-artists/search] Search response", {
      status: searchResponse.status,
      ok: searchResponse.ok,
      body: searchRawBody
    });

    if (!searchResponse.ok) {
      return NextResponse.json(
        {
          error: `Spotify search failed (${searchResponse.status}).`,
          spotifyResponse: searchRawBody
        },
        { status: 500 }
      );
    }

    let parsedSearch: { artists?: { items?: SpotifySearchArtist[] } };
    try {
      parsedSearch = JSON.parse(searchRawBody) as { artists?: { items?: SpotifySearchArtist[] } };
    } catch (parseErr) {
      console.error("[carousel-artists/search] Search JSON parse failed", parseErr);
      return NextResponse.json(
        {
          error: "Spotify search response was not valid JSON.",
          spotifyResponse: searchRawBody
        },
        { status: 500 }
      );
    }

    const items = Array.isArray(parsedSearch.artists?.items) ? parsedSearch.artists.items : [];
    const artists = normalizeSpotifyArtists(items);
    return NextResponse.json({ artists });
  } catch (error) {
    console.error("[carousel-artists/search] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Failed to search Spotify artists.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

