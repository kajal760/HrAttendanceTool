"use client";

import { useState } from "react";
import type { WorkTask } from "@/types/work";
import TimesheetEntryForm from "./TimesheetEntryForm";
import TimesheetEntryList from "./TimesheetEntryList";

interface TimesheetPanelProps {
  myEmployeeId: string;
  myTasks: WorkTask[];
  employeeNames: Record<string, string>;
  taskTitles: Record<string, string>;
}

// Small client wrapper so saving a new entry (the form) can refresh the
// list below it without making the whole page a client component.
export default function TimesheetPanel({ myEmployeeId, myTasks, employeeNames, taskTitles }: TimesheetPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <TimesheetEntryForm myTasks={myTasks} onSaved={() => setRefreshKey((k) => k + 1)} />
      <div style={{ marginTop: 20 }}>
        <TimesheetEntryList
          myEmployeeId={myEmployeeId}
          employeeNames={employeeNames}
          taskTitles={taskTitles}
          refreshKey={refreshKey}
        />
      </div>
    </>
  );
}
