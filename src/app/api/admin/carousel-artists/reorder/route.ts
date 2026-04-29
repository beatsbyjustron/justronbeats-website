import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export async function PATCH(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { order?: string[] };
    const order = Array.isArray(body.order) ? body.order : [];
    if (!order.length) {
      return NextResponse.json({ error: "Missing order array." }, { status: 400 });
    }

    // Update display_order per item. (Catalog sizes are small; keep it simple/robust.)
    await Promise.all(
      order.map((id, idx) =>
        supabase.from("carousel_artists").update({ display_order: idx }).eq("id", id)
      )
    );

    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reorder failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

