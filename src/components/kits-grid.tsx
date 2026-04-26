"use client";

import { useState } from "react";

type DrumKitItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
};

function formatPrice(price: number) {
  if (price <= 0) return "Free";
  return `$${price.toFixed(2)}`;
}

export function KitsGrid({ kits }: { kits: DrumKitItem[] }) {
  const [loadingKitId, setLoadingKitId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const startPaidCheckout = async (kit: DrumKitItem) => {
    setLoadingKitId(kit.id);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "drum_kit",
          drumKitId: kit.id,
          title: kit.name,
          image: kit.imageUrl,
          priceCents: Math.round(kit.price * 100)
        })
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setError(result.error ?? "Unable to start checkout right now.");
        setLoadingKitId(null);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Unable to start checkout right now.");
      setLoadingKitId(null);
    }
  };

  const startFreeDownload = async (kit: DrumKitItem) => {
    const email = window.prompt("Enter your email to receive the free download link:");
    if (!email) return;
    setLoadingKitId(kit.id);
    setError("");
    try {
      const response = await fetch("/api/drum-kits/free-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drumKitId: kit.id, email })
      });
      const result = (await response.json()) as { downloadUrl?: string; error?: string };
      if (!response.ok || !result.downloadUrl) {
        setError(result.error ?? "Unable to prepare the free download.");
        setLoadingKitId(null);
        return;
      }
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      setLoadingKitId(null);
    } catch {
      setError("Unable to prepare the free download.");
      setLoadingKitId(null);
    }
  };

  return (
    <section className="space-y-4">
      {!!error && <p className="text-sm text-amber-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((kit) => (
          <article key={kit.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <img
              src={kit.imageUrl || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80"}
              alt={kit.name}
              className="h-44 w-full rounded-xl object-cover"
            />
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">{kit.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    kit.price <= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {kit.price <= 0 ? "Free" : "Paid"}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{kit.description || "No description provided."}</p>
              <p className="text-sm font-medium text-zinc-200">{formatPrice(kit.price)}</p>
              {kit.price <= 0 ? (
                <button
                  type="button"
                  onClick={() => void startFreeDownload(kit)}
                  disabled={loadingKitId === kit.id}
                  className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  {loadingKitId === kit.id ? "Preparing..." : "Free Download"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startPaidCheckout(kit)}
                  disabled={loadingKitId === kit.id}
                  className="rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300 px-4 py-2 text-sm font-bold text-zinc-900 transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {loadingKitId === kit.id ? "Starting checkout..." : `Buy ${formatPrice(kit.price)}`}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!kits.length && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">No drum kits added yet.</div>
      )}
    </section>
  );
}
