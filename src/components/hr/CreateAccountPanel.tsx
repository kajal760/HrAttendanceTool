"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { UserPlus, X } from "lucide-react";
import type { DirectoryAccount } from "@/lib/auth/user-store";
import styles from "./lifecycle/Lifecycle.module.css";
import formStyles from "./FormModal.module.css";

type LoginRole = "HR" | "Employee";

interface CreateAccountPanelProps {
  // Employees who don't have a portal login yet (`role: null`) - the only
  // ones a new account can be created for.
  candidates: DirectoryAccount[];
}

// Backs the Roles & Permissions matrix's "Create HR / Employee login
// accounts" feature - HR picks an employee who has no login yet and gives
// them one. Calls `POST /api/superadmin/users`, which is new: there's no
// prior "create a login for someone else" flow anywhere in this app (only
// self password-change existed before), so a clear error here may mean the
// backend doesn't support this shape yet.
export default function CreateAccountPanel({ candidates: initialCandidates }: CreateAccountPanelProps) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<LoginRole>("Employee");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdFor, setCreatedFor] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setCreatedFor(null);
    setEmployeeId("");
    setEmail("");
    setRole("Employee");
    setPassword("");
    setConfirmPassword("");
    setOpen(true);
  }

  function selectEmployee(id: string) {
    setEmployeeId(id);
    setEmail(candidates.find((c) => c.employeeId === id)?.email ?? "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId || !email.trim() || !password) {
      setError("Pick an employee, and fill in the email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create that account.");
        return;
      }
      const created = candidates.find((c) => c.employeeId === employeeId);
      setCandidates((prev) => prev.filter((c) => c.employeeId !== employeeId));
      setCreatedFor(created?.name ?? "that employee");
      setEmployeeId("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not reach the server - try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Login accounts</h3>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
            Give an employee portal access by creating an HR or Employee login for them.
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openModal}>
          <UserPlus size={14} /> Create Account
        </button>
      </div>

      {open && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Create login account">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Create login account</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {createdFor && (
              <p style={{ fontSize: 12.5, color: "var(--color-success)", margin: "0 0 12px" }}>
                Account created for {createdFor}.
              </p>
            )}

            <form className={formStyles.form} onSubmit={submit}>
              <div className={formStyles.grid}>
                <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
                  <span>Employee (no login yet)</span>
                  <select value={employeeId} onChange={(e) => selectEmployee(e.target.value)}>
                    <option value="">Select employee</option>
                    {candidates.map((c) => (
                      <option key={c.employeeId} value={c.employeeId}>
                        {c.name} ({c.employeeCode})
                      </option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Account role</span>
                  <select value={role} onChange={(e) => setRole(e.target.value as LoginRole)}>
                    <option value="Employee">Employee</option>
                    <option value="HR">HR</option>
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Username / email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                </label>
                <label className={formStyles.field}>
                  <span>Password (min. 8 characters)</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label className={formStyles.field}>
                  <span>Confirm password</span>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </label>
              </div>
              {candidates.length === 0 && !createdFor && (
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Every employee already has a login.
                </p>
              )}
              {error && <div className={formStyles.error}>{error}</div>}
              <div className={formStyles.actions}>
                <button type="button" className={formStyles.cancelButton} onClick={() => setOpen(false)}>
                  Close
                </button>
                <button type="submit" className={formStyles.saveButton} disabled={submitting || candidates.length === 0}>
                  {submitting ? "Creating..." : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
