"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./ChangePasswordForm.module.css";

// Used on both the employee Profile page and the Admin/HR Account page -
// hits the Next route (`/api/auth/change-password`), which forces a
// re-login afterward since the backend doesn't rotate the session token.
export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not change your password.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch {
      setError("Could not change your password - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className={styles.savedNote}>Password changed. Redirecting you to sign in again...</p>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>
      <label className={styles.field}>
        <span>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </label>
      <label className={styles.field}>
        <span>Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </label>
      <p className={styles.hint}>At least 8 characters. You'll be signed out and asked to log in again.</p>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.saveButton} disabled={submitting}>
        {submitting ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
