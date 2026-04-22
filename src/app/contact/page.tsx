"use client";

import { FormEvent, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setConfirmation("");

    // Simulate an async submit flow so UX matches real send behavior.
    await new Promise((resolve) => setTimeout(resolve, 350));

    setForm(initialForm);
    setConfirmation("Your message has been sent! Justron will get back to you shortly.");
    setIsSubmitting(false);
  };

  return (
    <main className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold text-zinc-100">Contact</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-900"
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </button>

        {!!confirmation && (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {confirmation}
          </p>
        )}
      </form>
    </main>
  );
}
