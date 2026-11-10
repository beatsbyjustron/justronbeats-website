import { NextResponse } from "next/server";
import { getAdminClient, isValidEmail } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SOURCES = new Set(["justronbeats-website", "justron-tanks", "account"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; source?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    const source = body.source && SOURCES.has(body.source) ? body.source : "justronbeats-website";

    // 1. Save to Supabase (the source of truth for the email list).
    let saved = false;
    const admin = getAdminClient();
    if (admin) {
      const { error } = await admin
        .from("subscribers")
        .upsert({ email, source, marketing: true, updated_at: new Date().toISOString() }, { onConflict: "email" });
      saved = !error;
      if (error) console.error("subscribe: supabase", error.message);
    }

    // 2. Also forward to the Make webhook if one is configured.
    let forwarded = false;
    const webhookUrl = process.env.MAKE_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source, submittedAt: new Date().toISOString() })
        });
        forwarded = res.ok;
      } catch {
        forwarded = false;
      }
    }

    if (!saved && !forwarded) {
      return NextResponse.json({ error: "Could not save your email right now. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not save your email right now. Please try again." }, { status: 500 });
  }
}
