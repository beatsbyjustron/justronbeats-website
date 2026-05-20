import Stripe from "stripe";
import { NextResponse } from "next/server";
import { BASE_BEAT_LEASE_PRICE_CENTS, getBeatLeasePriceCents } from "@/lib/pricing";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripeClient() {
  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey);
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      console.log("Available keys:", Object.keys(process.env).filter((k) => k.includes("STRIPE")));
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const body = (await request.json()) as {
      beatId?: string;
      drumKitId?: string;
      itemType?: "beat" | "drum_kit";
      title?: string;
      image?: string;
      priceCents?: number;
    };

    const itemType = body.itemType === "drum_kit" ? "drum_kit" : "beat";
    const beatId = body.beatId?.trim() || "";
    const drumKitId = body.drumKitId?.trim() || "";
    const title = body.title?.trim() || "Beat Lease";
    const image = body.image?.trim() || "";
    const requestedPriceCents = Number(body.priceCents ?? BASE_BEAT_LEASE_PRICE_CENTS);
    let checkoutTitle = title;
    let unitAmount =
      Number.isFinite(requestedPriceCents) && requestedPriceCents > 0
        ? Math.round(requestedPriceCents)
        : BASE_BEAT_LEASE_PRICE_CENTS;

    if (itemType === "beat") {
      unitAmount = BASE_BEAT_LEASE_PRICE_CENTS;
      const supabase = getSupabaseServerClient();
      if (supabase && beatId) {
        const { data: beat, error } = await supabase
          .from("beats")
          .select("title, lease_price")
          .eq("id", beatId)
          .maybeSingle();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (beat) {
          checkoutTitle = beat.title || checkoutTitle;
          unitAmount = getBeatLeasePriceCents(beat.lease_price);
        }
      }
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...((itemType === "beat" ? beatId : drumKitId) ? { client_reference_id: itemType === "beat" ? beatId : drumKitId } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: itemType === "drum_kit" ? `${checkoutTitle} - Drum Kit` : `${checkoutTitle} - Lease`,
              ...(image ? { images: [image] } : {})
            }
          }
        }
      ],
      metadata: {
        item_type: itemType,
        beat_id: itemType === "beat" ? beatId : "",
        drum_kit_id: itemType === "drum_kit" ? drumKitId : "",
        license_tier: itemType === "beat" ? "lease" : "drum_kit"
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
