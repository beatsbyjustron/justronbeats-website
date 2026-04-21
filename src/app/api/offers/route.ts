import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      beatId?: string;
      email?: string;
      offerAmount?: number;
    };

    const beatId = body.beatId?.trim();
    const email = body.email?.trim();
    const offerAmount = Number(body.offerAmount ?? 0);

    if (!beatId || !email || !offerAmount) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const { error } = await supabase.from("beat_offers").insert({
      beat_id: beatId,
      buyer_email: email,
      offer_amount: offerAmount
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit offer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
