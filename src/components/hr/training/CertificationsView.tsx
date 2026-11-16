"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Upload, X } from "lucide-react";
import type { EmployeeTraining } from "@/types/training";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function isExpired(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default function CertificationsView({ initialAssignments }: { initialAssignments: EmployeeTraining[] }) {
  // Certifications only make sense for trainings that are at least underway
  // - keep this view scoped to assignments with a certificate already on
  // file or that have been completed, instead of every open assignment.
  const [assignments, setAssignments] = useState<EmployeeTraining[]>(
    initialAssignments.filter((a) => a.status === "Completed" || a.hasCertificateFile || a.certificateName),
  );
  const [query, setQuery] = useState("");
  const [editFor, setEditFor] = useState<EmployeeTraining | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter(
      (a) => !q || a.employeeName.toLowerCase().includes(q) || a.programmeName.toLowerCase().includes(q) || (a.certificateName ?? "").toLowerCase().includes(q),
    );
  }, [assignments, query]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee, training, or certificate..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Training</th>
              <th>Certificate Name</th>
              <th>Certificate ID</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>File</th>
              <th>Verification</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.employeeName}</td>
                <td>{a.programmeName}</td>
                <td className={styles.muted}>{a.certificateName ?? "-"}</td>
                <td className={styles.muted}>{a.certificateRef ?? "-"}</td>
                <td className={styles.muted}>{formatDate(a.certIssueDate)}</td>
                <td>
                  {a.certExpiryDate ? (
                    <span className={toneClass(styles, (isExpired(a.certExpiryDate) ? "red" : "green") as BadgeTone)}>
                      {formatDate(a.certExpiryDate)}
                    </span>
                  ) : "-"}
                </td>
                <td>
                  {a.hasCertificateFile ? (
                    <a href={`/api/superadmin/training/assignments/${a.id}/certificate`} className={styles.actionButton} style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      <Download size={12} strokeWidth={2.25} /> {a.certFileName ?? "Download"}
                    </a>
                  ) : "-"}
                </td>
                <td>
                  {a.certVerificationLink ? (
                    <a href={a.certVerificationLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--color-hr-accent)" }}>Verify link</a>
                  ) : "-"}
                </td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => setEditFor(a)}>
                    <Pencil size={12} strokeWidth={2.25} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No certifications yet.</div>}
      </div>

      {editFor && (
        <CertificateModal
          assignment={editFor}
          onClose={() => setEditFor(null)}
          onSaved={(a) => {
            setAssignments((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setEditFor(null);
          }}
        />
      )}
    </div>
  );
}

function CertificateModal({
  assignment,
  onClose,
  onSaved,
}: {
  assignment: EmployeeTraining;
  onClose: () => void;
  onSaved: (a: EmployeeTraining) => void;
}) {
  const [certificateName, setCertificateName] = useState(assignment.certificateName ?? "");
  const [certificateRef, setCertificateRef] = useState(assignment.certificateRef ?? "");
  const [certIssueDate, setCertIssueDate] = useState(assignment.certIssueDate ?? "");
  const [certExpiryDate, setCertExpiryDate] = useState(assignment.certExpiryDate ?? "");
  const [certVerificationLink, setCertVerificationLink] = useState(assignment.certVerificationLink ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let updated = assignment;
      const res = await fetch(`/api/superadmin/training/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateName, certificateRef, certIssueDate, certExpiryDate, certVerificationLink }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the certificate details.");
        return;
      }
      updated = data.assignment;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch(`/api/superadmin/training/assignments/${assignment.id}/certificate`, { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error ?? "Details saved, but the certificate file upload failed.");
          return;
        }
        updated = uploadData.assignment;
      }
      onSaved(updated);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Certificate details">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{assignment.employeeName} - certificate</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Certificate name</span>
              <input type="text" value={certificateName} onChange={(e) => setCertificateName(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Certificate ID</span>
              <input type="text" value={certificateRef} onChange={(e) => setCertificateRef(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Issue date</span>
              <input type="date" value={certIssueDate} onChange={(e) => setCertIssueDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Expiry date</span>
              <input type="date" value={certExpiryDate} onChange={(e) => setCertExpiryDate(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Verification link</span>
              <input type="url" value={certVerificationLink} onChange={(e) => setCertVerificationLink(e.target.value)} placeholder="https://..." />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Certificate file (PDF/Image)</span>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Saving..." : <><Upload size={13} strokeWidth={2.25} /> Save certificate</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
