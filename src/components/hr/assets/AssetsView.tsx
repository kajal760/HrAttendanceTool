"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Asset, AssetCategory, AssetLifecycle } from "@/types/asset";
import { ASSET_CATEGORIES } from "@/types/asset";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import ConfirmDialog from "../lifecycle/ConfirmDialog";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

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

  const scoped = useMemo(() => {
    if (view === "allocation") return assets.filter((a) => a.status === "Available");
    if (view === "returns") return assets.filter((a) => a.status === "Assigned" || a.status === "Under repair");
    return assets;
  }, [assets, view]);
  const [addOpen, setAddOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Asset | null>(null);
  const [historyFor, setHistoryFor] = useState<Asset | null>(null);
  const [retireFor, setRetireFor] = useState<Asset | null>(null);
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
      <div className={styles.statGrid}>
        {LIFECYCLE.map((s) => (
          <div key={s} className={styles.statCard}>
            <span className={styles.statValue}>{counts[s]}</span>
            <span className={styles.statLabel}>{s}</span>
          </div>
        ))}
      </div>

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
              <th>Asset tag</th>
              <th>Asset</th>
              <th>Category</th>
              <th>Serial no.</th>
              <th>Owner</th>
              <th>Lifecycle</th>
              <th>With owner since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className={styles.muted}>{a.assetTag}</td>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>{a.category}</td>
                <td className={styles.muted}>{a.serialNumber ?? "-"}</td>
                <td>{ownerLabel(a)}</td>
                <td>
                  <span className={toneClass(styles, LIFECYCLE_TONE[a.status])}>{a.status}</span>
                </td>
                <td>{formatDate(a.assignedOn)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
    </div>
  );
}

function AddAssetModal({ people, onClose, onAdded }: { people: Person[]; onClose: () => void; onAdded: (a: Asset) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("Laptop");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [ownerId, setOwnerId] = useState("");
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
        body: JSON.stringify({ name, category, assetTag, serialNumber, purchasedOn, ownerId: ownerId || undefined }),
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
              <span>Category</span>
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
              <span>Serial number</span>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Purchased on</span>
              <input type="date" value={purchasedOn} onChange={(e) => setPurchasedOn(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Owner (optional - leave blank to keep in stock)</span>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.employeeCode})</option>
                ))}
              </select>
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
