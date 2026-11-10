import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";
const authorized = (request: Request) => request.headers.get("x-admin-password") === ADMIN_PASSWORD;

/** Which beats play in Justron Tanks: { inTanks: { [beatId]: boolean } } */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  const { data, error } = await admin.from("beats").select("id, in_tanks");
  if (error) return NextResponse.json({ available: false, inTanks: {} });
  const inTanks: Record<string, boolean> = {};
  for (const row of data ?? []) inTanks[row.id as string] = row.in_tanks !== false;
  return NextResponse.json({ available: true, inTanks });
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; inTanks?: boolean };
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Beat id is required." }, { status: 400 });
  const { error } = await admin.from("beats").update({ in_tanks: !!body.inTanks }).eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't update that beat." }, { status: 500 });
  return NextResponse.json({ success: true });
}
