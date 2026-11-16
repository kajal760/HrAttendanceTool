import { NextResponse } from "next/server";
import { backend, BackendError } from "@/lib/api/backend";

export const dynamic = "force-dynamic";

interface BackendOtpRequestOut {
  message: string;
  expiresIn: number;
  resendAfter: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const data = await backend<BackendOtpRequestOut>("/auth/otp/request", {
      method: "POST",
      body: { email: email.trim() },
      token: null,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof BackendError ? err.detail : "Could not send the code. Please try again.";
    const status = err instanceof BackendError ? err.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
