import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
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
    .from("productions")
    .select("id, song_title, artist_name, cover_art_url, spotify_url, apple_music_url, youtube_url, soundcloud_url, year, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ productions: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: string;
      songTitle?: string;
      artistName?: string;
      coverArtUrl?: string;
      spotifyUrl?: string;
      appleMusicUrl?: string;
      youtubeUrl?: string;
      soundcloudUrl?: string;
      year?: number | null;
    };

    if (String(body.password ?? "") !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
    }

    const songTitle = String(body.songTitle ?? "").trim();
    const artistName = String(body.artistName ?? "").trim();
    const coverArtUrl = String(body.coverArtUrl ?? "").trim();

    if (!songTitle || !artistName || !coverArtUrl) {
      return NextResponse.json({ error: "Song title, artist name, and cover art are required." }, { status: 400 });
    }

    const maybeYear = Number(body.year);
    const year = Number.isFinite(maybeYear) && maybeYear > 0 ? Math.floor(maybeYear) : null;

    const { error } = await supabase.from("productions").insert({
      song_title: songTitle,
      artist_name: artistName,
      cover_art_url: coverArtUrl,
      spotify_url: String(body.spotifyUrl ?? "").trim() || null,
      apple_music_url: String(body.appleMusicUrl ?? "").trim() || null,
      youtube_url: String(body.youtubeUrl ?? "").trim() || null,
      soundcloud_url: String(body.soundcloudUrl ?? "").trim() || null,
      year
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/productions");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create production.";
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
    if (!id) {
      return NextResponse.json({ error: "Production id is required." }, { status: 400 });
    }

    const { error } = await supabase.from("productions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/productions");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete production.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
