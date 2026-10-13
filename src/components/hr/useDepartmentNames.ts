"use client";

import { useEffect, useState } from "react";

export interface DepartmentNameLists {
  // Every name in use (registry + employee records) - for filters.
  names: string[];
  // Non-archived registry departments - for choosing where someone goes.
  activeNames: string[];
}

const EMPTY: DepartmentNameLists = { names: [], activeNames: [] };

// Shared department list for filters and department pickers. Fetched on
// mount, so a department created anywhere shows up the next time a screen
// that uses it opens.
export function useDepartmentNames(): DepartmentNameLists {
  const [lists, setLists] = useState<DepartmentNameLists>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/superadmin/departments")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setLists({ names: data.names ?? [], activeNames: data.activeNames ?? [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return lists;
}
