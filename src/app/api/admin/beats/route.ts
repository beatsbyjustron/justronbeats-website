import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const BUCKET: string = process.env.SUPABASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "beats";

function fileExt(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "bin";
}

async function uploadFile(supabase: SupabaseClient<Database>, file: File, folder: string) {
  const extension = fileExt(file.name);
  const path = `${folder}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream"
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = String(formData.get("password") ?? "");
    const expectedPassword = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

    if (password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
    }
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const title = String(formData.get("title") ?? "");
    const producerCredits = String(formData.get("producerCredits") ?? "");
    const providedKey = String(formData.get("key") ?? "").trim();
    const parsedBpm = Number(formData.get("bpm") ?? 0);
    const key = providedKey || "Unknown";
    const bpm = Number.isFinite(parsedBpm) && parsedBpm > 0 ? parsedBpm : 0;
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const featured = String(formData.get("featured") ?? "false") === "true";

    const providedCoverArtUrl = String(formData.get("coverArtUrl") ?? "").trim();
    const providedMp3Url = String(formData.get("mp3Url") ?? "").trim();
    const providedWavUrl = String(formData.get("wavUrl") ?? "").trim();
    const providedStemsUrl = String(formData.get("stemsUrl") ?? "").trim();

    const coverArt = formData.get("coverArt") as File;
    const mp3File = formData.get("mp3File") as File;
    const wavFile = formData.get("wavFile") as File | null;
    const stemsFile = formData.get("stemsFile") as File | null;

    const hasCoverArt = coverArt instanceof File && coverArt.size > 0;
    const hasMp3 = mp3File instanceof File && mp3File.size > 0;
    const hasWav = wavFile instanceof File && wavFile.size > 0;
    const hasStems = stemsFile instanceof File && stemsFile.size > 0;

    const hasProvidedCoverArt = Boolean(providedCoverArtUrl);
    const hasProvidedMp3 = Boolean(providedMp3Url);

    if (!title || (!hasMp3 && !hasProvidedMp3) || (!hasCoverArt && !hasProvidedCoverArt)) {
      return NextResponse.json({ error: "Title, cover art, and MP3 are required." }, { status: 400 });
    }

    const folder = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const coverArtUrl =
      hasCoverArt && coverArt instanceof File ? await uploadFile(supabase, coverArt, folder) : providedCoverArtUrl;
    const mp3Url = hasMp3 && mp3File instanceof File ? await uploadFile(supabase, mp3File, folder) : providedMp3Url;

    let wavUrl: string | null = providedWavUrl || null;
    if (hasWav && wavFile instanceof File) {
      wavUrl = await uploadFile(supabase, wavFile, folder);
    }

    let stemsUrl: string | null = providedStemsUrl || null;
    if (hasStems && stemsFile instanceof File) {
      stemsUrl = await uploadFile(supabase, stemsFile, folder);
    }

    const { error } = await supabase.from("beats").insert({
      title,
      producer_credits: producerCredits,
      key,
      bpm,
      tags,
      cover_art_url: coverArtUrl,
      mp3_url: mp3Url,
      wav_url: wavUrl,
      stems_url: stemsUrl,
      featured,
      lease_price: 30,
      lease_terms:
        "Tagged MP3 file. Sell up to 2,500 units. 50,000 audio streams. Singles, albums, and streaming. Justron maintains ownership. Must give credit (prod. justron).",
      premium_price: null,
      premium_terms: null,
      exclusive_price: null,
      exclusive_terms:
        "Exclusive rights. Unlimited copies and streams. WAV, MP3, and stems included. 50/50 publishing split. Albums, singles, streaming, TV, and film. Must give credit (prod. justron)."
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
