import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
}

// For a module that's in the nav (per the BRD) but not built out yet -
// shown only on a direct URL visit, since the sidebar/secondary-nav entries
// for these are disabled and don't link here at all.
export default function ComingSoon({ icon: Icon, title }: ComingSoonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
      <Icon size={36} strokeWidth={1.5} color="var(--color-text-muted)" />
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, maxWidth: 360 }}>
        This module is coming soon.
      </p>
    </div>
  );
}
