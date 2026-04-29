import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import { fetchSpotifyArtistImageFromUrl } from "@/lib/spotify/artist";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

async function maybeFetchImageUrlFromSpotify(spotifyUrl: string, imageUrl?: string | null) {
  const shouldFetch = !imageUrl || !String(imageUrl).trim();
  if (!shouldFetch) return imageUrl;
  const { imageUrl: fetched } = await fetchSpotifyArtistImageFromUrl(spotifyUrl);
  return fetched;
}

export async function GET(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("carousel_artists")
    .select("id, name, spotify_url, image_url, monthly_listeners, display_order, created_at")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];
  return NextResponse.json({
    artists: rows.map((row: any, index: number) => ({
      id: String(row.id),
      name: String(row.name),
      spotifyUrl: String(row.spotify_url ?? ""),
      imageUrl: row.image_url ? String(row.image_url) : null,
      monthlyListeners: Number(row.monthly_listeners ?? 0) || 0,
      displayOrder: Number(row.display_order ?? index) || 0
    }))
  });
}

export async function POST(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      spotifyUrl?: string;
      spotify_url?: string;
      imageUrl?: string | null;
      image_url?: string | null;
      monthlyListeners?: number;
      monthly_listeners?: number;
    };

    const name = String(body.name ?? "").trim();
    const spotifyUrl = String(body.spotifyUrl ?? body.spotify_url ?? "").trim();
    const imageUrl = (body.imageUrl ?? body.image_url ?? null) as string | null;
    const monthlyListenersRaw = body.monthlyListeners ?? body.monthly_listeners ?? 0;
    const monthlyListeners = Number.isFinite(Number(monthlyListenersRaw)) ? Math.max(0, Number(monthlyListenersRaw)) : 0;

    if (!name || !spotifyUrl) {
      return NextResponse.json({ error: "Artist name and Spotify artist URL are required." }, { status: 400 });
    }

    // Ensure we persist the image URL if admin pasted a Spotify URL but didn't fetch manually.
    const finalImageUrl = await maybeFetchImageUrlFromSpotify(spotifyUrl, imageUrl);

    // Put at the end by default.
    const { data: maxRow, error: maxErr } = await supabase
      .from("carousel_artists")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) return NextResponse.json({ error: maxErr.message }, { status: 500 });
    const nextDisplayOrder = Number(maxRow?.display_order ?? 0) + 1;

    const { error } = await supabase.from("carousel_artists").insert({
      name,
      spotify_url: spotifyUrl,
      image_url: finalImageUrl ?? null,
      monthly_listeners: monthlyListeners,
      display_order: nextDisplayOrder
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      spotifyUrl?: string;
      spotify_url?: string;
      imageUrl?: string | null;
      image_url?: string | null;
      monthlyListeners?: number;
      monthly_listeners?: number;
    };

    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Artist id is required." }, { status: 400 });

    const name = String(body.name ?? "").trim();
    const spotifyUrl = String(body.spotifyUrl ?? body.spotify_url ?? "").trim();
    const imageUrl = (body.imageUrl ?? body.image_url ?? undefined) as string | null | undefined;
    const monthlyListenersProvided = body.monthlyListeners !== undefined || body.monthly_listeners !== undefined;
    const monthlyListenersRaw = body.monthlyListeners ?? body.monthly_listeners;
    const monthlyListeners = monthlyListenersProvided
      ? Number.isFinite(Number(monthlyListenersRaw)) ? Math.max(0, Number(monthlyListenersRaw)) : 0
      : undefined;

    const { data: existing, error: existingErr } = await supabase
      .from("carousel_artists")
      .select("spotify_url, image_url")
      .eq("id", id)
      .single();

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

    const shouldFetchImage =
      Boolean(spotifyUrl) && (!imageUrl || !String(imageUrl).trim()) && String(existing?.spotify_url ?? "") !== spotifyUrl;

    const finalImageUrl = shouldFetchImage ? await maybeFetchImageUrlFromSpotify(spotifyUrl, existing?.image_url) : imageUrl ?? existing?.image_url;

    const payload = {
      ...(name ? { name } : {}),
      ...(spotifyUrl ? { spotify_url: spotifyUrl } : {}),
      image_url: finalImageUrl ?? null,
      ...(monthlyListeners !== undefined ? { monthly_listeners: monthlyListeners } : {})
    } as {
      name?: string;
      spotify_url?: string;
      image_url: string | null;
      monthly_listeners?: number;
    };

    const { error } = await supabase.from("carousel_artists").update(payload).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Artist id is required." }, { status: 400 });

    const { error } = await supabase.from("carousel_artists").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

