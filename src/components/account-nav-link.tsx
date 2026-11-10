"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function AccountNavLink({ className }: { className?: string }) {
  const { enabled, ready, email } = useAuth();
  if (!enabled) return null;
  return (
    <Link href="/account" className={className}>
      {ready && email ? "My account" : "Sign in"}
    </Link>
  );
}
