import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Justron Beats",
  description:
    "Welcome to the official website of Justron — a producer from Connecticut with placements on artists like Nettspend, Glokk40Spazz, Slimesito, Hardrock, Backend, Brennan Jones, and Lazer Dim 700. On this website you will find Justron's official beats, drum kits, and samples available for lease and exclusive licensing."
};

export default function AboutPage() {
  return (
    <main className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold text-zinc-100">About</h1>
      <div className="space-y-4 leading-relaxed text-zinc-300">
        <p>I am Justron. Thats it.</p>
      </div>
      <p className="text-zinc-400">
        Follow the latest cookups and behind-the-scenes content on{" "}
        <a
          href="https://www.instagram.com/justronbeats"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 underline"
        >
          Instagram
        </a>
        ,{" "}
        <a
          href="https://www.tiktok.com/@justronbeats"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 underline"
        >
          TikTok
        </a>
        ,{" "}
        <a
          href="https://soundcloud.com/justronbeats"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 underline"
        >
          SoundCloud
        </a>
        , and{" "}
        <a
          href="https://www.youtube.com/@justron"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 underline"
        >
          YouTube
        </a>
        .
      </p>
    </main>
  );
}
