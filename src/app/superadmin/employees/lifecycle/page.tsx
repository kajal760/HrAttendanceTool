import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { portalBaseForRole } from "@/lib/portal";

// Lifecycle was promoted out of Employees into its own top-level section.
export default async function LegacyEmployeeLifecycleRedirect() {
  const session = await getSession();
  const base = session ? portalBaseForRole(session.role) : "/superadmin";
  redirect(`${base}/lifecycle`);
}
