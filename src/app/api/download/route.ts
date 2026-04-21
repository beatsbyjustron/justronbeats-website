import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function parseStorageRef(mp3Url: string): { bucket: string; path: string } | null {
  const publicMatch = mp3Url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (publicMatch) return { bucket: publicMatch[1], path: publicMatch[2] };

  const signedMatch = mp3Url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signedMatch) return { bucket: signedMatch[1], path: signedMatch[2] };

  return null;
}

function safeFilename(title: string) {
  return (
    title
      .replace(/[/\\?%*:|"<>]/g, "")
      .trim()
      .slice(0, 80) || "beat"
  );
}

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("session_id");
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!sessionId || !stripeKey) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 403 });
    }

    const beatId = session.metadata?.beat_id || session.client_reference_id;
    if (!beatId) {
      return NextResponse.json({ error: "Missing beat reference" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: beat, error } = await supabase.from("beats").select("title, mp3_url").eq("id", beatId).single();
    if (error || !beat?.mp3_url) {
      return NextResponse.json({ error: "Beat not found" }, { status: 404 });
    }

    const ref = parseStorageRef(beat.mp3_url);
    if (!ref) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    const { data: blob, error: downloadError } = await supabase.storage.from(ref.bucket).download(ref.path);
    if (downloadError || !blob) {
      return NextResponse.json({ error: "Could not load file" }, { status: 500 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `${safeFilename(beat.title)}.mp3`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
