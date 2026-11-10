import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";
import { currentWeek, MAX_CLEARED, MAX_SCORE } from "@/lib/tanks-leaderboard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to post scores." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { cleared?: number; score?: number; duo?: boolean };
  const cleared = Math.floor(Number(body.cleared));
  const score = Math.floor(Number(body.score));
  if (!Number.isFinite(cleared) || cleared < 0 || cleared > MAX_CLEARED || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: "That score doesn't look right." }, { status: 400 });
  }
  const week = currentWeek();

  const { data: existing } = await admin.from("tank_scores").select("cleared, score").eq("user_id", user.id).eq("week", week).maybeSingle();
  const better = !existing || cleared > existing.cleared || (cleared === existing.cleared && score > existing.score);
  if (better) {
    const { error } = await admin.from("tank_scores").upsert(
      { user_id: user.id, week, cleared, score, duo: !!body.duo, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week" }
    );
    if (error) return NextResponse.json({ error: "Couldn't save your score." }, { status: 500 });
  }

  const { data: player } = await admin.from("players").select("name").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ saved: better, needsName: !player?.name, name: player?.name ?? null });
}
