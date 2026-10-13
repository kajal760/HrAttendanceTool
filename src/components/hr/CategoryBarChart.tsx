import type { CategoryCount } from "@/types/hr";
import styles from "./CategoryBarChart.module.css";

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 14, right: 16, bottom: 26, left: 30 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MAX_BAR_WIDTH = 24;

// Fixed categorical slot order - validated for CVD separation/contrast
// against this app's surfaces (see globals.css's comment on these tokens).
// Each bar is a distinct request type (identity), so it gets its own slot
// by position, never cycled past 8 and never reassigned by value/rank.
const SERIES_VARS = [
  "--color-chart-series-1",
  "--color-chart-series-2",
  "--color-chart-series-3",
  "--color-chart-series-4",
  "--color-chart-series-5",
  "--color-chart-series-6",
  "--color-chart-series-7",
  "--color-chart-series-8",
];

function niceMax(value: number): number {
  if (value <= 0) return 4;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 50) return Math.ceil(value / 5) * 5;
  return Math.ceil(value / 10) * 10;
}

interface CategoryBarChartProps {
  data: CategoryCount[];
}

// A categorical bar chart: each bar is its own category (identity), so each
// gets a fixed, validated hue rather than sharing one accent color. A
// legend names every slot - direct x-axis labels supplement it, they don't
// replace it. 4px rounded data-ends, square at the baseline.
export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) return null;
  // Never cycle past slot 8 - a 9th category would collide with slot 1
  // under CVD. This chart only ever carries a handful of request types, so
  // in practice every bar gets its own slot; a muted fallback exists only
  // as a defensive floor, not an expected path.
  const colorFor = (i: number) => (i < SERIES_VARS.length ? `var(${SERIES_VARS[i]})` : "var(--color-chart-muted)");

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const baselineY = PAD.top + PLOT_H;
  const yFor = (value: number) => PAD.top + PLOT_H * (1 - value / max);

  const band = PLOT_W / data.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, band * 0.5);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      role="img"
      aria-label={`Bar chart of ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
    >
      {ticks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--color-chart-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--color-chart-muted)"
            >
              {Math.round(t)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = PAD.left + i * band + band / 2 - barWidth / 2;
        const y = yFor(d.value);
        const h = baselineY - y;
        const halfH = h / 2;
        const color = colorFor(i);
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color} />
            {/* Square off the bottom corners: an unrounded rect over the lower half. */}
            <rect x={x} y={y + halfH} width={barWidth} height={halfH} fill={color} />
            <rect
              x={PAD.left + i * band}
              y={PAD.top}
              width={band}
              height={PLOT_H}
              fill="transparent"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text
              x={PAD.left + i * band + band / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-chart-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Names every slot by color - the dependable identity channel. The x-axis
// labels above supplement this, they don't replace it (a reader shouldn't
// have to color-match to know what's plotted).
export function CategoryBarChartLegend({ data }: CategoryBarChartProps) {
  if (data.length < 2) return null;
  return (
    <div className={styles.legend}>
      {data.map((d, i) => (
        <span className={styles.legendItem} key={d.label}>
          <span className={styles.legendSwatch} style={{ background: `var(${SERIES_VARS[i] ?? "--color-chart-muted"})` }} />
          {d.label}
        </span>
      ))}
    </div>
  );
}
