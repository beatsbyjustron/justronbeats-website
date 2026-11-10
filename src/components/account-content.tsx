"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { SignInForm, useAuth } from "@/components/auth-provider";
import { FavoriteButton } from "@/components/favorite-button";
import { TanksNavLink } from "@/components/tanks-nav-link";
import { useSignedStorageUrl } from "@/components/use-signed-storage-url";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Beat } from "@/components/types";

type Purchase = {
  id: string;
  type: "beat" | "drum_kit";
  name: string;
  slug: string | null;
  cover: string;
  amountCents: number | null;
  currency: string | null;
  createdAt: string;
  available: boolean;
};

function Thumb({ src, alt }: { src: string; alt: string }) {
  const signed = useSignedStorageUrl(src);
  return signed ? (
    <img src={signed} alt={alt} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
  ) : (
    <div className="h-14 w-14 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900" aria-hidden="true" />
  );
}

function formatMoney(cents: number | null, currency: string | null) {
  if (cents == null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function AccountContent() {
  const router = useRouter();
  const { ready, enabled, email, authFetch, signOut, favoriteIds } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [favorites, setFavorites] = useState<Beat[] | null>(null);
  const [marketing, setMarketing] = useState<boolean | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [downloading, setDownloading] = useState("");
  const [notice, setNotice] = useState("");

  // Finish signing in when arriving from the email link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("th");
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    const supabase = getBrowserSupabase();
    if (tokenHash && supabase) {
      setVerifying(true);
      const type = (params.get("type") || "magiclink") as EmailOtpType;
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        setVerifying(false);
        if (error) {
          setVerifyError("That sign-in link expired or was already used. Send yourself a new one below.");
          window.history.replaceState(null, "", "/account");
          return;
        }
        if (safeNext !== "/account") router.replace(safeNext);
        else window.history.replaceState(null, "", "/account");
      });
    } else if (next && window.location.hash.includes("access_token")) {
      // Supabase's own email link: the session is picked up from the URL automatically.
      window.setTimeout(() => {
        if (safeNext !== "/account") router.replace(safeNext);
        else window.history.replaceState(null, "", "/account");
      }, 400);
    }
  }, [router]);

  const load = useCallback(() => {
    void authFetch("/api/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { favorites?: Beat[]; marketing?: boolean } | null) => {
        if (!data) return;
        setFavorites(data.favorites ?? []);
        setMarketing(!!data.marketing);
      })
      .catch(() => {});
    void authFetch("/api/account/purchases")
      .then((res) => (res.ok ? res.json() : { purchases: [] }))
      .then((data: { purchases?: Purchase[] }) => setPurchases(data.purchases ?? []))
      .catch(() => setPurchases([]));
  }, [authFetch]);

  useEffect(() => {
    if (email) load();
  }, [email, load]);

  const toggleMarketing = async () => {
    const nextValue = !marketing;
    setMarketing(nextValue);
    const res = await authFetch("/api/account/preferences", { method: "POST", body: JSON.stringify({ marketing: nextValue }) });
    if (!res.ok) setMarketing(!nextValue);
    else setNotice(nextValue ? "You're on the list for discounts and drops." : "You won't get marketing emails anymore.");
  };

  const download = async (purchase: Purchase) => {
    setDownloading(purchase.id);
    setNotice("");
    try {
      const res = await authFetch("/api/account/download", { method: "POST", body: JSON.stringify({ purchaseId: purchase.id }) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) setNotice(data.error ?? "Couldn't start the download. Try again.");
      else window.location.href = data.url;
    } finally {
      setDownloading("");
    }
  };

  if (!enabled) {
    return <p className="text-zinc-400">Accounts aren&apos;t available right now.</p>;
  }

  if (!ready || verifying) {
    return <p className="text-zinc-400">{verifying ? "Signing you in..." : "Loading..."}</p>;
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">Your JustronBeats account</h1>
          <p className="text-zinc-400">One email, no password. Sign in to keep track of everything in one place.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["Save beats", "Tap the heart on any beat to build your list."],
            ["Re-download", "Every beat and kit you buy, ready to grab again."],
            ["Get discounts", "First dibs on deals and new drops by email."]
          ].map(([title, text]) => (
            <li key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-semibold text-zinc-100">{title}</p>
              <p className="mt-1 text-sm text-zinc-400">{text}</p>
            </li>
          ))}
        </ul>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          {!!verifyError && <p className="mb-4 text-sm text-amber-400">{verifyError}</p>}
          <SignInForm />
        </div>
      </div>
    );
  }

  const savedBeats = (favorites ?? []).filter((beat) => favoriteIds.has(beat.id));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Signed in as</p>
          <h1 className="mt-1 break-all text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{email}</h1>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
        >
          Sign out
        </button>
      </div>

      {!!notice && <p className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">{notice}</p>}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-100">Saved beats</h2>
        {favorites === null ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : savedBeats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            Nothing saved yet. Tap the heart on any beat to save it here.{" "}
            <Link href="/" className="text-lime-300 hover:text-lime-200">
              Browse beats
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {savedBeats.map((beat) => (
              <li key={beat.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <Thumb src={beat.coverArtUrl} alt={beat.title} />
                <div className="min-w-0 flex-1">
                  <Link href={`/beats/${beat.slug}`} className="block truncate font-semibold text-zinc-100 hover:text-lime-200">
                    {beat.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {beat.bpm} BPM • {beat.key}
                  </p>
                </div>
                <Link
                  href={`/beats/${beat.slug}`}
                  className="rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300 px-4 py-2 text-xs font-bold text-zinc-900"
                >
                  Lease
                </Link>
                <FavoriteButton beatId={beat.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-100">Purchases</h2>
        {purchases === null ? (
          <p className="text-sm text-zinc-500">Loading your purchases...</p>
        ) : purchases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
            No purchases on this email yet. Anything you buy with <span className="text-zinc-200">{email}</span> shows up here, ready to download again.
          </div>
        ) : (
          <ul className="space-y-2">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <Thumb src={purchase.cover} alt={purchase.name} />
                <div className="min-w-0 flex-1">
                  {purchase.slug ? (
                    <Link href={`/beats/${purchase.slug}`} className="block truncate font-semibold text-zinc-100 hover:text-lime-200">
                      {purchase.name}
                    </Link>
                  ) : (
                    <p className="truncate font-semibold text-zinc-100">{purchase.name}</p>
                  )}
                  <p className="text-xs text-zinc-500">
                    {purchase.type === "drum_kit" ? "Drum kit" : "Lease"} • {new Date(purchase.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {purchase.amountCents != null ? ` • ${formatMoney(purchase.amountCents, purchase.currency)}` : ""}
                  </p>
                </div>
                {purchase.available && (
                  <button
                    type="button"
                    onClick={() => void download(purchase)}
                    disabled={downloading === purchase.id}
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {downloading === purchase.id ? "Preparing..." : "Download"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100">Emails</h2>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <span>
            <span className="block font-medium text-zinc-100">Discounts and new drops</span>
            <span className="block text-sm text-zinc-400">Deals on beats and kits, plus new releases. A few emails a month.</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={!!marketing}
            disabled={marketing === null}
            onClick={() => void toggleMarketing()}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${marketing ? "bg-lime-300" : "bg-zinc-700"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-zinc-950 transition-all ${marketing ? "left-6" : "left-1"}`} />
          </button>
        </label>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime-300/30 bg-lime-300/[0.06] p-5">
        <div>
          <p className="font-semibold text-zinc-100">Play Justron Tanks</p>
          <p className="text-sm text-zinc-400">5 worlds, 25 missions, each one on a Justron beat. Bring a friend for duos.</p>
        </div>
        <TanksNavLink className="rounded-full bg-lime-300 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-lime-200">Play now</TanksNavLink>
      </section>
    </div>
  );
}
