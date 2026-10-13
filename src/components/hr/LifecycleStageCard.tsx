"use client";

import { useState } from "react";
import type { EmployeeOverview, EmployeeStatus } from "@/types/hr";
import ConfirmDialog from "./lifecycle/ConfirmDialog";
import { EMPLOYEE_STATUS_TONE, toneClass } from "./lifecycle/badge-tones";
import styles from "./LifecycleStageCard.module.css";
import lifecycleStyles from "./lifecycle/Lifecycle.module.css";

interface Move {
  to: EmployeeStatus;
  label: string;
  needsSeparationDetails?: boolean;
  finalStatus?: "Resigned" | "Exited";
}

// Only moves the lifecycle route accepts from each status are offered here,
// so the list never suggests something the server would refuse.
const MOVES: Record<EmployeeStatus, Move[]> = {
  Onboarding: [{ to: "Probation", label: "Complete onboarding - move to Probation" }],
  Probation: [
    { to: "Active", label: "Confirm - move to Active" },
    { to: "Notice Period", label: "Start separation - Notice Period", needsSeparationDetails: true },
  ],
  Active: [
    { to: "On Leave", label: "Put on leave" },
    { to: "Notice Period", label: "Start separation - Notice Period", needsSeparationDetails: true },
  ],
  "On Leave": [
    { to: "Active", label: "Return from leave - Active" },
    { to: "Notice Period", label: "Start separation - Notice Period", needsSeparationDetails: true },
  ],
  "Notice Period": [
    { to: "Exited", label: "Complete exit - Exited", finalStatus: "Exited" },
    { to: "Resigned", label: "Complete exit - Resigned", finalStatus: "Resigned" },
  ],
  Resigned: [],
  Exited: [],
};

interface LifecycleStageCardProps {
  employee: EmployeeOverview;
  onUpdated: (employee: EmployeeOverview) => void;
}

function requestFor(employee: EmployeeOverview, move: Move, reason: string, lastWorkingDay: string) {
  if (move.finalStatus) return { action: "finalize-separation", status: move.finalStatus };
  if (move.to === "Notice Period") return { action: "initiate-separation", reason, lastWorkingDay };
  if (move.to === "Probation") return { action: "complete-onboarding" };
  if (move.to === "Active" && employee.status === "Probation") return { action: "confirm" };
  return { action: "change-status", status: move.to };
}

export default function LifecycleStageCard({ employee, onUpdated }: LifecycleStageCardProps) {
  const locked = employee.deactivated || !!employee.exit?.deletedOn;
  const moves = locked ? [] : MOVES[employee.status];
  const [choice, setChoice] = useState("");
  const [reason, setReason] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = moves.find((m) => m.to === choice);

  function review() {
    if (!move) return;
    if (move.needsSeparationDetails && (!reason.trim() || !lastWorkingDay)) {
      setError("Enter the reason and last working day to start separation.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function apply() {
    if (!move) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestFor(employee, move, reason.trim(), lastWorkingDay)),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not change the stage.");
        setConfirming(false);
        return;
      }
      onUpdated(data.employee);
      setChoice("");
      setReason("");
      setLastWorkingDay("");
      setConfirming(false);
    } catch {
      setError("Could not change the stage - check your connection and try again.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>Lifecycle stage</span>
          <span className={toneClass(lifecycleStyles, EMPLOYEE_STATUS_TONE[employee.status])}>{employee.status}</span>
        </div>
        {locked && <span className={styles.note}>This record is locked.</span>}
      </div>

      {moves.length === 0 ? (
        <p className={styles.note}>No stage changes are available from {employee.status}.</p>
      ) : (
        <div className={styles.controls}>
          <select className={styles.select} value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Move to stage">
            <option value="">Move to...</option>
            {moves.map((m) => (
              <option key={m.to} value={m.to}>
                {m.label}
              </option>
            ))}
          </select>
          {move?.needsSeparationDetails && (
            <>
              <input
                className={styles.input}
                type="text"
                placeholder="Reason for leaving"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <input
                className={styles.input}
                type="date"
                value={lastWorkingDay}
                onChange={(e) => setLastWorkingDay(e.target.value)}
                aria-label="Last working day"
              />
            </>
          )}
          <button type="button" className={styles.apply} onClick={review} disabled={!move || busy}>
            Apply
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {confirming && move && (
        <ConfirmDialog
          title="Change lifecycle stage"
          message={`Are you sure you want to move ${employee.name} from ${employee.status} to ${move.to}?`}
          confirmLabel="Confirm change"
          danger={move.to === "Exited" || move.to === "Resigned" || move.to === "Notice Period"}
          busy={busy}
          onConfirm={apply}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
