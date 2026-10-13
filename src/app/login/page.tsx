import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { portalBaseForRole } from "@/lib/portal";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(portalBaseForRole(session.role));

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
