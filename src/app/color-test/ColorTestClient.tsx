"use client";

import { useState, type CSSProperties } from "react";
import ProfileHeader from "@/components/employee/profile/ProfileHeader";
import PersonalDetails from "@/components/employee/profile/PersonalDetails";
import ContactDetails from "@/components/employee/profile/ContactDetails";
import WorkDetails from "@/components/employee/profile/WorkDetails";
import SectionCard from "@/components/employee/SectionCard";
import { MOCK_EMPLOYEE, MOCK_MANAGER_NAME } from "./mock-employee";
import styles from "./color-test.module.css";

// Every token the real Profile page actually renders with, so dragging a
// swatch here shows exactly what changing it in globals.css would do.
const TOKENS: { key: string; label: string; fallback: string }[] = [
  { key: "--color-bg", label: "Page background", fallback: "#f5f6f8" },
  { key: "--color-surface", label: "Card surface", fallback: "#ffffff" },
  { key: "--color-border", label: "Border", fallback: "#e3e6ea" },
  { key: "--color-text", label: "Text", fallback: "#1a1d21" },
  { key: "--color-text-muted", label: "Muted text", fallback: "#666d76" },
  { key: "--color-primary", label: "Primary (Edit button, links)", fallback: "#4a3aa7" },
  { key: "--color-primary-contrast", label: "Primary contrast (button text)", fallback: "#ffffff" },
  { key: "--color-info", label: "Info (skill chips)", fallback: "#4a3aa7" },
  { key: "--color-info-bg", label: "Info background", fallback: "#ece9fb" },
  { key: "--color-success", label: "Success (Active badge)", fallback: "#1a8a4a" },
  { key: "--color-success-bg", label: "Success background", fallback: "#e7f6ec" },
  { key: "--color-danger", label: "Danger", fallback: "#c62828" },
  { key: "--color-danger-bg", label: "Danger background", fallback: "#fbeaea" },
];

function defaults(): Record<string, string> {
  return Object.fromEntries(TOKENS.map((t) => [t.key, t.fallback]));
}

export default function ColorTestClient() {
  const [values, setValues] = useState<Record<string, string>>(defaults);

  function setToken(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }
  function resetAll() {
    setValues(defaults());
  }

  // Setting CSS custom properties on this wrapper makes every `var(--color-x)`
  // used by the real Profile components below pick them up via normal CSS
  // inheritance - no edits to globals.css needed to experiment.
  const scopedVars = values as unknown as CSSProperties;

  return (
    <div>
      <div className={styles.banner}>
        <strong>Color test sandbox</strong> - not a real route, reuses the actual Profile
        components below. Delete <code>src/app/color-test/</code> when you're done.
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsHeader}>
          <h2 className={styles.controlsTitle}>Color tokens</h2>
          <button type="button" className={styles.resetBtn} onClick={resetAll}>
            Reset to current theme
          </button>
        </div>
        <div className={styles.swatchGrid}>
          {TOKENS.map((t) => (
            <label key={t.key} className={styles.swatch}>
              <input
                type="color"
                value={values[t.key]}
                onChange={(e) => setToken(t.key, e.target.value)}
              />
              <span className={styles.swatchText}>
                <span className={styles.swatchLabel}>{t.label}</span>
                <code className={styles.swatchVar}>{t.key}</code>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={scopedVars} className={styles.preview}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Profile</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Your name and personal details.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <ProfileHeader employee={MOCK_EMPLOYEE} managerName={MOCK_MANAGER_NAME} />
        </div>

        <SectionCard title="Personal details">
          <PersonalDetails employee={MOCK_EMPLOYEE} />
        </SectionCard>

        <div style={{ height: 16 }} />

        <SectionCard title="Contact & emergency contact">
          <ContactDetails employee={MOCK_EMPLOYEE} />
        </SectionCard>

        <div style={{ height: 16 }} />

        <WorkDetails employee={MOCK_EMPLOYEE} managerName={MOCK_MANAGER_NAME} />
      </div>
    </div>
  );
}
