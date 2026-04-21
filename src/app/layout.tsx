import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Justron Beats",
  description: "Dark, minimal beat store for a music producer."
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/productions", label: "Productions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
          <header className="mb-12 flex flex-wrap items-center justify-between gap-6 border-b border-zinc-800 pb-6">
            <Link href="/" className="text-lg font-semibold tracking-wide text-zinc-100">
              JUSTRONBEATS
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-400">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 transition hover:bg-zinc-900 hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
