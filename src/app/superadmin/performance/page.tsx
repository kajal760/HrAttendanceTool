import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import ComingSoon from "@/components/hr/ComingSoon";

export const metadata: Metadata = {
  title: "Performance | HR Attendance",
};

export default function PerformancePage() {
  return <ComingSoon icon={TrendingUp} title="Performance / PMS" />;
}
