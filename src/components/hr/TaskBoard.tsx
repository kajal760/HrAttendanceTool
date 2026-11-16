"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Plus } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkPriority, WorkTask, WorkTaskStatus } from "@/types/work";
import { isOverdue } from "@/lib/work/status";
import TaskFormModal from "./TaskFormModal";
import styles from "./TaskBoard.module.css";

const COLUMNS: { key: WorkTaskStatus; label: string }[] = [
  { key: "Pending", label: "To Do" },
  { key: "Ongoing", label: "In Progress" },
  { key: "Completed", label: "Done" },
];

const PRIORITY_DOT: Record<WorkPriority, string> = {
  High: "var(--color-danger)",
  Medium: "var(--color-warning)",
  Low: "var(--color-info)",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TaskBoardProps {
  tasks: WorkTask[];
  projects: Project[];
  employees: EmployeeOverview[];
}

// A real Kanban: 3 columns, one per *stored* status (Pending/Ongoing/
// Completed) - drag a card between them to change its status. "Overdue"
// isn't a 4th column because it isn't a status you can be in; it's a flag
// derived from deadline vs. today (see `lib/work/status.ts`), so an overdue
// task just shows a red marker wherever its real status already puts it.
export default function TaskBoard({ tasks: initialTasks, projects, employees }: TaskBoardProps) {
  const [tasks, setTasks] = useState<WorkTask[]>(initialTasks);
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkTaskStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(() => {
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

  const byColumn = useMemo(() => {
    const map = new Map<WorkTaskStatus, WorkTask[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const t of filtered) map.get(t.status)?.push(t);
    return map;
  }, [filtered]);

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

  async function moveTask(taskId: string, status: WorkTaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    setMovingId(taskId);
    try {
      const res = await fetch(`/api/superadmin/work/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } finally {
      setMovingId(null);
    }
  }

  function onCardDragStart(e: DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onColumnDrop(e: DragEvent, status: WorkTaskStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) void moveTask(taskId, status);
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filterBar} style={{ marginBottom: 0, flex: 1 }}>
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
        <button type="button" className={styles.addButton} onClick={openAdd}>
          <Plus size={14} strokeWidth={2.25} />
          Add task
        </button>
      </div>

      <div className={styles.kanban}>
        {COLUMNS.map((col) => {
          const colTasks = byColumn.get(col.key) ?? [];
          return (
            <div
              key={col.key}
              className={`${styles.column} ${dragOverColumn === col.key ? styles.columnDragOver : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.key);
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
              onDrop={(e) => onColumnDrop(e, col.key)}
            >
              <div className={styles.columnHeader}>
                <span>{col.label}</span>
                <span className={styles.columnCount}>{colTasks.length}</span>
              </div>
              <div className={styles.columnBody}>
                {colTasks.map((task) => {
                  const project = projectsById.get(task.projectId);
                  const overdue = isOverdue(task);
                  return (
                    <div
                      key={task.id}
                      className={`${styles.kanbanCard} ${overdue ? styles.kanbanCardOverdue : ""} ${movingId === task.id ? styles.kanbanCardMoving : ""}`}
                      draggable
                      onDragStart={(e) => onCardDragStart(e, task.id)}
                      onClick={() => openEdit(task)}
                    >
                      <div className={styles.kanbanCardTop}>
                        <span className={styles.priorityDot} style={{ background: PRIORITY_DOT[task.priority] }} />
                        <span className={styles.kanbanTitle}>{task.title}</span>
                      </div>
                      <span className={styles.kanbanProject}>{project?.name ?? "Unassigned project"}</span>
                      <div className={styles.kanbanCardBottom}>
                        <span className={`${styles.kanbanDeadline} ${overdue ? styles.deadlineOverdue : ""}`}>
                          {overdue ? "Overdue · " : ""}
                          {formatDate(task.deadline)}
                        </span>
                        <div className={styles.avatarStack}>
                          {task.assigneeIds.slice(0, 3).map((id) => {
                            const emp = employeesById.get(id);
                            return (
                              <span className={styles.avatar} key={id} title={emp?.name ?? id}>
                                {emp?.initials ?? "?"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && <p className={styles.columnEmpty}>No tasks here.</p>}
              </div>
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
