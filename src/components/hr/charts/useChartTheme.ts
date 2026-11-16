"use client";

import { useEffect, useState } from "react";

// Reads this project's chart CSS variables (globals.css) so Chart.js canvases
// match the hand-rolled SVG charts and follow the OS light/dark switch.
export interface ChartTheme {
  series: string[];
  grid: string;
  muted: string;
  text: string;
  surface: string;
  accent: string;
}

const FALLBACK: ChartTheme = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  grid: "#d8e8fb",
  muted: "#5b728f",
  text: "#1a1d21",
  surface: "#ffffff",
  accent: "#2563eb",
};

function readTheme(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    series: FALLBACK.series.map((fallback, i) => v(`--color-chart-series-${i + 1}`, fallback)),
    grid: v("--color-chart-grid", FALLBACK.grid),
    muted: v("--color-chart-muted", FALLBACK.muted),
    text: v("--color-text", FALLBACK.text),
    surface: v("--color-surface", FALLBACK.surface),
    accent: v("--color-hr-accent", FALLBACK.accent),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    setTheme(readTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(readTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return theme;
}
