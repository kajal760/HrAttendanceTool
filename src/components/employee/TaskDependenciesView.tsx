import type { EmployeeOverview } from "@/types/hr";
import type { WorkTaskStatus, WorkTaskWithProject } from "@/types/work";
import type { BlockingEntry } from "@/lib/employee/task-dependencies";
import SectionCard from "./SectionCard";
import styles from "./TaskDependenciesView.module.css";

// The blocker is only ever resolved as {id, title, status} (no deadline),
// so "Overdue" can't be derived here - just the three stored statuses.
const BADGE_CLASS: Record<WorkTaskStatus, string> = {
  Pending: "badge-pending",
  Ongoing: "badge-ongoing",
  Completed: "badge-completed",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TaskDependenciesViewProps {
  blocked: WorkTaskWithProject[];
  blocking: BlockingEntry[];
  employees: EmployeeOverview[];
}

// Prerequisite/blocked tasks for the signed-in employee: which of their own
// tasks are waiting on something else ("Blocked"), and which of their tasks
// are themselves holding up someone else's work ("Blocking others").
export default function TaskDependenciesView({ blocked, blocking, employees }: TaskDependenciesViewProps) {
  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const namesOf = (ids: string[]) => ids.map((id) => employeesById.get(id)?.name ?? id).join(", ");

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Blocked" subtitle="Your tasks that are waiting on another task">
          {blocked.length === 0 ? (
            <p className={styles.empty}>None of your tasks are blocked right now.</p>
          ) : (
            <div className={styles.list}>
              {blocked.map((task) => {
                const blockerStatus = task.dependsOnTask!.status;
                return (
                  <div className={styles.row} key={task.id}>
                    <div className={styles.rowMain}>
                      <span className={styles.title}>{task.title}</span>
                      <span className={styles.meta}>
                        {task.projectName} &middot; Due {formatDate(task.deadline)}
                      </span>
                    </div>
                    <div className={styles.rowBlocker}>
                      <span className={styles.blockerLabel}>Blocked by</span>
                      <span className={styles.blockerTitle}>{task.dependsOnTask!.title}</span>
                      <span className={`${styles.badge} ${styles[BADGE_CLASS[blockerStatus]]}`}>{blockerStatus}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Blocking others" subtitle="Your tasks that other tasks are waiting on">
        {blocking.length === 0 ? (
          <p className={styles.empty}>None of your tasks are blocking anyone else right now.</p>
        ) : (
          <div className={styles.list}>
            {blocking.map(({ myTask, waitingTask }) => (
              <div className={styles.row} key={`${myTask.id}-${waitingTask.id}`}>
                <div className={styles.rowMain}>
                  <span className={styles.title}>{myTask.title}</span>
                  <span className={styles.meta}>is blocking</span>
                </div>
                <div className={styles.rowBlocker}>
                  <span className={styles.blockerTitle}>{waitingTask.title}</span>
                  <span className={styles.meta}>
                    {namesOf(waitingTask.assigneeIds)} &middot; Due {formatDate(waitingTask.deadline)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
