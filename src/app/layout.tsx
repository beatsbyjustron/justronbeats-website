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

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 4v8.5a3.5 3.5 0 1 1-2.7-3.4" />
      <path d="M14 7.2a5.5 5.5 0 0 0 3.8 1.6" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="3" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
                <div className="ml-1 flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/justronbeats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-700 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                    aria-label="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                  <a
                    href="https://www.tiktok.com/@justronbeats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-700 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                    aria-label="TikTok"
                  >
                    <TikTokIcon />
                  </a>
                  <a
                    href="https://www.youtube.com/@justron"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-700 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                    aria-label="YouTube"
                  >
                    <YouTubeIcon />
                  </a>
                </div>
              </nav>
            </header>
            {children}
            <footer className="mt-16 border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <p>© {new Date().getFullYear()} Justron Beats</p>
                <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/justronbeats" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
                    Instagram
                  </a>
                  <a href="https://www.tiktok.com/@justronbeats" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
                    TikTok
                  </a>
                  <a href="https://www.youtube.com/@justron" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
                    YouTube
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </GlobalAudioPlayerProvider>
      </body>
    </html>
  );
}
