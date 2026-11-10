import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";
import { currentWeek } from "@/lib/tanks-leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { user_id: string; cleared: number; score: number; duo: boolean; updated_at: string };

export async function GET(request: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });
  const week = currentWeek();
  const user = await getRequestUser(request);

  const { data, error } = await admin
    .from("tank_scores")
    .select("user_id, cleared, score, duo, updated_at")
    .eq("week", week)
    .order("cleared", { ascending: false })
    .order("score", { ascending: false })
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
  const named = rows.filter((r) => names.has(r.user_id));
  const ranked = named.map((r, i) => ({ rank: i + 1, name: names.get(r.user_id)!, cleared: r.cleared, score: r.score, duo: r.duo, me: !!user && r.user_id === user.id }));

  let me: { rank: number | null; name: string | null; cleared: number | null; score: number | null } | null = null;
  if (user) {
    const mine = ranked.find((r) => r.me);
    const { data: player } = await admin.from("players").select("name").eq("user_id", user.id).maybeSingle();
    me = { rank: mine?.rank ?? null, name: (player?.name as string) ?? null, cleared: mine?.cleared ?? null, score: mine?.score ?? null };
  }

  return NextResponse.json({ week, top: ranked.slice(0, 20), me }, { headers: { "Cache-Control": "no-store" } });
}
