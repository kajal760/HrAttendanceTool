import type { Metadata } from "next";
import { getPoshComplaints } from "@/lib/hr/posh-store";
import { getSession } from "@/lib/auth/get-session";
import PoshOverview from "@/components/hr/PoshOverview";

export const metadata: Metadata = {
  title: "POSH Management | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminPoshPage() {
  const [session, complaints] = await Promise.all([getSession(), getPoshComplaints()]);

  // Admin can see the queue (same shared /hr /superadmin tree as everything
  // else) but only HR can move a complaint's status - the
  // `/api/superadmin/posh/[id]` route enforces this too.
  const readOnly = session?.role !== "HR";

  return <PoshOverview complaints={complaints} readOnly={readOnly} />;
}
