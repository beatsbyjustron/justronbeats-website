import Link from "next/link";
import Stripe from "stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!sessionId || !stripeKey) {
    return (
      <main className="mx-auto max-w-2xl space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Payment Success</p>
        <h1 className="text-4xl font-bold text-zinc-100">Thank you for your purchase.</h1>
        <p className="text-zinc-300">We could not verify this checkout session. Contact support if this looks wrong.</p>
        <Link
          href="/"
          className="inline-block rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Back to store
        </Link>
      </main>
    );
  }

  const stripe = new Stripe(stripeKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const isPaid = session.payment_status === "paid";
  const itemType = session.metadata?.item_type === "drum_kit" ? "drum_kit" : "beat";
  const beatId = session.metadata?.beat_id || session.client_reference_id || "";
  const drumKitId = session.metadata?.drum_kit_id || (itemType === "drum_kit" ? session.client_reference_id || "" : "");

  let itemTitle = itemType === "drum_kit" ? "Your drum kit" : "Your beat";

  if (isPaid && (itemType === "drum_kit" ? drumKitId : beatId)) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (itemType === "drum_kit") {
        const { data } = await supabase.from("drum_kits").select("name").eq("id", drumKitId).single();
        if (data?.name) itemTitle = data.name;
      } else {
        const { data } = await supabase.from("beats").select("title").eq("id", beatId).single();
        if (data?.title) itemTitle = data.title;
      }
    }
  }

  const downloadHref =
    isPaid && sessionId
      ? itemType === "drum_kit"
        ? `/api/drum-kits/download?session_id=${encodeURIComponent(sessionId)}`
        : `/api/download?session_id=${encodeURIComponent(sessionId)}`
      : "";

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Payment Success</p>
      <h1 className="text-4xl font-bold text-zinc-100">Thank you for your purchase.</h1>
      {isPaid ? (
        <p className="text-zinc-300">
          {itemType === "drum_kit"
            ? "Your drum kit checkout was completed. Download your ZIP below."
            : "Your lease checkout was completed. Download your licensed MP3 below."}
        </p>
      ) : (
        <p className="text-zinc-300">Your payment is still processing. Refresh this page in a few moments.</p>
      )}

      {isPaid && downloadHref && (
        <a
          href={downloadHref}
          className="inline-block rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
        >
          Download {itemTitle} {itemType === "drum_kit" ? "ZIP" : "MP3"}
        </a>
      )}

      <Link
        href="/"
        className="inline-block rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to store
      </Link>
    </main>
  );
}
