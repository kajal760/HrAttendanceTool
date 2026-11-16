"use client";

import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";
import {
  CalendarCheck,
  HeartPulse,
  Timer,
  ShieldCheck,
  Cake,
  Award,
  MapPin,
  Baby,
  Users2,
  type LucideIcon,
} from "lucide-react";
import type { LeaveTypeBalance } from "@/types/employee";
import { LEAVE_WARNING_THRESHOLD } from "@/lib/hr/leave-balance";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";
import styles from "./LeaveCategoryDonutGrid.module.css";

ChartJS.register(ArcElement, Tooltip);

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Casual Leave": CalendarCheck,
  "Sick Leave": HeartPulse,
  "Compensatory Leave": Timer,
  "Mandatory Leave": ShieldCheck,
  "Birthday Leave": Cake,
  "Work Anniversary Leave": Award,
  "Regional Leave": MapPin,
  "Maternity Leave": Baby,
  "Paternity Leave": Users2,
};

interface LeaveCategoryDonutGridProps {
  items: LeaveTypeBalance[];
}

// The Leave summary, as a 3x3 grid of per-category pie-chart cards - one
// pie per leave type showing used-vs-remaining, instead of a single bar
// chart. Categories with no fixed allocation (Leave Without Pay: 0 days)
// have no meaningful split to chart, so they're left out; that's exactly
// the 9 remaining categories, hence the 3x3 shape.
export default function LeaveCategoryDonutGrid({ items }: LeaveCategoryDonutGridProps) {
  const theme = useChartTheme();
  const charted = items.filter((item) => item.allocated > 0);

  return (
    <div className={styles.grid}>
      {charted.map((item) => {
        const Icon = CATEGORY_ICONS[item.type];
        const percent = Math.round((item.used / item.allocated) * 100);
        const tone = percent >= LEAVE_WARNING_THRESHOLD ? "critical" : percent >= 60 ? "warning" : "normal";
        const sliceColor = tone === "critical" ? "#ef4444" : tone === "warning" ? "#f59e0b" : theme.accent;

        return (
          <div key={item.type} className={styles.card}>
            <div className={styles.cardHeader}>
              {Icon && <Icon size={15} strokeWidth={2} className={styles.cardIcon} />}
              <span className={styles.cardLabel}>{item.type}</span>
              <span className={styles.cardPercent}>{percent}%</span>
            </div>
            <div className={styles.donutBox}>
              <Pie
                data={{
                  labels: ["Used", "Remaining"],
                  datasets: [
                    {
                      data: [item.used, item.remaining],
                      backgroundColor: [sliceColor, theme.grid],
                      borderColor: theme.surface,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed} day${ctx.parsed === 1 ? "" : "s"}`,
                      },
                    },
                  },
                }}
              />
            </div>
            <div className={styles.cardFooter}>
              {item.used} of {item.allocated} days
            </div>
          </div>
        );
      })}
    </div>
  );
}
