import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient, isValidEmail } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// One link per email per minute (per server instance) to stop inbox spam.
const recent = new Map<string, number>();

function siteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

function emailHtml(link: string) {
  return `<div style="background:#000;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:440px;margin:0 auto;background:#09090b;border:1px solid #27272a;border-radius:20px;padding:32px;text-align:center">
    <div style="font-size:13px;letter-spacing:4px;color:#a1a1aa;font-weight:700">JUSTRONBEATS</div>
    <h1 style="color:#f4f4f5;font-size:22px;margin:16px 0 8px">Sign in to your account</h1>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.5;margin:0 0 24px">Tap the button to sign in. The link works for 1 hour.</p>
    <a href="${link}" style="display:inline-block;background:#bef264;color:#18181b;font-weight:800;text-decoration:none;border-radius:999px;padding:12px 28px;font-size:15px">Sign in</a>
    <p style="color:#71717a;font-size:12px;margin:24px 0 0">Didn't ask for this? You can ignore this email.</p>
  </div>
</div>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; marketing?: boolean; next?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : "/account";

    const last = recent.get(email) ?? 0;
    if (Date.now() - last < 60_000) {
      return NextResponse.json({ error: "We just sent you a link. Check your inbox, or try again in a minute." }, { status: 429 });
    }
    recent.set(email, Date.now());

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });
    }

    if (body.marketing) {
      await admin
        .from("subscribers")
        .upsert({ email, source: "account", marketing: true, updated_at: new Date().toISOString() }, { onConflict: "email" });
    }

    const origin = siteOrigin(request);

    // Preferred: make the sign-in link ourselves and send it through Resend.
    let { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error && /not.*found/i.test(error.message)) {
      await admin.auth.admin.createUser({ email, email_confirm: true });
      ({ data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email }));
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!error && data?.properties?.hashed_token && resendKey) {
      const type = data.properties.verification_type || "magiclink";
      const link = `${origin}/account?th=${encodeURIComponent(data.properties.hashed_token)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`;
      const resend = new Resend(resendKey);
      const sent = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: "Your JustronBeats sign-in link",
        text: `Sign in to JustronBeats: ${link}\n\nThe link works for 1 hour. Didn't ask for this? Ignore this email.`,
        html: emailHtml(link)
      });
      if (!sent.error) return NextResponse.json({ success: true });
      console.error("email-link: resend", sent.error.message);
    } else if (error) {
      console.error("email-link: generateLink", error.message);
    }

    // Fallback: let Supabase send its own magic-link email.
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (anonKey && url) {
      const anon = createClient(url, anonKey, { auth: { persistSession: false } });
      const { error: otpError } = await anon.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/account?next=${encodeURIComponent(next)}`, shouldCreateUser: true }
      });
      if (!otpError) return NextResponse.json({ success: true });
      console.error("email-link: otp", otpError.message);
    }

    recent.delete(email);
    return NextResponse.json({ error: "Couldn't send the email right now. Please try again." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Couldn't send the email right now. Please try again." }, { status: 500 });
  }
}
