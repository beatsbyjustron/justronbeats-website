/**
 * Tidy a musical key so the same key always looks the same:
 * "a# MINOR", "A#min" and "A# Minor" all become "A# minor".
 * Sharps and flats are kept as written (Bb stays Bb). Anything we can't read is returned trimmed.
 */
export function formatKey(raw: string | null | undefined): string {
  const text = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  const m = text.match(/^([a-g])\s*(#|♯|b|♭|sharp|flat)?\s*(major|minor|maj|min|m)?$/i);
  if (!m) return text.toLowerCase() === "unknown" ? "Unknown" : text;
  const note = m[1].toUpperCase();
  const acc = m[2] ? (/^(#|♯|sharp)$/i.test(m[2]) ? "#" : "b") : "";
  const q = (m[3] ?? "").toLowerCase();
  const quality = q === "" ? "" : q === "major" || q === "maj" ? " major" : " minor";
  return note + acc + quality;
}

/** Unique, sorted keys for a filter dropdown. */
export function uniqueKeys(keys: Array<string | null | undefined>): string[] {
  return Array.from(new Set(keys.map(formatKey).filter((k) => k && k !== "Unknown"))).sort((a, b) => a.localeCompare(b));
}
