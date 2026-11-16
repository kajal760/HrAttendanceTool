"use client";

import { useState } from "react";
import type { ApiLeaveType } from "@/lib/api/types";
import LeaveTypeManager from "./LeaveTypeManager";
import LeavePolicyForm from "./LeavePolicyForm";
import lifecycleStyles from "../lifecycle/Lifecycle.module.css";

interface LeavePoliciesViewProps {
  types: ApiLeaveType[];
  leaveYearStart: string;
}

// Leave Types and Policy Rules (the leave-year reset date) used to be
// separate tab pages - combined here behind tabs instead, since they're
// both "how leave is configured" rather than two unrelated sections.
export default function LeavePoliciesView({ types, leaveYearStart }: LeavePoliciesViewProps) {
  const [tab, setTab] = useState<"types" | "rules">("types");

  return (
    <>
      <div className={lifecycleStyles.tabStrip}>
        <button type="button" className={`${lifecycleStyles.tab} ${tab === "types" ? lifecycleStyles.tabActive : ""}`} onClick={() => setTab("types")}>
          Leave Types
        </button>
        <button type="button" className={`${lifecycleStyles.tab} ${tab === "rules" ? lifecycleStyles.tabActive : ""}`} onClick={() => setTab("rules")}>
          Policy Rules
        </button>
      </div>

      {tab === "types" && <LeaveTypeManager initialTypes={types} />}
      {tab === "rules" && <LeavePolicyForm leaveYearStart={leaveYearStart} />}
    </>
  );
}
