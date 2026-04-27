import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

type SalesRow = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  itemName: string;
  licenseType: string;
  amountPaid: number;
  purchasedAt: string;
};

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

function normalizeItemName(rawName: string) {
  return rawName.replace(/\s*-\s*(Lease|Exclusive|Drum Kit)$/i, "").trim();
}

function normalizeLicenseType(raw: string, fallbackItemType: string) {
  const value = raw.trim().toLowerCase();
  if (value === "exclusive") return "exclusive";
  if (value === "lease") return "lease";
  if (value === "drum_kit") return "drum kit";
  if (fallbackItemType === "drum_kit") return "drum kit";
  return "lease";
}

export async function GET(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const sessions: Stripe.Checkout.Session[] = [];
    let startingAfter: string | undefined;

    for (let page = 0; page < 10; page += 1) {
      const result = await stripe.checkout.sessions.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      sessions.push(...result.data);
      if (!result.has_more || result.data.length === 0) break;
      startingAfter = result.data[result.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    const paidSessions = sessions.filter((session) => session.payment_status === "paid");

    const rows: SalesRow[] = await Promise.all(
      paidSessions.map(async (session) => {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const lineItemName = String(lineItems.data[0]?.description ?? "").trim();
        const metadata = session.metadata ?? {};
        const itemType = metadata.item_type === "drum_kit" ? "drum_kit" : "beat";
        const licenseType = normalizeLicenseType(String(metadata.license_tier ?? ""), itemType);

        return {
          id: session.id,
          buyerName: String(session.customer_details?.name ?? "").trim(),
          buyerEmail: String(session.customer_details?.email ?? session.customer_email ?? "").trim(),
          itemName: normalizeItemName(lineItemName || (itemType === "drum_kit" ? "Drum Kit" : "Beat")),
          licenseType,
          amountPaid: Number(session.amount_total ?? 0) / 100,
          purchasedAt: new Date((session.created ?? 0) * 1000).toISOString()
        };
      })
    );

    rows.sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1));
    const totalRevenue = rows.reduce((sum, row) => sum + row.amountPaid, 0);

    return NextResponse.json({ rows, totalRevenue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Stripe sales.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
