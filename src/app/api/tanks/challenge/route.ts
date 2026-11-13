import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";
import { currentWeek } from "@/lib/tanks-leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly challenge: one twist mission per week, fastest clear wins.
const MIN_MS = 3000;
const MAX_MS = 60 * 60 * 1000;

type Row = { user_id: string; time_ms: number; updated_at: string };

export async function GET(request: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });
  const week = currentWeek();
  const user = await getRequestUser(request);

  const { data, error } = await admin
    .from("tank_challenge")
    .select("user_id, time_ms, updated_at")
    .eq("week", week)
    .order("time_ms", { ascending: true })
    .order("updated_at", { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });

  const rows = (data ?? []) as Row[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: players } = await admin.from("players").select("user_id, name").in("user_id", ids);
    for (const p of players ?? []) names.set(p.user_id as string, p.name as string);
  }
  const ranked = rows
    .filter((r) => names.has(r.user_id))
    .map((r, i) => ({ rank: i + 1, name: names.get(r.user_id)!, timeMs: r.time_ms, me: !!user && r.user_id === user.id }));

  let me: { rank: number | null; name: string | null; timeMs: number | null } | null = null;
  if (user) {
    const mine = ranked.find((r) => r.me);
    const { data: player } = await admin.from("players").select("name").eq("user_id", user.id).maybeSingle();
    me = { rank: mine?.rank ?? null, name: (player?.name as string) ?? null, timeMs: mine?.timeMs ?? null };
  }
  return NextResponse.json({ week, top: ranked.slice(0, 20), me }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to post times." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { timeMs?: number; twist?: string };
  const timeMs = Math.floor(Number(body.timeMs));
  if (!Number.isFinite(timeMs) || timeMs < MIN_MS || timeMs > MAX_MS) {
    return NextResponse.json({ error: "That time doesn't look right." }, { status: 400 });
  }
  const week = currentWeek();
  const { data: existing } = await admin.from("tank_challenge").select("time_ms").eq("user_id", user.id).eq("week", week).maybeSingle();
  const better = !existing || timeMs < existing.time_ms;
  if (better) {
    const { error } = await admin.from("tank_challenge").upsert(
      { user_id: user.id, week, time_ms: timeMs, twist: String(body.twist ?? "").slice(0, 20), updated_at: new Date().toISOString() },
      { onConflict: "user_id,week" }
    );
    if (error) return NextResponse.json({ error: "Couldn't save your time." }, { status: 500 });
  }
  const { data: player } = await admin.from("players").select("name").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ saved: better, needsName: !player?.name, name: player?.name ?? null });
}
