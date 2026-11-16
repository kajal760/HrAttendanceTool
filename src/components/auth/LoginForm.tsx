"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./LoginForm.module.css";

// No passwords anywhere in the system - sign-in is email + OTP: request a
// code for an email address, then verify it (`@/app/api/auth/otp/request`
// and `/otp/verify`, which proxy the FastAPI endpoints of the same name).
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  function goTo(redirectTo: string) {
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : redirectTo);
    router.refresh();
  }

  async function requestOtp(): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send the code.");
        return false;
      }
      setInfo(data.message ?? "If this email is registered, an OTP has been sent.");
      setResendIn(typeof data.resendAfter === "number" ? data.resendAfter : 30);
      return true;
    } catch {
      setError("Could not send the code - check your connection and try again.");
      return false;
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (await requestOtp()) {
        setOtp("");
        setStep("otp");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestOtp();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not verify the code.");
        return;
      }
      goTo(data.redirectTo);
    } catch {
      setError("Could not verify the code - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setOtp("");
    setError(null);
    setInfo(null);
    setResendIn(0);
  }

  if (step === "otp") {
    return (
      <div className={styles.page}>
        <form className={styles.card} onSubmit={handleOtpSubmit}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>HS</span>
            <span>HumSetu</span>
          </div>
          <h1 className={styles.title}>Enter verification code</h1>
          <p className={styles.subtitle}>{info ?? `We sent a code to ${email}.`}</p>

          <label className={styles.field}>
            <span>One-time code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={submitting || otp.length !== 6}>
            {submitting ? "Verifying..." : "Verify & sign in"}
          </button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleResend}
            disabled={submitting || resendIn > 0}
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
          <button type="button" className={styles.linkButton} onClick={handleChangeEmail}>
            Change email address
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleEmailSubmit}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>HS</span>
          <span>HumSetu</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Enter your registered email address to get a one-time code.</p>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className={styles.submitButton} disabled={submitting || !email.trim()}>
          {submitting ? "Sending code..." : "Send code"}
        </button>
      </form>
    </div>
  );
}
