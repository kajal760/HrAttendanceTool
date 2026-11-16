import type { Metadata } from "next";
import { Wrench, CheckCircle2 } from "lucide-react";
import { getAssets } from "@/lib/hr/asset-store";
import { buildMaintenanceRecords } from "@/lib/hr/asset-maintenance";
import MaintenanceTable from "@/components/hr/assets/MaintenanceTable";
import StatTile from "@/components/hr/StatTile";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Maintenance | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function AssetMaintenancePage() {
  const assets = await getAssets();
  const records = buildMaintenanceRecords(assets);

  const inProgress = records.filter((r) => r.status === "In Progress").length;
  const completed = records.filter((r) => r.status === "Completed").length;
  const total = records.length;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const completedPct = total > 0 ? 100 - inProgressPct : 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Maintenance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Repair history, built from each asset&apos;s own event log.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatTile label="In Progress" value={inProgress} icon={Wrench} tone="warning" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} tone="success" />
      </div>

      <div className={styles.tableWrap} style={{ padding: 16, marginBottom: 16 }}>
        <p className={styles.checklistGroupTitle} style={{ marginBottom: 10 }}>
          At a Glance · {total} repair record{total === 1 ? "" : "s"}
        </p>
        {total > 0 ? (
          <>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--color-bg)" }}>
              <div style={{ width: `${inProgressPct}%`, background: "var(--color-warning)" }} />
              <div style={{ width: `${completedPct}%`, background: "var(--color-success)" }} />
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--color-warning)", display: "inline-block" }} />
                In Progress {inProgressPct}%
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--color-success)", display: "inline-block" }} />
                Completed {completedPct}%
              </span>
            </div>
          </>
        ) : (
          <p className={styles.empty} style={{ padding: 0, textAlign: "left" }}>No repair history yet.</p>
        )}
      </div>

      {inProgress > 0 && (
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--color-warning)",
            background: "var(--color-warning-bg)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 12px",
            margin: "0 0 16px",
          }}
        >
          {inProgress} asset{inProgress === 1 ? " is" : "s are"} currently under repair - filter by status below to see them.
        </p>
      )}

      <MaintenanceTable records={records} />
    </>
  );
}
