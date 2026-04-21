import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getStoragePath(url: string) {
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (publicMatch) return { bucket: publicMatch[1], path: publicMatch[2] };

  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signedMatch) return { bucket: signedMatch[1], path: signedMatch[2] };

  return null;
}

async function createSecureDownloadUrl(mp3Url: string) {
  const parsed = getStoragePath(mp3Url);
  if (!parsed) return mp3Url;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60 * 24);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !resendApiKey) {
    return NextResponse.json({ error: "Missing STRIPE/RESEND env configuration" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const resend = new Resend(resendApiKey);

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature header" }, { status: 400 });
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const customerEmail = session.customer_details?.email || session.customer_email;
    const beatId = session.metadata?.beat_id || session.client_reference_id;

    if (!customerEmail || !beatId) {
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase env configuration missing" }, { status: 500 });
    }

    const { data: beat, error } = await supabase.from("beats").select("title, mp3_url").eq("id", beatId).single();
    if (error || !beat?.mp3_url) {
      return NextResponse.json({ received: true });
    }

    const downloadUrl = await createSecureDownloadUrl(beat.mp3_url);
    if (!downloadUrl) {
      return NextResponse.json({ error: "Could not generate secure download URL" }, { status: 500 });
    }

    const beatName = beat.title || "your beat";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Your download link for ${beatName}`,
      text: `Thanks for your purchase! Here is your download link for ${beatName}: ${downloadUrl}`,
      html: `<p>Thanks for your purchase! Here is your download link for <strong>${beatName}</strong>.</p><p><a href="${downloadUrl}">Download your beat</a></p>`
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
