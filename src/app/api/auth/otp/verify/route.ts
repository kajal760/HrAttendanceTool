import { NextResponse } from "next/server";
import { backend, BackendError } from "@/lib/api/backend";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { portalBaseForRole } from "@/lib/portal";
import type { Role } from "@/types/auth";

export const dynamic = "force-dynamic";

interface BackendOtpVerifyOut {
  accessToken: string;
  expiresIn: number;
  user: { userId: string; email: string; role: Role; name: string; employeeId: string | null };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE = /^\d{6}$/;

export async function POST(request: Request) {
  const body = await request.json();
  const { email, otp } = body ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (typeof otp !== "string" || !OTP_RE.test(otp.trim())) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  let result: BackendOtpVerifyOut;
  try {
    result = await backend<BackendOtpVerifyOut>("/auth/otp/verify", {
      method: "POST",
      body: { email: email.trim(), otp: otp.trim() },
      token: null,
    });
  } catch (err) {
    const message = err instanceof BackendError ? err.detail : "Could not verify the code.";
    const status = err instanceof BackendError ? err.status : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const { user } = result;
  const token = encodeSession({
    userId: user.userId,
    email: user.email,
    role: user.role,
    name: user.name,
    employeeId: user.employeeId ?? undefined,
    accessToken: result.accessToken,
    exp: Math.floor(Date.now() / 1000) + result.expiresIn,
  });

  const response = NextResponse.json({
    role: user.role,
    name: user.name,
    redirectTo: portalBaseForRole(user.role),
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: result.expiresIn,
  });
  return response;
}
