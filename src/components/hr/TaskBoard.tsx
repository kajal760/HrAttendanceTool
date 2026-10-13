"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, ChevronDown } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkTask, WorkTaskDisplayStatus, WorkTaskStatus } from "@/types/work";
import { STATUS_FILTERS, displayStatus, progressFor } from "@/lib/work/status";
import TaskFormModal from "./TaskFormModal";
import styles from "./TaskBoard.module.css";

const STATUS_OPTIONS: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];

const BADGE_CLASS: Record<WorkTaskDisplayStatus, string> = {
  Pending: "badge-pending",
  Ongoing: "badge-ongoing",
  Completed: "badge-completed",
  Overdue: "badge-overdue",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TaskBoardProps {
  tasks: WorkTask[];
  projects: Project[];
  employees: EmployeeOverview[];
}

export default function TaskBoard({ tasks: initialTasks, projects, employees }: TaskBoardProps) {
  const [tasks, setTasks] = useState<WorkTask[]>(initialTasks);
  const [filter, setFilter] = useState<WorkTaskDisplayStatus | "All">("All");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // In scope for the project/search filters, before the status pills narrow
  // it further - so "All (N)" and each pill's count reflect that scope too.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (q) {
        const assigneeNames = t.assigneeIds.map((id) => employeesById.get(id)?.name ?? "").join(" ").toLowerCase();
        if (!(t.title.toLowerCase().includes(q) || assigneeNames.includes(q))) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, search, employeesById]);

  const counts = useMemo(() => {
    const c: Record<WorkTaskDisplayStatus, number> = { Pending: 0, Ongoing: 0, Completed: 0, Overdue: 0 };
    for (const task of scoped) c[displayStatus(task)] += 1;
    return c;
  }, [scoped]);

  const filtered = useMemo(() => {
    if (filter === "All") return scoped;
    return scoped.filter((t) => displayStatus(t) === filter);
  }, [scoped, filter]);

  const hasFieldFilters = Boolean(projectFilter || search);

  function openAdd() {
    setEditingTask(null);
    setModalMode("add");
  }

  function openEdit(task: WorkTask) {
    setEditingTask(task);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingTask(null);
  }

  function handleSaved(task: WorkTask) {
    setTasks((prev) => (modalMode === "add" ? [task, ...prev] : prev.map((t) => (t.id === task.id ? task : t))));
    closeModal();
  }

  async function handleStatusChange(task: WorkTask, status: WorkTaskStatus) {
    setStatusSaving(task.id);
    try {
      const res = await fetch(`/api/superadmin/work/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }
    } finally {
      setStatusSaving(null);
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filterRow}>
          <button
            type="button"
            className={`${styles.filterButton} ${filter === "All" ? styles.filterButtonActive : ""}`}
            onClick={() => setFilter("All")}
          >
            All ({tasks.length})
          </button>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={`${styles.filterButton} ${filter === status ? styles.filterButtonActive : ""}`}
              onClick={() => setFilter(status)}
            >
              {status} ({counts[status]})
            </button>
          ))}
        </div>
        <button type="button" className={styles.addButton} onClick={openAdd}>
          <Plus size={14} strokeWidth={2.25} />
          Add task
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search task or assignee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {hasFieldFilters && (
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => {
              setProjectFilter("");
              setSearch("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && <p className={styles.empty}>No tasks in this view.</p>}
        {filtered.map((task) => {
          const project = projectsById.get(task.projectId);
          const status = displayStatus(task);
          const isExpanded = expandedId === task.id;

          return (
            <div className={styles.card} key={task.id}>
              <div className={styles.cardTop} onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                <div className={styles.titleBlock}>
                  <span className={styles.title}>{task.title}</span>
                  <span className={styles.project}>
                    {project?.name ?? "Unassigned project"}
                    {project?.departmentName ? ` · ${project.departmentName}` : ""}
                  </span>
                </div>
                <div className={styles.avatarStack}>
                  {task.assigneeIds.map((id) => {
                    const emp = employeesById.get(id);
                    return (
                      <span className={styles.avatar} key={id} title={emp?.name ?? id}>
                        {emp?.initials ?? "?"}
                      </span>
                    );
                  })}
                </div>
                <span className={`${styles.deadline} ${status === "Overdue" ? styles.deadlineOverdue : ""}`}>
                  Due {formatDate(task.deadline)}
                </span>
                <span className={`${styles.badge} ${styles[BADGE_CLASS[status]]}`}>{status}</span>
                <ChevronDown size={14} className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`} />
              </div>

              {isExpanded && (
                <div className={styles.details}>
                  {task.description && <p className={styles.description}>{task.description}</p>}
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${progressFor(task)}%` }} />
                  </div>

                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status</span>
                    <select
                      className={styles.statusSelect}
                      value={task.status}
                      disabled={statusSaving === task.id}
                      onChange={(e) => handleStatusChange(task, e.target.value as WorkTaskStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {task.dependsOnTaskId && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Blocked by</span>
                      <p className={styles.summaryText}>
                        {tasksById.get(task.dependsOnTaskId)?.title ?? "Unknown task"}
                        {" "}
                        ({tasksById.get(task.dependsOnTaskId) ? displayStatus(tasksById.get(task.dependsOnTaskId)!) : "?"})
                      </p>
                    </div>
                  )}

                  {task.mentionedIds && task.mentionedIds.length > 0 && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Mentioned</span>
                      <div className={styles.mentionChips}>
                        {task.mentionedIds.map((id) => (
                          <span className={styles.mentionChip} key={id}>
                            {employeesById.get(id)?.name ?? id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Summary from assignee</span>
                    <p className={styles.summaryText}>
                      {task.summary?.trim() ? task.summary : <span className={styles.muted}>No summary written yet.</span>}
                    </p>
                  </div>

                  <button type="button" className={styles.editTaskButton} onClick={() => openEdit(task)}>
                    <Pencil size={12} strokeWidth={2.25} />
                    Edit task
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalMode && (
        <TaskFormModal
          mode={modalMode}
          task={modalMode === "edit" ? (editingTask ?? undefined) : undefined}
          projects={projects}
          employees={employees}
          tasks={tasks}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
