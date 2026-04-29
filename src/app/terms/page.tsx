import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Justron Beats",
  description: "Terms of Service and Privacy Policy for Justron Beats licensing and digital products."
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-100">Terms of Service & Privacy Policy</h1>
        <p className="text-sm text-zinc-400">Effective date: January 1, 2025</p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">1. Beat Licensing Terms</h2>
        <p>
          Lease licenses grant non-exclusive rights to use purchased beats under the stated license terms. Exclusive licenses
          grant broader and exclusive exploitation rights as outlined in the purchase agreement. Rights are limited to the
          exact license purchased and do not transfer unless expressly approved in writing.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">2. Refund Policy</h2>
        <p>
          All sales are final due to the immediate digital delivery of audio files and license rights. By completing checkout,
          you acknowledge that no refunds, exchanges, or cancellations are provided except where required by applicable law.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">3. Copyright & Ownership</h2>
        <p>
          Unless explicitly transferred via a signed exclusive agreement, producer copyright and master ownership remain with
          Justron LLC. Lease purchasers receive a limited license of use and do not acquire ownership of the underlying
          composition, master, or intellectual property.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">4. DMCA & Takedown Policy</h2>
        <p>
          Justron LLC respects intellectual property rights and responds to valid DMCA notices. If you believe content on this
          site infringes your rights, submit a written notice with sufficient detail to identify the allegedly infringing
          material and your legal basis for the claim.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">5. Privacy Policy</h2>
        <p>
          We may collect personal data including contact information (such as email address), purchase metadata, and technical
          usage data. Payment processing is handled by Stripe; we do not store full payment card numbers on our servers.
          Information is used to deliver purchases, provide customer support, and improve service quality.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">6. All Rights Reserved</h2>
        <p>
          &copy; 2025 Justron LLC. All rights reserved. Unauthorized redistribution, resale, sublicensing, or exploitation of
          content outside licensed permissions is strictly prohibited and may result in license termination and legal action.
        </p>
      </section>
    </main>
  );
}

