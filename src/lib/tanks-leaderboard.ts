import "server-only";

/** Monday (UTC) of the current week, as YYYY-MM-DD. The board resets every Monday. */
export function currentWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

const BLOCKED = ["fuck", "shit", "nigg", "fag", "cunt", "bitch", "hitler", "nazi", "rape", "whore", "slut", "dick", "pussy", "retard"];

export function checkPlayerName(raw: string): { name?: string; error?: string } {
  const name = raw.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return { error: "Use 3 to 16 letters, numbers or underscores." };
  const flat = name.toLowerCase().replace(/_/g, "").replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");
  if (BLOCKED.some((word) => flat.includes(word))) return { error: "Pick a different name." };
  return { name };
}

export const MAX_CLEARED = 50;
// Rough ceiling on points for a run, to reject obviously fake scores.
export const MAX_SCORE = 200_000;
