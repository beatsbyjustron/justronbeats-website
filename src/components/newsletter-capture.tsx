"use client";

import { FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "justronbeats:email-capture-dismissed";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function NewsletterCapture() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed })
      });
      const result = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Could not subscribe right now.");
        setIsSubmitting(false);
        return;
      }
      setStatus("You're on the list. Stay tuned for new drops.");
      setEmail("");
      setIsSubmitting(false);
      window.setTimeout(dismiss, 1300);
    } catch {
      setError("Could not subscribe right now.");
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">Stay updated on new beats and drops - join the list</p>
          <p className="text-xs text-zinc-400">No spam. New uploads and release alerts only.</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
        >
          Dismiss
        </button>
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-zinc-500 focus:ring-2"
          autoComplete="email"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Join List"}
        </button>
      </form>
      {!!status && <p className="mt-2 text-xs text-emerald-300">{status}</p>}
      {!!error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </aside>
  );
}
