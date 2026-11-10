import type { Metadata } from "next";
import { AccountContent } from "@/components/account-content";

export const metadata: Metadata = {
  title: "Account | Justron Beats",
  description: "Your saved beats, purchases and email preferences."
};

export default function AccountPage() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-4xl py-6">
      <AccountContent />
    </main>
  );
}
