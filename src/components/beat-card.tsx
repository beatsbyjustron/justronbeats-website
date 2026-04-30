"use client";

import { FormEvent, MouseEvent, useState } from "react";
import { CustomAudioPlayer } from "@/components/custom-audio-player";
import { SuggestedBeatLink } from "@/components/suggested-beat-link";
import { Beat } from "@/components/types";
import { useRouter } from "next/navigation";
import { useSignedStorageUrl } from "@/components/use-signed-storage-url";

type BeatCardProps = {
  beat: Beat;
  isExpanded: boolean;
  onToggle: () => void;
  suggestions: Beat[];
  onTagClick?: (tag: string) => void;
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

export function BeatCard({ beat, isExpanded, onToggle, suggestions, onTagClick }: BeatCardProps) {
  const router = useRouter();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerEmail, setOfferEmail] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerStatus, setOfferStatus] = useState<string>("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [showCopied, setShowCopied] = useState(false);
  const [showLicenseTerms, setShowLicenseTerms] = useState(false);
  const signedCoverArtUrl = useSignedStorageUrl(beat.coverArtUrl);

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
        console.error("[Checkout] Failed to create session", result.error);
        setCheckoutError("Unable to start checkout right now.");
        setIsStartingCheckout(false);
        return;
      }

      window.location.href = result.url;
    } catch (error) {
      console.error("[Checkout] Unexpected error", error);
      setCheckoutError("Unable to start checkout right now.");
      setIsStartingCheckout(false);
    }
  };

  const copyBeatLink = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${baseUrl}/beats/${encodeURIComponent(beat.slug)}`;
    await navigator.clipboard.writeText(shareUrl);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1200);
  };

  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, label, form")) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("justronbeats:returnBeatId", beat.id);
    }
    router.push(`/beats/${beat.slug}`);
  };

  return (
    <article
      data-beat-id={beat.id}
      className="relative max-w-full min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 sm:p-5"
      onClick={onCardClick}
    >
      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={copyBeatLink}
          className="rounded-full border border-zinc-700 bg-zinc-950/80 p-2 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          aria-label="Share beat"
          title="Copy beat link"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6z" />
            <path d="M6 14a3 3 0 1 0 2.83 4H9a3 3 0 0 0 0-6z" />
            <path d="M18 20a3 3 0 1 0 0-6h-.17a3 3 0 0 0 .17 6z" />
            <path d="m8.5 13.5 7-3" />
            <path d="m8.5 16.5 7 3" />
          </svg>
        </button>
        {showCopied && (
          <span className="absolute right-0 top-10 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-emerald-300">
            Copied!
          </span>
        )}
      </div>

      <div className="mb-4 flex min-w-0 items-start gap-3 sm:gap-4">
        {signedCoverArtUrl ? (
          <img
            src={signedCoverArtUrl}
            alt={beat.title}
            className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
          />
        ) : (
          <div
            className="h-16 w-16 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 sm:h-20 sm:w-20"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1 pr-10">
          <h3 className="break-words text-base font-semibold leading-snug text-zinc-100 sm:text-lg">{beat.title}</h3>
          <p className="break-words text-sm text-zinc-400">{formatProducerLine(beat.producedBy)}</p>
          <p className="text-xs text-zinc-500">
            {beat.bpm} BPM • {beat.key}
          </p>
          {!!beat.tags.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {beat.tags.map((tag) => (
                <button
                  key={`${beat.id}-${tag}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-950/90 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomAudioPlayer
        src={beat.mp3Url}
        debugLabel={beat.title}
        trackId={beat.id}
        coverArtUrl={signedCoverArtUrl}
        slug={beat.slug}
      />

      <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
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
          onClick={(event) => {
            event.stopPropagation();
            setIsOfferModalOpen(true);
          }}
          className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-400 hover:bg-zinc-900"
        >
          Exclusive - Make an Offer
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
        >
          {isExpanded ? "Hide related beats" : "Show related beats"}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowLicenseTerms((prev) => !prev);
          }}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
        >
          {showLicenseTerms ? "Hide license terms" : "View license terms"}
        </button>
      </div>
      {!!checkoutError && <p className="mb-4 text-xs text-amber-400">{checkoutError}</p>}

      {showLicenseTerms && (
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
      )}

      {isExpanded && (
        <div className="mt-5 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Suggested beats</p>
          {suggestions.length ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((suggestedBeat) => (
                <SuggestedBeatLink
                  key={suggestedBeat.id}
                  beat={suggestedBeat}
                  compact
                  onNavigate={(event) => event.stopPropagation()}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No close matches yet.</p>
          )}
        </div>
      )}

      {isOfferModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setIsOfferModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
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
    </article>
  );
}
