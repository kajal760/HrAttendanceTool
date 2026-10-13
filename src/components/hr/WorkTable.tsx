"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, ProjectRollupStatus, WorkTask, WorkTaskStatus } from "@/types/work";
import { STATUS_FILTERS, displayStatus, projectStatus } from "@/lib/work/status";
import { useDepartmentNames } from "./useDepartmentNames";
import styles from "./ProjectBoard.module.css";

export type WorkTableKind = "projects" | "tasks" | "workload";

interface WorkTableProps {
  kind: WorkTableKind;
  projects: Project[];
  tasks: WorkTask[];
  employees: EmployeeOverview[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_OPTIONS: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];
const PROJECT_STATUS_OPTIONS: ProjectRollupStatus[] = ["Active", "Upcoming", "Delayed", "Completed"];

// A table cell that turns into an input on click. Enter or leaving the cell
// saves; Escape cancels. `onSave` returns whether the server accepted it.
function EditableCell({
  value,
  display,
  kind,
  options,
  onSave,
}: {
  value: string;
  display: string;
  kind: "text" | "date" | "select";
  options?: { value: string; label: string }[];
  onSave: (next: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        className={styles.editCell}
        title="Click to edit"
        onClick={() => {
          setDraft(value);
          setFailed(false);
          setEditing(true);
        }}
      >
        {display || "-"}
      </button>
    );
  }

  async function commit() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
    else setFailed(true);
  }

