"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import type { ApiLeaveType } from "@/lib/api/types";
import formStyles from "../FormModal.module.css";

interface FormState {
  description: string;
  annualQuota: string;
  minDaysPerRequest: string;
  maxDaysPerRequest: string;
  allowHalfDay: boolean;
  certificateRequiredAfterDays: string;
  perOccurrenceDays: string;
  maxOccurrences: string;
  maxDaysBeforeEvent: string;
  isActive: boolean;
}

function toFormState(type: ApiLeaveType): FormState {
  return {
    description: type.description ?? "",
    annualQuota: type.annualQuota === null ? "" : String(type.annualQuota),
    minDaysPerRequest: type.minDaysPerRequest === null ? "" : String(type.minDaysPerRequest),
    maxDaysPerRequest: type.maxDaysPerRequest === null ? "" : String(type.maxDaysPerRequest),
    allowHalfDay: type.allowHalfDay,
    certificateRequiredAfterDays: type.certificateRequiredAfterDays === null ? "" : String(type.certificateRequiredAfterDays),
    perOccurrenceDays: type.perOccurrenceDays === null ? "" : String(type.perOccurrenceDays),
    maxOccurrences: type.maxOccurrences === null ? "" : String(type.maxOccurrences),
    maxDaysBeforeEvent: type.maxDaysBeforeEvent === null ? "" : String(type.maxDaysBeforeEvent),
    isActive: type.isActive,
  };
}

// Numeric field -> `null` when cleared, else a number. The PATCH is partial
// (`exclude_unset`) but we always send every field here since the form
// always has a value for each (empty string included).
function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

interface LeaveTypeFormModalProps {
  type: ApiLeaveType;
  onClose: () => void;
  onSaved: (type: ApiLeaveType) => void;
}

// Edit-only - the backend has no create/delete for leave types, and `code`
// and `name` aren't in its patch schema, so neither is editable here.
export default function LeaveTypeFormModal({ type, onClose, onSaved }: LeaveTypeFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(type));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const minDays = toNullableNumber(form.minDaysPerRequest);
    const maxDays = toNullableNumber(form.maxDaysPerRequest);
    if (minDays !== null && maxDays !== null && minDays > maxDays) {
      setError("Minimum days per request can't be more than the maximum.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/leave/types/${type.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description.trim() || null,
          annualQuota: toNullableNumber(form.annualQuota),
          minDaysPerRequest: minDays,
          maxDaysPerRequest: maxDays,
          allowHalfDay: form.allowHalfDay,
          certificateRequiredAfterDays: toNullableNumber(form.certificateRequiredAfterDays),
          perOccurrenceDays: toNullableNumber(form.perOccurrenceDays),
          maxOccurrences: toNullableNumber(form.maxOccurrences),
          maxDaysBeforeEvent: toNullableNumber(form.maxDaysBeforeEvent),
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update leave type.");
        return;
      }
      onSaved(data.type);
    } catch {
      setError("Could not update leave type - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={formStyles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label={`Edit ${type.name}`}>
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Edit {type.name}</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form className={formStyles.form} onSubmit={handleSubmit}>
          <div className={formStyles.grid}>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className={formStyles.field}>
              <span>Annual quota (days/year)</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.annualQuota}
                onChange={(e) => setForm((f) => ({ ...f, annualQuota: e.target.value }))}
                placeholder="No yearly quota"
              />
            </label>
            <label className={formStyles.field}>
              <span>Min days per request</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.minDaysPerRequest}
                onChange={(e) => setForm((f) => ({ ...f, minDaysPerRequest: e.target.value }))}
                placeholder="No minimum"
              />
            </label>
            <label className={formStyles.field}>
              <span>Max days per request</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.maxDaysPerRequest}
                onChange={(e) => setForm((f) => ({ ...f, maxDaysPerRequest: e.target.value }))}
                placeholder="No maximum"
              />
            </label>
            <label className={formStyles.field}>
              <span>Certificate required after (days)</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.certificateRequiredAfterDays}
                onChange={(e) => setForm((f) => ({ ...f, certificateRequiredAfterDays: e.target.value }))}
                placeholder="Never required"
              />
            </label>
            <label className={formStyles.field}>
              <span>Per-occurrence days (e.g. maternity)</span>
              <input
                type="number"
                min={0}
                value={form.perOccurrenceDays}
                onChange={(e) => setForm((f) => ({ ...f, perOccurrenceDays: e.target.value }))}
                placeholder="Not occurrence-based"
              />
            </label>
            <label className={formStyles.field}>
              <span>Max occurrences</span>
              <input
                type="number"
                min={0}
                value={form.maxOccurrences}
                onChange={(e) => setForm((f) => ({ ...f, maxOccurrences: e.target.value }))}
                placeholder="Unlimited"
              />
            </label>
            <label className={formStyles.field}>
              <span>Max days before event (e.g. notice)</span>
              <input
                type="number"
                min={0}
                value={form.maxDaysBeforeEvent}
                onChange={(e) => setForm((f) => ({ ...f, maxDaysBeforeEvent: e.target.value }))}
                placeholder="No notice window"
              />
            </label>
            <label className={formStyles.checklistItem}>
              <input
                type="checkbox"
                checked={form.allowHalfDay}
                onChange={(e) => setForm((f) => ({ ...f, allowHalfDay: e.target.checked }))}
              />
              Allow half-day requests
            </label>
            <label className={formStyles.checklistItem}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active (selectable when applying for leave)
            </label>
          </div>

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
