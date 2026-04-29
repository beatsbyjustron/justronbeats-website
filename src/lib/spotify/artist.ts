import "server-only";

type SpotifyArtistProfile = {
  images?: Array<{ url?: string | null; width?: number | null; height?: number | null }>;
  name?: string;
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

