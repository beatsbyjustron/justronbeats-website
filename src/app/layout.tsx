import type { Metadata } from "next";
import Link from "next/link";
import { BackgroundAmbience } from "@/components/background-ambience";
import { GlobalAudioPlayerProvider } from "@/components/global-audio-player-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Justron Beats",
  description: "Dark, minimal beat store for a music producer.",
  icons: {
    shortcut: [{ url: "/favicon.ico" }],
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/kits", label: "Kits" },
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
      <body className="relative isolate overflow-x-hidden">
        <BackgroundAmbience />
        <GlobalAudioPlayerProvider>
          <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 pb-28">
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
        </GlobalAudioPlayerProvider>
      </body>
    </html>
  );
}
