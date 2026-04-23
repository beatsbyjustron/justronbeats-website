import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstileToken(token: string, remoteIp: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true };
  if (!token) return { ok: false, error: "Please complete the CAPTCHA challenge." };

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {})
    })
  });

  const result = (await response.json()) as { success?: boolean };
  if (!response.ok || !result.success) {
    return { ok: false, error: "CAPTCHA verification failed. Please try again." };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      message?: string;
      website?: string;
      turnstileToken?: string;
    };

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    const website = String(body.website ?? "").trim();
    const turnstileToken = String(body.turnstileToken ?? "").trim();

    // Honeypot for common form bots.
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const captchaCheck = await verifyTurnstileToken(turnstileToken, remoteIp);
    if (!captchaCheck.ok) {
      return NextResponse.json({ error: captchaCheck.error }, { status: 400 });
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: "beatsbyjustron@gmail.com",
      subject: `New contact form submission from ${name}`,
      replyTo: email,
      text: `New message from the contact form.

Name: ${name}
Email: ${email}

Message:
${message}`,
      html: `<p><strong>New message from the contact form</strong></p>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
