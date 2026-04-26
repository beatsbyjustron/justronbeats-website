import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedUrlExpirySeconds, parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

async function createSecureDownloadUrl(mp3Url: string) {
  const parsed = parseStorageReference(mp3Url);
  if (!parsed) return mp3Url;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, Math.max(60 * 60 * 24, getSignedUrlExpirySeconds()));
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function createSecureStorageDownloadUrl(pathValue: string) {
  const parsed = parseStorageReference(pathValue);
  if (!parsed) return pathValue;
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, Math.max(60 * 60 * 24, getSignedUrlExpirySeconds()));
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
    const itemType = session.metadata?.item_type === "drum_kit" ? "drum_kit" : "beat";
    const beatId = session.metadata?.beat_id || (itemType === "beat" ? session.client_reference_id : "");
    const drumKitId = session.metadata?.drum_kit_id || (itemType === "drum_kit" ? session.client_reference_id : "");

    if (!customerEmail || (!beatId && !drumKitId)) {
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase env configuration missing" }, { status: 500 });
    }

    let downloadUrl = "";
    let itemName = "your purchase";
    if (itemType === "drum_kit") {
      if (!drumKitId) return NextResponse.json({ received: true });
      const { data: kit, error } = await supabase.from("drum_kits").select("name, zip_path").eq("id", drumKitId).single();
      if (error || !kit?.zip_path) return NextResponse.json({ received: true });
      const signed = await createSecureStorageDownloadUrl(kit.zip_path);
      if (!signed) return NextResponse.json({ error: "Could not generate secure download URL" }, { status: 500 });
      downloadUrl = signed;
      itemName = kit.name || "your drum kit";
    } else {
      if (!beatId) return NextResponse.json({ received: true });
      const { data: beat, error } = await supabase.from("beats").select("title, mp3_url").eq("id", beatId).single();
      if (error || !beat?.mp3_url) return NextResponse.json({ received: true });
      const signed = await createSecureDownloadUrl(beat.mp3_url);
      if (!signed) return NextResponse.json({ error: "Could not generate secure download URL" }, { status: 500 });
      downloadUrl = signed;
      itemName = beat.title || "your beat";
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Your download link for ${itemName}`,
      text: `Thanks for your purchase! Here is your download link for ${itemName}: ${downloadUrl}`,
      html: `<p>Thanks for your purchase! Here is your download link for <strong>${itemName}</strong>.</p><p><a href="${downloadUrl}">Download now</a></p>`
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
