import type { Metadata } from "next";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings | HumSetu",
};

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", textAlign: "center" }}>
      <Settings size={32} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
      <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Settings</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
        System and module settings are coming soon.
      </p>
    </div>
  );
}
