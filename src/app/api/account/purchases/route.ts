import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser, likeExact } from "@/lib/supabase/admin";
import { slugifyBeatTitle } from "@/lib/beats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pull a buyer's past Stripe checkouts into the purchases table (at most every 10 minutes per email).
const lastSync = new Map<string, number>();

async function syncFromStripe(email: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  const admin = getAdminClient();
  if (!key || !admin) return;
  if (Date.now() - (lastSync.get(email) ?? 0) < 10 * 60_000) return;
  lastSync.set(email, Date.now());
  try {
    const stripe = new Stripe(key);
    const variants = Array.from(new Set([email, email.toLowerCase()]));
    const rows: Record<string, unknown>[] = [];
    for (const variant of variants) {
      const list = await stripe.checkout.sessions.list({ customer_details: { email: variant }, limit: 100 });
      for (const s of list.data) {
        if (s.payment_status !== "paid") continue;
        const itemType = s.metadata?.item_type === "drum_kit" ? "drum_kit" : "beat";
        const beatId = itemType === "beat" ? s.metadata?.beat_id || s.client_reference_id || null : null;
        const kitId = itemType === "drum_kit" ? s.metadata?.drum_kit_id || s.client_reference_id || null : null;
        if (!beatId && !kitId) continue;
        rows.push({
          stripe_session_id: s.id,
          email: (s.customer_details?.email || variant).toLowerCase(),
          item_type: itemType,
          beat_id: beatId,
          drum_kit_id: kitId,
          amount_cents: s.amount_total ?? null,
          currency: s.currency ?? null,
          created_at: new Date(s.created * 1000).toISOString()
        });
      }
    }
    if (rows.length) {
      const { error } = await admin.from("purchases").upsert(rows, { onConflict: "stripe_session_id", ignoreDuplicates: true });
      if (error) console.error("purchases sync", error.message);
    }
  } catch (error) {
    lastSync.delete(email);
    console.error("purchases sync", error instanceof Error ? error.message : error);
  }
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });
  const email = user.email.toLowerCase();

  await syncFromStripe(email);

  const { data, error } = await admin
    .from("purchases")
    .select("id, item_type, beat_id, drum_kit_id, amount_cents, currency, created_at")
    .ilike("email", likeExact(email))
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Couldn't load your purchases." }, { status: 500 });

  const beatIds = Array.from(new Set((data ?? []).map((p) => p.beat_id).filter(Boolean))) as string[];
  const kitIds = Array.from(new Set((data ?? []).map((p) => p.drum_kit_id).filter(Boolean))) as string[];
  const [beatsRes, kitsRes] = await Promise.all([
    beatIds.length ? admin.from("beats").select("id, title, cover_art_url").in("id", beatIds) : Promise.resolve({ data: [] as { id: string; title: string; cover_art_url: string | null }[] }),
    kitIds.length ? admin.from("drum_kits").select("id, name, image_path").in("id", kitIds) : Promise.resolve({ data: [] as { id: string; name: string; image_path: string | null }[] })
  ]);
  const beats = new Map((beatsRes.data ?? []).map((b) => [b.id, b]));
  const kits = new Map((kitsRes.data ?? []).map((k) => [k.id, k]));

  const purchases = (data ?? []).map((p) => {
    const beat = p.beat_id ? beats.get(p.beat_id) : undefined;
    const kit = p.drum_kit_id ? kits.get(p.drum_kit_id) : undefined;
    return {
      id: p.id,
      type: p.item_type,
      name: beat?.title ?? kit?.name ?? (p.item_type === "drum_kit" ? "Drum kit" : "Beat"),
      slug: beat ? slugifyBeatTitle(beat.title) : null,
      cover: beat?.cover_art_url ?? kit?.image_path ?? "",
      amountCents: p.amount_cents,
      currency: p.currency,
      createdAt: p.created_at,
      available: !!(beat || kit)
    };
  });
  return NextResponse.json({ purchases });
}
