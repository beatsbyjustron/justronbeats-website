import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { marketing?: boolean };
  const { error } = await admin.from("subscribers").upsert(
    { email: user.email.toLowerCase(), source: "account", marketing: !!body.marketing, updated_at: new Date().toISOString() },
    { onConflict: "email" }
  );
  if (error) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  return NextResponse.json({ success: true, marketing: !!body.marketing });
}
