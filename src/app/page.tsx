import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { portalBaseForRole } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  redirect(session ? portalBaseForRole(session.role) : "/login");
}
