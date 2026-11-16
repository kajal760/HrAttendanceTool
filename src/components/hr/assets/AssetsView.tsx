"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, PackageCheck, Pencil, Plus, UserCheck, Wrench, Archive, X } from "lucide-react";
import type { Asset, AssetCategory, AssetEmploymentStatus, AssetLifecycle } from "@/types/asset";
import { ASSET_CATEGORIES, ASSET_EMPLOYMENT_STATUSES } from "@/types/asset";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import ConfirmDialog from "../lifecycle/ConfirmDialog";
import StatTile, { type StatTileTone } from "../StatTile";
import Pager from "@/components/employee/Pager";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

const PAGE_SIZE = 10;

// Quick shortcuts onto the existing lifecycle filter, not separate state -
// "Assigned items"/"Stock" are just the two most-used lifecycle values.
const INVENTORY_TABS: { key: AssetLifecycle | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "Assigned", label: "Assigned items" },
  { key: "Available", label: "Stock" },
];

function toCsv(rows: Asset[], ownerLabel: (a: Asset) => string): string {
  const header = [
    "Asset tag",
    "Name",
    "Category",
    "Device make",
    "Model",
    "Serial number",
    "Department",
    "Owner",
    "Employment status",
    "Status",
    "Vendor",
    "Invoice details",
    "Warranty start",
    "Warranty end",
    "Notes",
    "Purchased on",
  ].join(",");
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((a) =>
    [
      a.assetTag,
      a.name,
      a.category,
      a.deviceMake ?? "",
      a.model ?? "",
      a.serialNumber ?? "",
      a.department ?? "",
      ownerLabel(a),
      a.employmentStatus ?? "",
      a.status,
      a.vendor ?? "",
      a.invoiceDetails ?? "",
      a.warrantyStartDate ?? "",
      a.warrantyEndDate ?? "",
      a.notes ?? "",
      a.purchasedOn ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

interface Person {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
}

interface AssetsViewProps {
  initialAssets: Asset[];
  people: Person[];
  // "inventory" (default) shows everything with Add/Retire; "allocation"
  // pre-filters to Available (so Assign is front and center); "returns"
  // pre-filters to Assigned/Under repair (so Return/Repaired are).
  view?: "inventory" | "allocation" | "returns";
}

const LIFECYCLE: AssetLifecycle[] = ["Available", "Assigned", "Under repair", "Retired"];

const LIFECYCLE_TONE: Record<AssetLifecycle, BadgeTone> = {
  Available: "green",
  Assigned: "blue",
  "Under repair": "amber",
  Retired: "gray",
};

const LIFECYCLE_ICON = {
  Available: PackageCheck,
  Assigned: UserCheck,
  "Under repair": Wrench,
  Retired: Archive,
} as const;

const LIFECYCLE_TILE_TONE: Record<AssetLifecycle, StatTileTone> = {
  Available: "success",
  Assigned: "info",
  "Under repair": "warning",
  Retired: "neutral",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssetsView({ initialAssets, people, view = "inventory" }: AssetsViewProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory | "">("");
  const [lifecycle, setLifecycle] = useState<AssetLifecycle | "">("");
  const [page, setPage] = useState(0);

  const scoped = useMemo(() => {
    if (view === "allocation") return assets.filter((a) => a.status === "Available");
    if (view === "returns") return assets.filter((a) => a.status === "Assigned" || a.status === "Under repair");
    return assets;
  }, [assets, view]);
  const [addOpen, setAddOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Asset | null>(null);
  const [historyFor, setHistoryFor] = useState<Asset | null>(null);
  const [retireFor, setRetireFor] = useState<Asset | null>(null);
  const [editFor, setEditFor] = useState<Asset | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((a) => {
      const owner = a.ownerId ? peopleById.get(a.ownerId) : undefined;
      if (q && !(a.name.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q) || (a.serialNumber ?? "").toLowerCase().includes(q) || (owner?.name ?? "").toLowerCase().includes(q))) {
        return false;
      }
      if (category && a.category !== category) return false;
      if (lifecycle && a.status !== lifecycle) return false;
      return true;
    });
  }, [scoped, query, category, lifecycle, peopleById]);

  const counts = useMemo(() => {
    const c: Record<AssetLifecycle, number> = { Available: 0, Assigned: 0, "Under repair": 0, Retired: 0 };
    for (const a of assets) c[a.status]++;
    return c;
  }, [assets]);

  useEffect(() => {
    setPage(0);
  }, [query, category, lifecycle, view]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageAssets = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const filename = `assets-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = toCsv(filtered, ownerLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function act(asset: Asset, action: string, employeeId?: string): Promise<boolean> {
    setBusyId(asset.id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/assets/${asset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this asset.");
        return false;
      }
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? data.asset : a)));
      return true;
    } catch {
      setError("Could not reach the server - try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function ownerLabel(a: Asset): string {
    if (!a.ownerId) return "Unassigned";
    const p = peopleById.get(a.ownerId);
    return p ? `${p.name} (${p.employeeCode})` : a.ownerId;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        {LIFECYCLE.map((s) => (
          <StatTile key={s} label={s} value={counts[s]} icon={LIFECYCLE_ICON[s]} tone={LIFECYCLE_TILE_TONE[s]} />
        ))}
      </div>

      {view === "inventory" && (
        <div className={styles.tabStrip}>
          {INVENTORY_TABS.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`${styles.tab} ${lifecycle === t.key ? styles.tabActive : ""}`}
              onClick={() => setLifecycle(t.key)}
            >
              {t.label} ({t.key === "" ? assets.length : counts[t.key]})
            </button>
          ))}
        </div>
      )}

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search asset, tag, serial, or owner..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value as AssetCategory | "")} aria-label="Filter by category">
          <option value="">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {view === "inventory" && (
          <select className={styles.filterSelect} value={lifecycle} onChange={(e) => setLifecycle(e.target.value as AssetLifecycle | "")} aria-label="Filter by lifecycle">
            <option value="">All lifecycle stages</option>
            {LIFECYCLE.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <button type="button" className={styles.actionButton} onClick={exportCsv}>
          <Download size={13} strokeWidth={2.25} /> Export
        </button>
        {view === "inventory" && (
          <button type="button" className={styles.primaryButton} onClick={() => setAddOpen(true)}>
            <Plus size={14} strokeWidth={2.25} /> Add asset
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asset Tag</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Device Make</th>
              <th>Model</th>
              <th>Serial No.</th>
              <th>Department</th>
              <th>Device Owner</th>
              <th>Employment Status</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Invoice Details</th>
              <th>Warranty Start</th>
              <th>Warranty End</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageAssets.map((a) => (
              <tr key={a.id}>
                <td className={styles.muted}>{a.assetTag}</td>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>{a.category}</td>
                <td>{a.deviceMake ?? "-"}</td>
                <td className={styles.muted}>{a.model ?? "-"}</td>
                <td className={styles.muted}>{a.serialNumber ?? "-"}</td>
                <td>{a.department ?? "-"}</td>
                <td>{ownerLabel(a)}</td>
                <td>{a.employmentStatus ?? "-"}</td>
                <td>
                  <span className={toneClass(styles, LIFECYCLE_TONE[a.status])}>{a.status}</span>
                </td>
                <td className={styles.muted}>{a.vendor ?? "-"}</td>
                <td className={styles.muted}>{a.invoiceDetails ?? "-"}</td>
                <td>{formatDate(a.warrantyStartDate)}</td>
                <td>{formatDate(a.warrantyEndDate)}</td>
                <td className={styles.muted}>{a.notes ?? "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className={styles.actionButton} onClick={() => setEditFor(a)}>
                      <Pencil size={12} strokeWidth={2.25} /> Edit
                    </button>
                    {a.status === "Available" && (
                      <button type="button" className={styles.actionButton} disabled={busyId === a.id} onClick={() => setAssignFor(a)}>
                        Assign
                      </button>
                    )}
                    {a.status === "Assigned" && (
                      <button type="button" className={styles.actionButton} disabled={busyId === a.id} onClick={() => act(a, "return")}>
                        Return
                      </button>
                    )}
                    {a.status === "Available" && (
                      <button type="button" className={styles.actionButton} disabled={busyId === a.id} onClick={() => act(a, "send-to-repair")}>
                        Send to repair
                      </button>
                    )}
                    {a.status === "Under repair" && (
                      <button type="button" className={styles.actionButton} disabled={busyId === a.id} onClick={() => act(a, "repair-done")}>
                        Repaired
                      </button>
                    )}
                    {a.status === "Available" && (
                      <button type="button" className={styles.actionButton} style={{ color: "var(--color-danger)" }} disabled={busyId === a.id} onClick={() => setRetireFor(a)}>
                        Retire
                      </button>
                    )}
                    <button type="button" className={styles.actionButton} onClick={() => setHistoryFor(a)}>
                      History
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No assets match these filters.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {addOpen && (
        <AddAssetModal
          people={people}
          onClose={() => setAddOpen(false)}
          onAdded={(asset) => {
            setAssets((prev) => [asset, ...prev]);
            setAddOpen(false);
          }}
        />
      )}

      {assignFor && (
        <AssignModal
          asset={assignFor}
          people={people}
          onClose={() => setAssignFor(null)}
          onAssign={async (employeeId) => {
            const ok = await act(assignFor, "assign", employeeId);
            if (ok) setAssignFor(null);
          }}
        />
      )}

      {retireFor && (
        <ConfirmDialog
          title="Retire asset"
          message={`Retire ${retireFor.name} (${retireFor.assetTag})? A retired asset can't be assigned again.`}
          confirmLabel="Retire asset"
          danger
          busy={busyId === retireFor.id}
          onConfirm={async () => {
            const ok = await act(retireFor, "retire");
            if (ok) setRetireFor(null);
          }}
          onCancel={() => setRetireFor(null)}
        />
      )}

      {historyFor && (
        <HistoryModal
          asset={assets.find((a) => a.id === historyFor.id) ?? historyFor}
          peopleById={peopleById}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {editFor && (
        <EditAssetModal
          asset={assets.find((a) => a.id === editFor.id) ?? editFor}
          onClose={() => setEditFor(null)}
          onSaved={(asset) => {
            setAssets((prev) => prev.map((a) => (a.id === asset.id ? asset : a)));
            setEditFor(null);
          }}
        />
      )}
    </div>
  );
}

function AddAssetModal({ people, onClose, onAdded }: { people: Person[]; onClose: () => void; onAdded: (a: Asset) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("Laptop");
  const [assetTag, setAssetTag] = useState("");
  const [deviceMake, setDeviceMake] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<AssetEmploymentStatus | "">("");
  const [vendor, setVendor] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [warrantyStartDate, setWarrantyStartDate] = useState("");
  const [warrantyEndDate, setWarrantyEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the asset name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          assetTag,
          deviceMake,
          model,
          serialNumber,
          department,
          ownerId: ownerId || undefined,
          employmentStatus: employmentStatus || undefined,
          vendor,
          invoiceDetails,
          purchasedOn,
          warrantyStartDate,
          warrantyEndDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add the asset.");
        return;
      }
      onAdded(data.asset);
    } catch {
      setError("Could not add the asset - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Add asset">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Add asset</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Asset name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Latitude 5440" />
            </label>
            <label className={formStyles.field}>
              <span>Type</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Asset tag (optional, auto if blank)</span>
              <input type="text" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="AST-0010" />
            </label>
            <label className={formStyles.field}>
              <span>Device make name</span>
              <input type="text" value={deviceMake} onChange={(e) => setDeviceMake(e.target.value)} placeholder="e.g. Dell, Apple, Lenovo" />
            </label>
            <label className={formStyles.field}>
              <span>Model</span>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Serial no. of the device</span>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Department</span>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. XLabs" />
            </label>
            <label className={formStyles.field}>
              <span>Device owner (optional - leave blank to keep in stock)</span>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.employeeCode})</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Employment status</span>
              <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value as AssetEmploymentStatus | "")}>
                <option value="">Not set</option>
                {ASSET_EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Vendor</span>
              <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Invoice details</span>
              <input type="text" value={invoiceDetails} onChange={(e) => setInvoiceDetails(e.target.value)} placeholder="Invoice number, link, or note" />
            </label>
            <label className={formStyles.field}>
              <span>Purchased on</span>
              <input type="date" value={purchasedOn} onChange={(e) => setPurchasedOn(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Warranty start date</span>
              <input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Warranty end date</span>
              <input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Adding..." : "Add asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAssetModal({
  asset,
  onClose,
  onSaved,
}: {
  asset: Asset;
  onClose: () => void;
  onSaved: (a: Asset) => void;
}) {
  const [deviceMake, setDeviceMake] = useState(asset.deviceMake ?? "");
  const [model, setModel] = useState(asset.model ?? "");
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber ?? "");
  const [department, setDepartment] = useState(asset.department ?? "");
  const [employmentStatus, setEmploymentStatus] = useState<AssetEmploymentStatus | "">(asset.employmentStatus ?? "");
  const [vendor, setVendor] = useState(asset.vendor ?? "");
  const [invoiceDetails, setInvoiceDetails] = useState(asset.invoiceDetails ?? "");
  const [warrantyStartDate, setWarrantyStartDate] = useState(asset.warrantyStartDate ?? "");
  const [warrantyEndDate, setWarrantyEndDate] = useState(asset.warrantyEndDate ?? "");
  const [notes, setNotes] = useState(asset.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceMake,
          model,
          serialNumber,
          department,
          employmentStatus: employmentStatus || undefined,
          vendor,
          invoiceDetails,
          warrantyStartDate,
          warrantyEndDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save these details.");
        return;
      }
      onSaved(data.asset);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Edit asset details">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{asset.name} ({asset.assetTag}) - details</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={formStyles.field}>
              <span>Device make name</span>
              <input type="text" value={deviceMake} onChange={(e) => setDeviceMake(e.target.value)} placeholder="e.g. Dell, Apple, Lenovo" />
            </label>
            <label className={formStyles.field}>
              <span>Model</span>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Serial no. of the device</span>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Department</span>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. XLabs" />
            </label>
            <label className={formStyles.field}>
              <span>Employment status</span>
              <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value as AssetEmploymentStatus | "")}>
                <option value="">Not set</option>
                {ASSET_EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Vendor</span>
              <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Invoice details</span>
              <input type="text" value={invoiceDetails} onChange={(e) => setInvoiceDetails(e.target.value)} placeholder="Invoice number, link, or note" />
            </label>
            <label className={formStyles.field}>
              <span>Warranty start date</span>
              <input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Warranty end date</span>
              <input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Saving..." : "Save details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({
  asset,
  people,
  onClose,
  onAssign,
}: {
  asset: Asset;
  people: Person[];
  onClose: () => void;
  onAssign: (employeeId: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Assign asset">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Assign {asset.name}</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <label className={formStyles.field} style={{ marginBottom: 14 }}>
          <span>Employee</span>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.employeeCode}) · {p.department}</option>
            ))}
          </select>
        </label>
        <div className={formStyles.actions}>
          <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
          <button type="button" className={formStyles.saveButton} disabled={!employeeId} onClick={() => onAssign(employeeId)}>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  asset,
  peopleById,
  onClose,
}: {
  asset: Asset;
  peopleById: Map<string, Person>;
  onClose: () => void;
}) {
  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Asset history" style={{ maxWidth: 720 }}>
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{asset.name} - lifecycle</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className={styles.hint} style={{ marginBottom: 12 }}>
          {asset.assetTag} · {asset.category} · now {asset.status}
          {asset.ownerId ? ` · held by ${peopleById.get(asset.ownerId)?.name ?? asset.ownerId}` : ""}
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Owner after</th>
                <th>Done by</th>
              </tr>
            </thead>
            <tbody>
              {asset.history.map((ev) => (
                <tr key={ev.id}>
                  <td>{formatStamp(ev.date)}</td>
                  <td>{ev.type}{ev.detail ? ` · ${ev.detail}` : ""}</td>
                  <td>{ev.ownerId === undefined ? "-" : ev.ownerId ? peopleById.get(ev.ownerId)?.name ?? ev.ownerId : "Unassigned"}</td>
                  <td>{ev.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
