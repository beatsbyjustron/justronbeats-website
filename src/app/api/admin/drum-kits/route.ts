import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import { parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD ?? "justron-admin";

function hasValidAdminPassword(request: Request) {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

async function removeStorageObjectIfPresent(supabase: SupabaseClient<Database>, value: string | null | undefined) {
  const ref = parseStorageReference(value ?? "");
  if (!ref) return;
  await supabase.storage.from(ref.bucket).remove([ref.path]);
}

export async function GET(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("drum_kits")
    .select("id, name, description, price, image_path, zip_path, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kits: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: string;
      name?: string;
      description?: string;
      price?: number;
      imagePath?: string;
      zipPath?: string;
    };

    if (String(body.password ?? "") !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
    }

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const imagePath = String(body.imagePath ?? "").trim();
    const zipPath = String(body.zipPath ?? "").trim();
    const parsedPrice = Number(body.price ?? 0);
    const price = Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0;

    if (!name || !zipPath) {
      return NextResponse.json({ error: "Kit name and ZIP file are required." }, { status: 400 });
    }

    const { error } = await supabase.from("drum_kits").insert({
      name,
      description: description || null,
      price,
      image_path: imagePath || null,
      zip_path: zipPath
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/kits");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create kit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      description?: string;
      price?: number;
      imagePath?: string | null;
      zipPath?: string | null;
    };

    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!id || !name) {
      return NextResponse.json({ error: "Kit id and name are required." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("drum_kits")
      .select("image_path, zip_path")
      .eq("id", id)
      .single();
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const parsedPrice = Number(body.price ?? 0);
    const price = Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0;
    const nextImagePathRaw = body.imagePath;
    const nextZipPathRaw = body.zipPath;
    const nextImagePath =
      typeof nextImagePathRaw === "string" ? nextImagePathRaw.trim() || null : nextImagePathRaw === null ? null : undefined;
    const nextZipPath =
      typeof nextZipPathRaw === "string" ? nextZipPathRaw.trim() || null : nextZipPathRaw === null ? null : undefined;

    if (nextZipPath === null) {
      return NextResponse.json({ error: "Kit ZIP path cannot be empty." }, { status: 400 });
    }

    const payload = {
      name,
      description: String(body.description ?? "").trim() || null,
      price,
      ...(nextImagePath !== undefined ? { image_path: nextImagePath } : {}),
      ...(nextZipPath !== undefined ? { zip_path: nextZipPath } : {})
    };

    const { error } = await supabase.from("drum_kits").update(payload).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (nextImagePath !== undefined && existing?.image_path && existing.image_path !== nextImagePath) {
      await removeStorageObjectIfPresent(supabase, existing.image_path);
    }
    if (nextZipPath !== undefined && existing?.zip_path && existing.zip_path !== nextZipPath) {
      await removeStorageObjectIfPresent(supabase, existing.zip_path);
    }

    revalidatePath("/kits");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update kit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasValidAdminPassword(request)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Kit id is required." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("drum_kits")
      .select("image_path, zip_path")
      .eq("id", id)
      .single();
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const { error } = await supabase.from("drum_kits").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await removeStorageObjectIfPresent(supabase, existing?.image_path);
    await removeStorageObjectIfPresent(supabase, existing?.zip_path);

    revalidatePath("/kits");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete kit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
