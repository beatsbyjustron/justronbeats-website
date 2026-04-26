import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedUrlExpirySeconds, parseStorageReference } from "@/lib/storage";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { drumKitId?: string; email?: string };
    const drumKitId = String(body.drumKitId ?? "").trim();
    const email = String(body.email ?? "").trim();
    if (!drumKitId || !email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email and drum kit are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { data: kit, error } = await supabase
      .from("drum_kits")
      .select("name, price, zip_path")
      .eq("id", drumKitId)
      .single();
    if (error || !kit?.zip_path) {
      return NextResponse.json({ error: "Drum kit not found." }, { status: 404 });
    }
    if (Number(kit.price) > 0) {
      return NextResponse.json({ error: "This kit requires payment." }, { status: 400 });
    }

    const ref = parseStorageReference(kit.zip_path);
    if (!ref) {
      return NextResponse.json({ error: "Invalid ZIP path." }, { status: 400 });
    }

    const { data, error: signedError } = await supabase
      .storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, getSignedUrlExpirySeconds());
    if (signedError || !data?.signedUrl) {
      return NextResponse.json({ error: "Could not generate secure download URL." }, { status: 500 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Your free drum kit download: ${kit.name}`,
        text: `Thanks for downloading ${kit.name}. Here is your secure download link: ${data.signedUrl}`,
        html: `<p>Thanks for downloading <strong>${kit.name}</strong>.</p><p><a href="${data.signedUrl}">Download your drum kit</a></p>`
      });
    }

    return NextResponse.json({ downloadUrl: data.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Free download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
