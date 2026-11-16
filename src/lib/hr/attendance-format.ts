// Display helpers safe to import from client components (no server-only deps).

export function fmtDuration(min: number | null | undefined): string {
  if (min === null || min === undefined) return "-";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

export function fmtDurationMs(ms: number): string {
  return fmtDuration(Math.max(0, Math.floor(ms / 60000)));
}

// Dates arrive as YYYY-MM-DD and are formatted in UTC so server and browser
// render identical text regardless of timezone.
export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}
