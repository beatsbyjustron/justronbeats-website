import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold text-zinc-100">About</h1>
      <div className="space-y-4 leading-relaxed text-zinc-300">
        <p>
          I am Justron, a producer from Hamden, Connecticut, and I have been in this for 7 years. My sound pulls from
          shoegaze, but bounce is in everything I make. I want every beat to feel melodic, hard, and alive.
        </p>
        <p>
          I produced &quot;That One Song&quot; with Nettspend. Burberryerry reached out to me personally to listen to my beats
          and give me advice. Glokk40Spazz also recorded over one of my beats, which meant a lot to me.
        </p>
        <p>
          I earned my economics degree from UConn while growing my production business and competing in NCBA boxing. I
          hit the gym, live life outside of music, and stay in the trenches with artists every day. I am always there
          for the people I work with.
        </p>
      </div>
      <p className="text-zinc-400">
        Follow the latest cookups and behind-the-scenes content on{" "}
        <Link href="https://www.youtube.com" className="text-zinc-100 underline">
          YouTube
        </Link>
        .
      </p>
    </main>
  );
}
