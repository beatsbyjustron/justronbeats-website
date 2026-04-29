import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Justron Beats",
  description: "Frequently asked questions about beat licensing, file delivery, and custom work."
};

const FAQ_ITEMS = [
  {
    question: "What do I receive after purchasing a lease?",
    answer:
      "You receive the licensed audio files listed at checkout (typically MP3 and/or WAV depending on the product), plus the right to use the beat under the lease terms."
  },
  {
    question: "What is the difference between a lease and an exclusive?",
    answer:
      "A lease gives you non-exclusive usage rights while the producer keeps ownership and can license to others. An exclusive grants broader, exclusive usage rights under the agreement terms."
  },
  {
    question: "How do I receive my files after purchase?",
    answer:
      "After payment is confirmed, your download links are delivered immediately on the success page and by email confirmation."
  },
  {
    question: "Can I use a leased beat for commercial projects?",
    answer:
      "Yes, leased beats can be used commercially within the limits of the selected license terms, including stream/download caps and credit requirements."
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Because digital products are delivered instantly, all sales are generally final unless otherwise required by law."
  },
  {
    question: "How do I clear a sample or get a custom beat?",
    answer:
      "For sample clearance questions or custom production requests, use the contact page with project details, timeline, and budget."
  }
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-100">FAQ</h1>
        <p className="text-sm text-zinc-400">Everything you need to know before purchasing a beat license.</p>
      </header>

      <section className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left">
              <span className="text-sm font-medium text-zinc-100">{item.question}</span>
              <span className="text-zinc-400 transition group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-400">{item.answer}</div>
          </details>
        ))}
      </section>
    </main>
  );
}

