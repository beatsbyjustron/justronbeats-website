import { NextResponse } from "next/server";
import { getAdminClient, getRequestUser, likeExact } from "@/lib/supabase/admin";
import { parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

function safeFilename(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "").trim().slice(0, 80) || "download";
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { purchaseId?: string };
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, item_type, beat_id, drum_kit_id")
    .eq("id", String(body.purchaseId ?? ""))
    .ilike("email", likeExact(user.email.toLowerCase()))
    .maybeSingle();
  if (!purchase) return NextResponse.json({ error: "We couldn't find that purchase on your account." }, { status: 404 });

  let source = "";
  let filename = "download";
  if (purchase.item_type === "drum_kit" && purchase.drum_kit_id) {
    const { data: kit } = await admin.from("drum_kits").select("name, zip_path").eq("id", purchase.drum_kit_id).maybeSingle();
    source = kit?.zip_path ?? "";
    filename = `${safeFilename(kit?.name ?? "drum-kit")}.zip`;
  } else if (purchase.beat_id) {
    const { data: beat } = await admin.from("beats").select("title, mp3_url").eq("id", purchase.beat_id).maybeSingle();
    source = beat?.mp3_url ?? "";
    filename = `${safeFilename(beat?.title ?? "beat")}.mp3`;
  }
  if (!source) return NextResponse.json({ error: "That file isn't available anymore. Contact us and we'll sort it out." }, { status: 404 });

  const ref = parseStorageReference(source);
  if (!ref) return NextResponse.json({ url: source });
  const { data, error } = await admin.storage.from(ref.bucket).createSignedUrl(ref.path, 300, { download: filename });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Couldn't prepare the download. Try again." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
