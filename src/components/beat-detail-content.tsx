"use client";

import { FormEvent, useState } from "react";
import { Beat } from "@/components/types";
import { CustomAudioPlayer } from "@/components/custom-audio-player";

type BeatDetailContentProps = {
  beat: Beat;
};

function formatProducerLine(extras: string[]) {
  const cleanedExtras = extras
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => name.toLowerCase() !== "justron");

  if (!cleanedExtras.length) return "Produced by Justron";
  if (cleanedExtras.length === 1) return `Produced by Justron and ${cleanedExtras[0]}`;

  const allButLast = cleanedExtras.slice(0, -1).join(", ");
  const last = cleanedExtras[cleanedExtras.length - 1];
  return `Produced by Justron, ${allButLast}, and ${last}`;
}

export function BeatDetailContent({ beat }: BeatDetailContentProps) {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerEmail, setOfferEmail] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerStatus, setOfferStatus] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const submitOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOfferStatus("");
    setIsSubmittingOffer(true);

    const response = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beatId: beat.id,
        email: offerEmail,
        offerAmount: Number(offerAmount)
      })
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setOfferStatus(result.error ?? "Offer submission failed.");
      setIsSubmittingOffer(false);
      return;
    }

    setOfferStatus("Offer submitted. We will contact you soon.");
    setOfferEmail("");
    setOfferAmount("");
    setIsSubmittingOffer(false);
  };

  const startLeaseCheckout = async () => {
    setIsStartingCheckout(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatId: beat.id,
          title: beat.title,
          image: beat.coverArtUrl,
          priceCents: 3000
        })
      });

      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setCheckoutError("Unable to start checkout right now.");
        setIsStartingCheckout(false);
        return;
      }

      window.location.href = result.url;
    } catch {
      setCheckoutError("Unable to start checkout right now.");
      setIsStartingCheckout(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img
          src={beat.coverArtUrl || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80"}
          alt={beat.title}
          className="h-48 w-full rounded-xl object-cover sm:h-52 sm:w-52"
        />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-100">{beat.title}</h1>
          <p className="text-zinc-400">{formatProducerLine(beat.producedBy)}</p>
          <p className="text-sm text-zinc-500">
            {beat.bpm} BPM • {beat.key}
          </p>
          {!!beat.tags.length && <p className="text-xs text-zinc-500">{beat.tags.map((tag) => `#${tag}`).join(" ")}</p>}
        </div>
      </div>

      <CustomAudioPlayer src={beat.mp3Url} debugLabel={beat.title} trackId={beat.id} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startLeaseCheckout}
          disabled={isStartingCheckout}
          className="rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300 px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02]"
        >
          {isStartingCheckout ? "Starting checkout..." : "Lease $30"}
        </button>
        <button
          type="button"
          onClick={() => setIsOfferModalOpen(true)}
          className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-400 hover:bg-zinc-900"
        >
          Exclusive - Make an Offer
        </button>
      </div>

      {!!checkoutError && <p className="text-xs text-amber-400">{checkoutError}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-300">Lease</p>
          Tagged MP3 file, up to 2,500 units, 50,000 streams. Singles, albums, and streaming use included. Justron
          keeps ownership. Credit required: prod. justron.
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-300">Exclusive</p>
          Fully exclusive rights, unlimited copies and streams. WAV, MP3, and stems included. 50/50 publishing split.
          Albums, singles, streaming, TV, and film use included. Credit required: prod. justron.
        </div>
      </div>

      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIsOfferModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5" onClick={(event) => event.stopPropagation()}>
            <h4 className="text-lg font-semibold text-zinc-100">Exclusive Offer</h4>
            <p className="mt-1 text-sm text-zinc-400">{beat.title}</p>
            <form onSubmit={submitOffer} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={offerEmail}
                onChange={(event) => setOfferEmail(event.target.value)}
                placeholder="Your contact email"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
              />
              <input
                type="number"
                required
                min={1}
                value={offerAmount}
                onChange={(event) => setOfferAmount(event.target.value)}
                placeholder="Your offer amount (USD)"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingOffer}
                  className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  {isSubmittingOffer ? "Submitting..." : "Submit Offer"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </form>
            {!!offerStatus && <p className="mt-3 text-sm text-zinc-300">{offerStatus}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
