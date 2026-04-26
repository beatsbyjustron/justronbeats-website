import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase URL or service role configuration." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { path?: string };
    const sourcePath = String(body.path ?? "").trim();
    if (!sourcePath) {
      return NextResponse.json({ error: "Missing file path." }, { status: 400 });
    }

    const reference = parseStorageReference(sourcePath);
    if (!reference) {
      // Non-Supabase URLs are returned unchanged.
      return NextResponse.json({ signedUrl: sourcePath });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.storage.from(reference.bucket).createSignedUrl(reference.path, 3600);
    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Could not generate signed URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate signed URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
