"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "CONNECTICUT • EST. 2018",
  "Official Beat Store",
  "10 Million+ Streams & Counting",
  "The best beats to make hits"
];

export function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % PHRASES.length);
        setVisible(true);
      }, 260);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <p
      className={`text-xs uppercase tracking-[0.2em] text-zinc-500 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
      aria-live="polite"
    >
      {PHRASES[index]}
    </p>
  );
}
