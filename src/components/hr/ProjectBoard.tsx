"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, ProjectRollupStatus, WorkPriority, WorkTask } from "@/types/work";
import { displayStatus, projectStatus } from "@/lib/work/status";
import { toneClass, type BadgeTone } from "./lifecycle/badge-tones";
import { useDepartmentNames } from "./useDepartmentNames";
import ProjectFormModal from "./ProjectFormModal";
import Pager from "@/components/employee/Pager";
import styles from "./ProjectBoard.module.css";

interface ProjectBoardProps {
  projects: Project[];
  tasks: WorkTask[];
  employees: EmployeeOverview[];
}

const PROJECT_STATUS_OPTIONS: ProjectRollupStatus[] = ["Active", "Upcoming", "Delayed", "Completed"];
const PAGE_SIZE = 6;

const PROJECT_STATUS_TONE: Record<ProjectRollupStatus, BadgeTone> = {
  Active: "blue",
  Completed: "green",
  Upcoming: "gray",
  Delayed: "red",
};

const PRIORITY_TONE: Record<WorkPriority, BadgeTone> = {
  High: "red",
  Medium: "amber",
  Low: "blue",
};

function formatDeadline(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

function initialsOf(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProjectBoard({ projects: initialProjects, tasks, employees }: ProjectBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectRollupStatus | "All">("All");
  const [page, setPage] = useState(0);
  const { names: departmentNames } = useDepartmentNames();

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const task of tasks) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  }, [tasks]);

  const namesOf = (ids: string[]) => ids.map((id) => employeesById.get(id)?.name ?? id);

  const hasFilters = Boolean(search || departmentFilter || statusFilter !== "All");

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (departmentFilter && (p.departmentName ?? "") !== departmentFilter) return false;
      if (statusFilter !== "All" && projectStatus(p, tasks) !== statusFilter) return false;
      return true;
    });
  }, [projects, tasks, search, departmentFilter, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [search, departmentFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pageProjects = filteredProjects.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function openAdd() {
    setEditingProject(null);
    setModalMode("add");
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingProject(null);
  }

  function handleSaved(project: Project) {
    setProjects((prev) =>
      modalMode === "add" ? [project, ...prev] : prev.map((p) => (p.id === project.id ? project : p)),
    );
    closeModal();
  }

  return (
    <div>
      <div className={styles.toolbar} style={{ justifyContent: "space-between" }}>
        <div className={styles.filterBar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {departmentNames.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectRollupStatus | "All")}
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            {PROJECT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className={styles.clearFilters}
              onClick={() => {
                setSearch("");
                setDepartmentFilter("");
                setStatusFilter("All");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <button type="button" className={styles.addButton} onClick={openAdd}>
          <Plus size={14} strokeWidth={2.25} />
          Add project
        </button>
      </div>

      <div className={styles.grid}>
        {pageProjects.map((project) => {
          const projectTasks = tasksByProject.get(project.id) ?? [];
          const completed = projectTasks.filter((t) => t.status === "Completed").length;
          const overdue = projectTasks.filter((t) => displayStatus(t) === "Overdue").length;
          const status = projectStatus(project, tasks);
          const progressPct = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
          const visibleMembers = project.memberIds.slice(0, 3);
          const overflowCount = project.memberIds.length - visibleMembers.length;

          return (
            <div className={styles.card} key={project.id}>
              <div className={styles.cardHeader}>
                <h3 className={styles.name}>{project.name}</h3>
                <button type="button" className={styles.editButton} onClick={() => openEdit(project)}>
                  <Pencil size={12} strokeWidth={2.25} />
                  Edit
                </button>
              </div>

              <div className={styles.badgeRow}>
                <span className={toneClass(styles, PROJECT_STATUS_TONE[status])}>{status}</span>
                <span className={toneClass(styles, PRIORITY_TONE[project.priority])}>{project.priority}</span>
              </div>

              {project.description && <p className={styles.description}>{project.description}</p>}

              <div className={styles.metaRow}>
                <span>{projectTasks.length} tasks</span>
                <span>&middot;</span>
                <span>{completed} completed</span>
                {overdue > 0 && (
                  <>
                    <span>&middot;</span>
                    <span className={styles.overdue}>{overdue} overdue</span>
                  </>
                )}
              </div>

              <div className={styles.progressRow}>
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              </div>

              <div className={styles.assignment}>
                <div className={styles.assignRow}>
                  <span className={styles.assignLabel}>Department</span>
                  <span className={styles.assignValue}>{project.departmentName ?? "Not set"}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                {project.memberIds.length === 0 ? (
                  <span className={styles.muted}>No one assigned yet</span>
                ) : (
                  <div className={styles.avatarStack}>
                    {namesOf(visibleMembers).map((n, i) => (
                      <span className={styles.avatar} key={i} title={n}>
                        {initialsOf(n)}
                      </span>
                    ))}
                    {overflowCount > 0 && <span className={styles.avatar}>+{overflowCount}</span>}
                  </div>
                )}
                {project.deadline && <span className={styles.dueDate}>Due: {formatDeadline(project.deadline)}</span>}
              </div>
            </div>
          );
        })}
        {filteredProjects.length === 0 && (
          <p className={styles.muted}>
            {projects.length === 0 ? "No projects yet." : "No projects match these filters."}
          </p>
        )}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {modalMode && (
        <ProjectFormModal
          mode={modalMode}
          project={modalMode === "edit" ? (editingProject ?? undefined) : undefined}
          employees={employees}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
