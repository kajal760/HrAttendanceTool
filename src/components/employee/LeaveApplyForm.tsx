"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { HalfDaySession, LeaveTypeOption } from "@/types/employee";
import { todayKey } from "@/lib/employee/leave-utils";
import styles from "./LeaveRequests.module.css";

interface LeaveApplyFormProps {
  leaveTypes: LeaveTypeOption[];
}

interface Preview {
  days?: number;
  certificateRequired?: boolean;
  remainingAfter?: number | null;
  error?: string;
}

// Submits to `POST /api/employee/leave`, which forwards to the backend's
// leave policy engine. While the form is filled in, a debounced preview call
// shows how many days the request counts as (weekends and holidays are
// skipped) or which rule it would break, before the employee submits.
export default function LeaveApplyForm({ leaveTypes }: LeaveApplyFormProps) {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [halfDaySession, setHalfDaySession] = useState<HalfDaySession | "">("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [reason, setReason] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const leaveType = leaveTypes.find((t) => t.id === leaveTypeId);
  const isHalfDay = halfDaySession !== "";

  function payload() {
    return {
      leaveTypeId,
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      halfDaySession: isHalfDay ? halfDaySession : undefined,
      expectedDeliveryDate: leaveType?.needsExpectedDeliveryDate && expectedDeliveryDate ? expectedDeliveryDate : undefined,
      reason: reason.trim(),
    };
  }

  // Reset options that don't apply to the newly chosen type.
  useEffect(() => {
    if (!leaveType?.allowHalfDay) setHalfDaySession("");
  }, [leaveType]);

  useEffect(() => {
    if (!leaveTypeId || !startDate || (!isHalfDay && endDate < startDate)) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/employee/leave/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
          signal: controller.signal,
        });
        const data = await res.json();
        setPreview(res.ok ? data : { error: data.error });
      } catch {
        // aborted or offline - the submit will report the real error
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payload() is derived from these
  }, [leaveTypeId, startDate, endDate, halfDaySession, expectedDeliveryDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isHalfDay && endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Please add a short reason (10+ characters).");
      return;
    }
    if (leaveType?.needsExpectedDeliveryDate && !expectedDeliveryDate) {
      setError("Enter the expected delivery date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit your request.");
        return;
      }

      if (certificate) {
        const form = new FormData();
        form.append("file", certificate);
        const upload = await fetch(`/api/employee/leave/${data.request.id}/attachment`, { method: "POST", body: form });
        if (!upload.ok) {
          const uploadData = await upload.json().catch(() => ({}));
          setError(
            `Your request was submitted, but the attachment didn't upload (${uploadData.error ?? "unknown error"}). ` +
              "You can attach it again from your leave history.",
          );
          router.refresh();
          return;
        }
      }

      router.push("/employee/leave");
      router.refresh();
    } catch {
      setError("Could not submit your request - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const certificateExpected = preview?.certificateRequired ?? false;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          Leave type
          <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {leaveType?.allowHalfDay && (
          <label className={styles.field}>
            Duration
            <select value={halfDaySession} onChange={(e) => setHalfDaySession(e.target.value as HalfDaySession | "")}>
              <option value="">Full day(s)</option>
              <option value="First Half">Half day - first half</option>
              <option value="Second Half">Half day - second half</option>
            </select>
          </label>
        )}
      </div>
      {leaveType?.description && <span className={styles.daysHint}>{leaveType.description}</span>}

      <div className={styles.formRow}>
        <label className={styles.field}>
          {isHalfDay ? "Date" : "Start date"}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        {!isHalfDay && (
          <label className={styles.field}>
            End date
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
        )}
      </div>

      {leaveType?.needsExpectedDeliveryDate && (
        <div className={styles.formRow}>
          <label className={styles.field}>
            Expected delivery date
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              required
            />
          </label>
        </div>
      )}

      <span className={styles.daysHint}>
        {preview?.error
          ? preview.error
          : preview?.days !== undefined
            ? `${preview.days} day(s)` +
              (preview.remainingAfter !== null && preview.remainingAfter !== undefined
                ? ` · ${preview.remainingAfter} left this year after this request`
                : "")
            : " "}
      </span>

      <label className={styles.field}>
        Reason
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Add a short reason for this leave..."
          required
        />
      </label>

      {(certificateExpected || leaveType?.certificateRequiredAfterDays !== null) && (
        <label className={styles.field}>
          {certificateExpected ? "Medical certificate (required for approval)" : "Supporting document (optional)"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton} disabled={submitting || Boolean(preview?.error)}>
          {submitting ? "Submitting..." : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
