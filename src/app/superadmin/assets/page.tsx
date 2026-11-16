import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, UserCheck, PackageCheck, Wrench, AlertTriangle } from "lucide-react";
import { getAssets, getAssetEvents } from "@/lib/hr/asset-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getSession } from "@/lib/auth/get-session";
import { withBase } from "@/lib/portal";
import type { Asset } from "@/types/asset";
import AssetStatusDonut, { type AssetStatusSlice } from "@/components/hr/assets/AssetStatusDonut";
import AssetAlertsList, { type AssetAlert } from "@/components/hr/assets/AssetAlertsList";
import CategoryBarChart, { CategoryBarChartLegend } from "@/components/hr/CategoryBarChart";
import SectionCard from "@/components/employee/SectionCard";
import StatTile from "@/components/hr/StatTile";
import lifecycleStyles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Assets | HumSetu",
};

export const dynamic = "force-dynamic";

// First-recorded ("Added") date, falling back to the earliest event -
// used to sort "recently added" without a dedicated createdOn field.
function addedDate(asset: Asset): string {
  const added = asset.history.find((e) => e.type === "Added");
  if (added) return added.date;
  return asset.history[0]?.date ?? asset.purchasedOn ?? "1970-01-01";
}

export default async function AssetsDashboardPage() {
  const [assets, events, employees, session] = await Promise.all([
    getAssets(),
    getAssetEvents(),
    getEmployeeOverviews(),
    getSession(),
  ]);
  const base = session?.role === "HR" ? "/hr" : "/superadmin";
  const peopleById = new Map(employees.map((e) => [e.id, e]));

  const counts = { Available: 0, Assigned: 0, "Under repair": 0, Retired: 0 };
  for (const a of assets) counts[a.status]++;

  const stats = [
    { label: "Total Assets", value: assets.length, icon: Boxes, tone: "accent" as const },
    { label: "Assigned Assets", value: counts.Assigned, icon: UserCheck, tone: "info" as const },
    { label: "Available Assets", value: counts.Available, icon: PackageCheck, tone: "success" as const },
    { label: "Under Maintenance", value: counts["Under repair"], icon: Wrench, tone: "warning" as const },
    { label: "Damaged Assets", value: counts.Retired, icon: AlertTriangle, tone: "danger" as const },
  ];

  const statusSlices: AssetStatusSlice[] = [
    { label: "Available", value: counts.Available, color: "var(--color-success)" },
    { label: "Assigned", value: counts.Assigned, color: "var(--color-info)" },
    { label: "Maintenance", value: counts["Under repair"], color: "var(--color-warning)" },
    { label: "Damaged", value: counts.Retired, color: "var(--color-danger)" },
  ].filter((s) => s.value > 0);

  const byCategory = new Map<string, number>();
  for (const a of assets) byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
  const categoryCounts = Array.from(byCategory.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const recentAssets = [...assets].sort((a, b) => (addedDate(a) < addedDate(b) ? 1 : -1)).slice(0, 5);

  const alerts: AssetAlert[] = [...events]
    .filter((e) => e.type === "Sent for repair" || e.type === "Retired")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      message:
        e.type === "Sent for repair"
          ? `${e.assetName} was sent for repair`
          : `${e.assetName} was retired`,
      detail: `${e.assetTag}${e.detail ? ` · ${e.detail}` : ""}`,
      date: e.date,
      tone: e.type === "Retired" ? "danger" : "warning",
    }));
  if (counts["Under repair"] > 0) {
    alerts.unshift({
      id: "summary-maintenance",
      message: `${counts["Under repair"]} asset${counts["Under repair"] === 1 ? " is" : "s are"} under maintenance`,
      detail: "Check repair status",
      date: new Date().toISOString(),
      tone: "warning",
    });
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Asset Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Welcome back! Here&apos;s what&apos;s happening with your assets.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 18 }}>
        <SectionCard title="Asset Status Overview">
          <AssetStatusDonut data={statusSlices} />
        </SectionCard>
        <SectionCard title="Assets by Category">
          <CategoryBarChart data={categoryCounts} />
          <CategoryBarChartLegend data={categoryCounts} />
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <SectionCard
          title="Recent Assets"
          action={
            <Link href={withBase(base, "/assets/inventory")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-hr-accent)" }}>
              View All →
            </Link>
          }
        >
          <div className={lifecycleStyles.tableWrap}>
            <table className={lifecycleStyles.table}>
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{a.category}</td>
                    <td className={lifecycleStyles.muted}>{a.serialNumber ?? "-"}</td>
                    <td>
                      <span
                        className={lifecycleStyles.badge}
                        style={{
                          color:
                            a.status === "Available"
                              ? "var(--color-success)"
                              : a.status === "Assigned"
                                ? "var(--color-info)"
                                : a.status === "Under repair"
                                  ? "var(--color-warning)"
                                  : "var(--color-danger)",
                          background:
                            a.status === "Available"
                              ? "var(--color-success-bg)"
                              : a.status === "Assigned"
                                ? "var(--color-info-bg)"
                                : a.status === "Under repair"
                                  ? "var(--color-warning-bg)"
                                  : "var(--color-danger-bg)",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className={lifecycleStyles.muted}>{a.ownerId ? (peopleById.get(a.ownerId)?.name ?? "-") : "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentAssets.length === 0 && <div className={lifecycleStyles.empty}>No assets yet.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Recent Alerts">
          <AssetAlertsList alerts={alerts} />
        </SectionCard>
      </div>
    </>
  );
}
