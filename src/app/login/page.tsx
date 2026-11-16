import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { portalBaseForRole } from "@/lib/portal";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Deliberately not `getSession()` here - it fabricates a dev-bypass
  // session (defaulting to Admin) for any path outside /employee or /hr so
  // those portals are browsable without logging in, but that same fallback
  // made this page look "always logged in" and auto-redirect to /superadmin
  // no matter what was typed into the form below. This checks the real
  // signed cookie only, so the form always renders unless someone has
  // actually signed in.
  const store = await cookies();
  const session = decodeSession(store.get(SESSION_COOKIE)?.value);
  if (session && session.exp * 1000 > Date.now()) redirect(portalBaseForRole(session.role));

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
