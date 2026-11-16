import type { Metadata } from "next";
import { getDirectoryAccounts } from "@/lib/auth/user-store";
import { getSession } from "@/lib/auth/get-session";
import LoginAccountsTable from "@/components/hr/LoginAccountsTable";
import CreateAccountPanel from "@/components/hr/CreateAccountPanel";

export const metadata: Metadata = {
  title: "Roles & Permissions | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const [accounts, session] = await Promise.all([getDirectoryAccounts(), getSession()]);
  const canCreateLogins = session?.role === "HR" || session?.role === "Admin";
  const candidates = accounts.filter((a) => a.role === null);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Roles &amp; Permissions</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          See who has a portal login and their login username.
        </p>
      </div>
      {canCreateLogins && <CreateAccountPanel candidates={candidates} />}
      <LoginAccountsTable accounts={accounts} />
    </>
  );
}
