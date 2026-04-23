"use client";

import Script from "next/script";
import { FormEvent, useEffect, useMemo, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  message: "",
  website: "",
  turnstileToken: ""
};

declare global {
  interface Window {
    onJustronTurnstileSuccess?: (token: string) => void;
  }
}

export function ContactPageContent() {
  const turnstileSiteKey = useMemo(() => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "", []);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!turnstileSiteKey || typeof window === "undefined") return;
    window.onJustronTurnstileSuccess = (token: string) => {
      setForm((prev) => ({ ...prev, turnstileToken: token }));
    };
    return () => {
      delete window.onJustronTurnstileSuccess;
    };
  }, [turnstileSiteKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setConfirmation("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorMessage(result.error ?? "Unable to send your message right now.");
        setIsSubmitting(false);
        return;
      }

      setForm(initialForm);
      setConfirmation("Your message has been sent! Justron will get back to you shortly.");
      setIsSubmitting(false);
    } catch {
      setErrorMessage("Unable to send your message right now. Please try again shortly.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Contact</h1>
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="absolute left-[-5000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Leave this field empty</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm text-zinc-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-zinc-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="message" className="text-sm text-zinc-400">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none ring-zinc-500 transition focus:ring-2"
            placeholder="Tell me about your project..."
          />
        </div>

        {turnstileSiteKey && (
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-callback="onJustronTurnstileSuccess"
            data-theme="dark"
          />
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-900"
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </button>

        {!!errorMessage && (
          <p className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">{errorMessage}</p>
        )}

        {!!confirmation && (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {confirmation}
          </p>
        )}
      </form>
      <div className="space-y-1 text-sm text-zinc-400">
        <p>
          Prefer email? Reach me at{" "}
          <a className="text-zinc-100 underline" href="mailto:beatsbyjustron@gmail.com">
            beatsbyjustron@gmail.com
          </a>
          .
        </p>
        <p>I typically respond within 48 hours.</p>
      </div>
    </main>
  );
}
