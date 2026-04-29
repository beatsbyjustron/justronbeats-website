import "server-only";

type SpotifyArtistProfile = {
  id?: string;
  images?: Array<{ url?: string | null; width?: number | null; height?: number | null }>;
  name?: string;
  followers?: { total?: number | null };
  external_urls?: { spotify?: string | null };
};

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function getSpotifyArtistIdFromUrl(spotifyUrl: string): string | null {
  const trimmed = spotifyUrl.trim();
  const match = trimmed.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1] ?? null;
}

async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > now + 30_000) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify auth failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  const token = String(json.access_token ?? "").trim();
  const expiresIn = Number(json.expires_in ?? 3600);
  if (!token) throw new Error("Spotify auth returned no access_token.");

  cachedAccessToken = { token, expiresAtMs: now + expiresIn * 1000 };
  return token;
}

export async function fetchSpotifyArtistImageFromUrl(
  spotifyUrl: string
): Promise<{ spotifyArtistId: string; imageUrl: string | null; name: string | null }> {
  const spotifyArtistId = getSpotifyArtistIdFromUrl(spotifyUrl);
  if (!spotifyArtistId) {
    throw new Error("Invalid Spotify artist URL.");
  }

  const token = await getSpotifyAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${encodeURIComponent(spotifyArtistId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify artist lookup failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as SpotifyArtistProfile;
  const images = Array.isArray(json.images) ? json.images : [];

  // Spotify returns images ordered largest -> smallest. Pick the first valid URL.
  const firstUrl = images.find((img) => img?.url)?.url ?? null;
  const imageUrl = firstUrl ? String(firstUrl).trim() : null;

  return {
    spotifyArtistId,
    imageUrl,
    name: json.name ? String(json.name).trim() : null
  };
}

export type SpotifyArtistSearchResult = {
  spotifyArtistId: string;
  name: string;
  spotifyUrl: string;
  imageUrl: string | null;
  monthlyListeners: number;
};

function mapArtistProfileToResult(profile: SpotifyArtistProfile): SpotifyArtistSearchResult | null {
  const spotifyArtistId = String(profile.id ?? "").trim();
  const name = String(profile.name ?? "").trim();
  if (!spotifyArtistId || !name) return null;

  const images = Array.isArray(profile.images) ? profile.images : [];
  const imageUrl = images.find((img) => img?.url)?.url ? String(images.find((img) => img?.url)?.url).trim() : null;
  const spotifyUrl = String(profile.external_urls?.spotify ?? "").trim();
  // Spotify does not expose monthly listeners publicly; use follower total as the best available numeric signal.
  const monthlyListeners = Math.max(0, Number(profile.followers?.total ?? 0) || 0);

  return {
    spotifyArtistId,
    name,
    spotifyUrl,
    imageUrl,
    monthlyListeners
  };
}

export async function searchSpotifyArtists(query: string, limit = 8): Promise<SpotifyArtistSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const token = await getSpotifyAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("type", "artist");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 20)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify artist search failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { artists?: { items?: SpotifyArtistProfile[] } };
  const items = Array.isArray(json.artists?.items) ? json.artists?.items : [];
  return items.map(mapArtistProfileToResult).filter((item): item is SpotifyArtistSearchResult => Boolean(item));
}

