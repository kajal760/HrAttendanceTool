import type { LucideIcon } from "lucide-react";

export type StatTileTone = "info" | "success" | "warning" | "danger" | "accent" | "neutral";

const TONE_COLORS: Record<StatTileTone, { fg: string; bg: string }> = {
  info: { fg: "var(--color-info)", bg: "var(--color-info-bg)" },
  success: { fg: "var(--color-success)", bg: "var(--color-success-bg)" },
  warning: { fg: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  danger: { fg: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  accent: { fg: "var(--color-hr-accent)", bg: "var(--color-hr-accent-bg)" },
  // Not every status is good/bad/attention - "Retired" just is what it is,
  // so it gets the same muted treatment as a gray status badge rather than
  // being forced into one of the four meaning-bearing tones.
  neutral: { fg: "var(--color-text-muted)", bg: "var(--color-bg)" },
};

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatTileTone;
}

// Icon-boxed stat tile: label + value on the left, a soft-tinted icon box on
// the right. Tone reuses this app's existing status tokens (the `-bg` tint
// paired with its saturated foreground) rather than new colors, so the tile
// always carries an icon + text label alongside the color - never color alone.
export default function StatTile({ label, value, icon: Icon, tone }: StatTileProps) {
  const { fg, bg } = TONE_COLORS[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 18px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>{value}</div>
      </div>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: bg,
          color: fg,
        }}
      >
        <Icon size={19} strokeWidth={2.25} />
      </div>
    </div>
  );
}
