"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { TrainingCategory, TrainingMode, TrainingProgramme } from "@/types/training";
import { TRAINING_CATEGORIES, TRAINING_MODES } from "@/types/training";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export default function TrainingProgrammesView({ initialProgrammes }: { initialProgrammes: TrainingProgramme[] }) {
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>(initialProgrammes);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TrainingCategory | "">("");
  const [addOpen, setAddOpen] = useState(false);
  const [editFor, setEditFor] = useState<TrainingProgramme | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programmes.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.trainingRef.toLowerCase().includes(q))) return false;
      if (category && p.category !== category) return false;
      return true;
    });
  }, [programmes, query, category]);

  async function toggleActive(p: TrainingProgramme) {
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/training/programmes/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this programme.");
        return;
      }
      setProgrammes((prev) => prev.map((x) => (x.id === p.id ? data.programme : x)));
    } catch {
      setError("Could not reach the server - try again.");
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search programme name or ref..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value as TrainingCategory | "")} aria-label="Filter by category">
          <option value="">All categories</option>
          {TRAINING_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="button" className={styles.primaryButton} onClick={() => setAddOpen(true)}>
          <Plus size={14} strokeWidth={2.25} /> New programme
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Training Name</th>
              <th>Category</th>
              <th>Trainer</th>
              <th>Mode</th>
              <th>Provider</th>
              <th>Dates</th>
              <th>Duration (hrs)</th>
              <th>Cost</th>
              <th>Assigned</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className={styles.muted}>{p.trainingRef}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.trainerName ?? "-"}</td>
                <td>{p.mode}</td>
                <td className={styles.muted}>{p.provider ?? "-"}</td>
                <td className={styles.muted}>{formatDate(p.startDate)} - {formatDate(p.endDate)}</td>
                <td>{p.durationHours ?? "-"}</td>
                <td>{p.cost !== undefined ? `₹${p.cost}` : "-"}</td>
                <td>{p.assignmentCount}</td>
                <td>
                  <span className={styles.badge} style={{
                    color: p.isActive ? "var(--color-success)" : "var(--color-text-muted)",
                    background: p.isActive ? "var(--color-success-bg)" : "var(--color-bg)",
                  }}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className={styles.actionButton} onClick={() => setEditFor(p)}>Edit</button>
                    <button type="button" className={styles.actionButton} onClick={() => toggleActive(p)}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No training programmes match these filters.</div>}
      </div>

      {addOpen && (
        <ProgrammeModal
          onClose={() => setAddOpen(false)}
          onSaved={(p) => {
            setProgrammes((prev) => [p, ...prev]);
            setAddOpen(false);
          }}
        />
      )}

      {editFor && (
        <ProgrammeModal
          programme={editFor}
          onClose={() => setEditFor(null)}
          onSaved={(p) => {
            setProgrammes((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            setEditFor(null);
          }}
        />
      )}
    </div>
  );
}

function ProgrammeModal({
  programme,
  onClose,
  onSaved,
}: {
  programme?: TrainingProgramme;
  onClose: () => void;
  onSaved: (p: TrainingProgramme) => void;
}) {
  const [name, setName] = useState(programme?.name ?? "");
  const [category, setCategory] = useState<TrainingCategory>(programme?.category ?? "Technical");
  const [description, setDescription] = useState(programme?.description ?? "");
  const [trainerName, setTrainerName] = useState(programme?.trainerName ?? "");
  const [mode, setMode] = useState<TrainingMode>(programme?.mode ?? "Online");
  const [provider, setProvider] = useState(programme?.provider ?? "");
  const [startDate, setStartDate] = useState(programme?.startDate ?? "");
  const [endDate, setEndDate] = useState(programme?.endDate ?? "");
  const [durationHours, setDurationHours] = useState(programme?.durationHours?.toString() ?? "");
  const [cost, setCost] = useState(programme?.cost?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the training name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = programme ? `/api/superadmin/training/programmes/${programme.id}` : "/api/superadmin/training/programmes";
      const res = await fetch(url, {
        method: programme ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description,
          trainerName,
          mode,
          provider,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          durationHours: durationHours ? Number(durationHours) : undefined,
          cost: cost ? Number(cost) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this programme.");
        return;
      }
      onSaved(data.programme);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label={programme ? "Edit training programme" : "New training programme"}>
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{programme ? "Edit training programme" : "New training programme"}</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Training name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Advanced React Workshop" />
            </label>
            <label className={formStyles.field}>
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as TrainingCategory)}>
                {TRAINING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as TrainingMode)}>
                {TRAINING_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Trainer name</span>
              <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="Internal or external trainer" />
            </label>
            <label className={formStyles.field}>
              <span>Training provider</span>
              <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Company or platform" />
            </label>
            <label className={formStyles.field}>
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>End date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Duration (hours)</span>
              <input type="number" min="0" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Training cost</span>
              <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="If applicable" />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of the training" />
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Saving..." : programme ? "Save changes" : "Create programme"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