  const common = {
    autoFocus: true,
    disabled: saving,
    className: styles.editInput,
    onBlur: commit,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" && kind !== "select") commit();
      if (e.key === "Escape") setEditing(false);
    },
  };

  if (kind === "select") {
    return (
      <select {...common} value={draft} onChange={(e) => setDraft(e.target.value)}>
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <span className={styles.editWrap}>
      <input
        {...common}
        type={kind === "date" ? "date" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {failed && <span className={styles.editError}>Not saved</span>}
    </span>
  );
}

// The table view behind the Table button on the Projects, Tasks, and
// Workload pages. HR and managers can edit project name/department/deadline
// and task title/project/deadline/status inline. The employee summary is
// shown but stays employee-written.
export default function WorkTable({ kind, projects: initialProjects, tasks: initialTasks, employees }: WorkTableProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<WorkTask[]>(initialTasks);
  const { names: departmentNames, activeNames } = useDepartmentNames();

  // Server data arrives again after a refresh - take it as the new source.
  useEffect(() => setProjects(initialProjects), [initialProjects]);
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  // Filters - which fields apply depends on `kind` (see each branch below).
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const namesOf = (ids: string[]) => ids.map((id) => employeesById.get(id)?.name ?? id);
  const searchQuery = search.trim().toLowerCase();
  const hasFilters = Boolean(search || departmentFilter || projectFilter || statusFilter);

  function clearFilters() {
    setSearch("");
    setDepartmentFilter("");
    setProjectFilter("");
    setStatusFilter("");
  }

  const filterBar = (placeholder: string, options: { showProject?: boolean; showStatus?: { value: string; label: string }[] }) => (
    <div className={styles.filterBar} style={{ marginBottom: 12 }}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {options.showProject && (
        <select className={styles.filterSelect} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project">
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
      <select className={styles.filterSelect} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
        <option value="">All departments</option>
        {departmentNames.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      {options.showStatus && (
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {options.showStatus.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}
      {hasFilters && (
        <button type="button" className={styles.clearFilters} onClick={clearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );

  async function patch(url: string, body: Record<string, unknown>): Promise<unknown | null> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  }

  async function saveProject(id: string, body: Record<string, unknown>): Promise<boolean> {
    const data = (await patch(`/api/superadmin/work/projects/${id}`, body)) as { project: Project } | null;
    if (!data) return false;
    setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
    return true;
  }

  async function saveTask(id: string, body: Record<string, unknown>): Promise<boolean> {
    const data = (await patch(`/api/superadmin/work/tasks/${id}`, body)) as { task: WorkTask } | null;
    if (!data) return false;
    setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    return true;
  }

  if (kind === "projects") {
    const departmentOptions = [
      { value: "", label: "No department" },
      ...activeNames.map((d) => ({ value: d, label: d })),
    ];
    const filteredProjects = projects.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery)) return false;
      if (departmentFilter && (p.departmentName ?? "") !== departmentFilter) return false;
      if (statusFilter && projectStatus(p, tasks) !== statusFilter) return false;
      return true;
    });
    return (
      <div>
        {filterBar("Search projects...", {
          showStatus: PROJECT_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
        })}
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Project</th>
              <th>Department</th>
              <th>Assigned to</th>
              <th>Tasks</th>
              <th>Completed</th>
              <th>Overdue</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const pt = tasks.filter((t) => t.projectId === p.id);
              const overdue = pt.filter((t) => displayStatus(t) === "Overdue").length;
              return (
                <tr key={p.id}>
                  <td>
                    <EditableCell
                      kind="text"
                      value={p.name}
                      display={p.name}
                      onSave={(next) => (next.trim() ? saveProject(p.id, { name: next.trim() }) : Promise.resolve(false))}
                    />
                  </td>
                  <td>
                    <EditableCell
                      kind="select"
                      value={p.departmentName ?? ""}
                      display={p.departmentName ?? "No department"}
                      options={departmentOptions}
                      onSave={(next) => saveProject(p.id, { departmentName: next })}
                    />
                  </td>
                  <td>{p.memberIds.length ? namesOf(p.memberIds).join(", ") : "-"}</td>
                  <td>{pt.length}</td>
                  <td>{pt.filter((t) => t.status === "Completed").length}</td>
                  <td className={overdue > 0 ? styles.overdue : undefined}>{overdue}</td>
                  <td>
                    <EditableCell
                      kind="date"
                      value={p.deadline ?? ""}
                      display={p.deadline ? formatDate(p.deadline) : ""}
                      onSave={(next) => saveProject(p.id, { deadline: next || null })}
                    />
                  </td>
                  <td>{projectStatus(p, tasks)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredProjects.length === 0 && (
          <div className={styles.empty}>{projects.length === 0 ? "No projects yet." : "No projects match these filters."}</div>
        )}
        </div>
      </div>
    );
  }

  if (kind === "tasks") {
    const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
    const statusOptions = STATUS_OPTIONS.map((s) => ({ value: s, label: s }));
    const filteredTasks = tasks.filter((t) => {
      const project = projectsById.get(t.projectId);
      if (searchQuery) {
        const assigneeNames = namesOf(t.assigneeIds).join(" ").toLowerCase();
        if (!(t.title.toLowerCase().includes(searchQuery) || assigneeNames.includes(searchQuery))) return false;
      }
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (departmentFilter && (project?.departmentName ?? "") !== departmentFilter) return false;
      if (statusFilter && displayStatus(t) !== statusFilter) return false;
      return true;
    });
    return (
      <div>
        {filterBar("Search task or assignee...", {
          showProject: true,
          showStatus: STATUS_FILTERS.map((s) => ({ value: s, label: s })),
        })}
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Department</th>
              <th>Assignees</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Blocked by</th>
              <th>Mentioned</th>
              <th>Employee summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((t) => {
              const project = projectsById.get(t.projectId);
              const status = displayStatus(t);
              const blocker = t.dependsOnTaskId ? tasksById.get(t.dependsOnTaskId) : undefined;
              return (
                <tr key={t.id}>
                  <td>
                    <EditableCell
                      kind="text"
                      value={t.title}
                      display={t.title}
                      onSave={(next) => (next.trim() ? saveTask(t.id, { title: next.trim() }) : Promise.resolve(false))}
                    />
                  </td>
                  <td>
                    <EditableCell
                      kind="select"
                      value={t.projectId}
                      display={project?.name ?? "Unlinked"}
                      options={projectOptions}
                      onSave={(next) => saveTask(t.id, { projectId: next })}
                    />
                  </td>
                  <td>{project?.departmentName ?? "-"}</td>
                  <td>{t.assigneeIds.length ? namesOf(t.assigneeIds).join(", ") : "-"}</td>
                  <td className={status === "Overdue" ? styles.overdue : undefined}>
                    <EditableCell
                      kind="date"
                      value={t.deadline}
                      display={formatDate(t.deadline)}
                      onSave={(next) => (next ? saveTask(t.id, { deadline: next }) : Promise.resolve(false))}
                    />
                  </td>
                  <td>
                    <EditableCell
                      kind="select"
                      value={t.status}
                      display={status}
                      options={statusOptions}
                      onSave={(next) => saveTask(t.id, { status: next })}
                    />
                  </td>
                  <td>{blocker?.title ?? "-"}</td>
                  <td>{t.mentionedIds?.length ? namesOf(t.mentionedIds).join(", ") : "-"}</td>
                  <td className={styles.summaryCell}>
                    {t.summary ? (
                      <>
                        <span>{t.summary}</span>
                        {t.summaryUpdatedAt && <span className={styles.muted}> · {formatDate(t.summaryUpdatedAt)}</span>}
                      </>
                    ) : (
                      <span className={styles.muted}>No update yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className={styles.empty}>{tasks.length === 0 ? "No tasks yet." : "No tasks match these filters."}</div>
        )}
        </div>
      </div>
    );
  }

  const allRows = employees.map((e) => {
    const mine = tasks.filter((t) => t.assigneeIds.includes(e.id));
    return {
      id: e.id,
      name: e.name,
      department: e.department,
      designation: e.designation,
      projectIds: projects.filter((p) => p.memberIds.includes(e.id)).map((p) => p.id),
      total: mine.length,
      ongoing: mine.filter((t) => displayStatus(t) === "Ongoing").length,
      pending: mine.filter((t) => displayStatus(t) === "Pending").length,
      completed: mine.filter((t) => t.status === "Completed").length,
      overdue: mine.filter((t) => displayStatus(t) === "Overdue").length,
    };
  });

  const rows = allRows.filter((r) => {
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery)) return false;
    if (departmentFilter && r.department !== departmentFilter) return false;
    if (projectFilter && !r.projectIds.includes(projectFilter)) return false;
    return true;
  });

  return (
    <div>
      {filterBar("Search employee...", { showProject: true })}
      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Projects</th>
            <th>Total tasks</th>
            <th>Ongoing</th>
            <th>Pending</th>
            <th>Completed</th>
            <th>Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={styles.strong}>{r.name}</td>
              <td>{r.department}</td>
              <td>{r.designation}</td>
              <td>{r.projectIds.length}</td>
              <td>{r.total}</td>
              <td>{r.ongoing}</td>
              <td>{r.pending}</td>
              <td>{r.completed}</td>
              <td className={r.overdue > 0 ? styles.overdue : undefined}>{r.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className={styles.empty}>{allRows.length === 0 ? "No employees yet." : "No employees match these filters."}</div>
      )}
      </div>
    </div>
  );
}
