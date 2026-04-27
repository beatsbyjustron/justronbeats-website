import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return NextResponse.json({ error: "Missing MAKE_WEBHOOK_URL." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "justronbeats-website",
        submittedAt: new Date().toISOString()
      })
    });

    if (!webhookResponse.ok) {
      return NextResponse.json({ error: "Failed to forward email to webhook." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
