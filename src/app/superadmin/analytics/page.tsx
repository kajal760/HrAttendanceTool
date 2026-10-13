import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import ComingSoon from "@/components/hr/ComingSoon";

export const metadata: Metadata = {
  title: "Analytics | HR Attendance",
};

export default function AnalyticsPage() {
  return <ComingSoon icon={BarChart3} title="Analytics" />;
}
