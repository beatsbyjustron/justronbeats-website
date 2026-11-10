import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { beatId?: string; saved?: boolean };
  const beatId = String(body.beatId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(beatId)) return NextResponse.json({ error: "Unknown beat." }, { status: 400 });

  const { error } = body.saved
    ? await admin.from("favorites").upsert({ user_id: user.id, beat_id: beatId }, { onConflict: "user_id,beat_id", ignoreDuplicates: true })
    : await admin.from("favorites").delete().eq("user_id", user.id).eq("beat_id", beatId);
  if (error) return NextResponse.json({ error: "Couldn't update your saved beats." }, { status: 500 });
  return NextResponse.json({ success: true });
}
