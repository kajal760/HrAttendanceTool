"use client";

import { useState } from "react";
import type { CelebrationSettings } from "@/lib/hr/settings-store";
import styles from "./leave/Leave.module.css";

interface CelebrationEmailSettingsProps {
  initial: CelebrationSettings;
}

export default function CelebrationEmailSettings({ initial }: CelebrationEmailSettingsProps) {
  const [birthdaysEnabled, setBirthdaysEnabled] = useState(initial.birthdaysEnabled);
  const [anniversariesEnabled, setAnniversariesEnabled] = useState(initial.anniversariesEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ celebrations: { birthdaysEnabled, anniversariesEnabled } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not save.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.policyForm}>
      <label className={styles.policyField} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={birthdaysEnabled}
          onChange={(e) => {
            setBirthdaysEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Send birthday emails
      </label>
      <label className={styles.policyField} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={anniversariesEnabled}
          onChange={(e) => {
            setAnniversariesEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Send work anniversary emails
      </label>
      <p className={styles.policyHint}>
        Both send at {initial.sendTime} daily, to the person's official email with everyone else CC'd. The send
        time itself is set in the scheduler (cron/Task Scheduler), not here.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {saved && <p className={styles.savedNote}>Saved.</p>}
      <button type="button" className={styles.saveButton} disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
