import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

function safeFilename(name: string) {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, "")
      .trim()
      .slice(0, 80) || "drum-kit"
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

    const kitId = session.metadata?.drum_kit_id;
    if (!kitId) {
      return NextResponse.json({ error: "Missing drum kit reference" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: kit, error } = await supabase.from("drum_kits").select("name, zip_path").eq("id", kitId).single();
    if (error || !kit?.zip_path) {
      return NextResponse.json({ error: "Drum kit not found" }, { status: 404 });
    }

    const ref = parseStorageReference(kit.zip_path);
    if (!ref) {
      return NextResponse.json({ error: "Invalid ZIP path" }, { status: 400 });
    }

    const { data: blob, error: downloadError } = await supabase.storage.from(ref.bucket).download(ref.path);
    if (downloadError || !blob) {
      return NextResponse.json({ error: "Could not load ZIP file" }, { status: 500 });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename(kit.name)}.zip"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
