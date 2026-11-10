import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";
import { fetchBeats } from "@/lib/beats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });

  const email = user.email.toLowerCase();
  const [favRes, subRes] = await Promise.all([
    admin.from("favorites").select("beat_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    admin.from("subscribers").select("marketing").eq("email", email).maybeSingle()
  ]);

  const favoriteIds = (favRes.data ?? []).map((row) => row.beat_id as string);
  let favorites: Awaited<ReturnType<typeof fetchBeats>> = [];
  if (favoriteIds.length) {
    const beats = await fetchBeats();
    const byId = new Map(beats.map((beat) => [beat.id, beat]));
    favorites = favoriteIds.map((id) => byId.get(id)).filter((beat): beat is NonNullable<typeof beat> => !!beat);
  }

  return NextResponse.json({
    email,
    marketing: subRes.data?.marketing ?? false,
    favoriteIds,
    favorites
  });
}
