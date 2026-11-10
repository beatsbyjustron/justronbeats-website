import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser, likeExact } from "@/lib/supabase/admin";
import { checkPlayerName } from "@/lib/tanks-leaderboard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const { name, error: invalid } = checkPlayerName(String(body.name ?? ""));
  if (!name) return NextResponse.json({ error: invalid }, { status: 400 });

  const { data: taken } = await admin.from("players").select("user_id").ilike("name", likeExact(name)).maybeSingle();
  if (taken && taken.user_id !== user.id) return NextResponse.json({ error: "That name is taken." }, { status: 409 });

  const { error } = await admin.from("players").upsert({ user_id: user.id, name }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That name is taken." : "Couldn't save that name." }, { status: 500 });
  return NextResponse.json({ name });
}
