import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Justron Beats",
  description:
    "Welcome to the official website of Justron — a producer from Connecticut with placements on artists like Nettspend, Glokk40Spazz, Slimesito, Hardrock, Backend, Brennan Jones, and Lazer Dim 700. On this website you will find Justron's official beats, drum kits, and samples available for lease and exclusive licensing."
};

export default function AboutPage() {
  const socialLinks = [
    { label: "Instagram", href: "https://www.instagram.com/justronbeats" },
    { label: "TikTok", href: "https://www.tiktok.com/@justronbeats" },
    { label: "SoundCloud", href: "https://soundcloud.com/justronbeats" },
    { label: "YouTube", href: "https://www.youtube.com/@justron" }
  ];

  return (
    <main className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold text-zinc-100">About</h1>
      <div className="space-y-4 leading-relaxed text-zinc-300">
        <p>I am Justron.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {socialLinks.map((social) => (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            {social.label}
          </a>
        ))}
      </div>
    </main>
  );
}
