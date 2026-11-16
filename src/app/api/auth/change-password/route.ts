import { NextResponse } from "next/server";
import { BackendError } from "@/lib/api/backend";
import { changePassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/get-session";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You need to sign in again." }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body ?? {};
  if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  try {
    await changePassword(currentPassword, newPassword);
  } catch (err) {
    const message = err instanceof BackendError ? err.detail : "Could not change your password.";
    const status = err instanceof BackendError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // The backend doesn't rotate/revoke the token, so dropping the cookie here
  // is the only way to make the old session stop being trusted by this app.
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
