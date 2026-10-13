import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth/user-store";
import { verifyPassword } from "@/lib/auth/password";
import { encodeSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { portalBaseForRole } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body ?? {};

  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = encodeSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    employeeId: user.employeeId,
  });

  const response = NextResponse.json({
    role: user.role,
    name: user.name,
    redirectTo: portalBaseForRole(user.role),
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
