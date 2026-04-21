import Stripe from "stripe";
import { NextResponse } from "next/server";

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
      title?: string;
      image?: string;
      priceCents?: number;
    };

    const beatId = body.beatId?.trim() || "";
    const title = body.title?.trim() || "Beat Lease";
    const image = body.image?.trim() || "";
    const priceCents = Number(body.priceCents ?? 3000);
    const unitAmount = Number.isFinite(priceCents) && priceCents > 0 ? Math.round(priceCents) : 3000;

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(beatId ? { client_reference_id: beatId } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: `${title} - Lease`,
              ...(image ? { images: [image] } : {})
            }
          }
        }
      ],
      metadata: {
        beat_id: beatId,
        license_tier: "lease"
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
