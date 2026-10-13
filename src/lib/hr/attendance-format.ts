// Display helpers safe to import from client components (no server-only deps).

export function fmtDuration(min: number | null): string {
  if (min === null) return "-";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
