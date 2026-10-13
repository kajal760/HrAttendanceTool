import type { WorkTaskDisplayStatus, WorkTaskSummary, WorkTaskWithProject } from "@/types/work";
import { STATUS_FILTERS, displayStatus, progressFor } from "@/lib/work/status";
import styles from "./TaskSummaryList.module.css";

const BADGE_CLASS: Record<WorkTaskDisplayStatus, string> = {
  Pending: "badge-pending",
  Ongoing: "badge-ongoing",
  Completed: "badge-completed",
  Overdue: "badge-overdue",
};

function formatDueDate(deadline: string): string {
  return new Date(deadline).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function TaskRow({ task }: { task: WorkTaskWithProject }) {
  const status = displayStatus(task);
  const progress = progressFor(task);
  return (
    <div className={styles.task}>
      <div className={styles.taskTop}>
        <div>
          <div className={styles.taskTitle}>{task.title}</div>
          <div className={styles.taskProject}>{task.projectName}</div>
        </div>
        <span className={`${styles.badge} ${styles[BADGE_CLASS[status]]}`}>{status}</span>
      </div>
      <div className={styles.taskMeta}>
        <div
          className={styles.track}
          role="progressbar"
          aria-label={`${task.title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
        <span>{progress}%</span>
        <span>&middot;</span>
        <span>Due {formatDueDate(task.deadline)}</span>
      </div>
    </div>
  );
}

export default function TaskSummaryList({ counts, recentTasks }: WorkTaskSummary) {
  return (
    <div>
      <div className={styles.statusRow}>
        {STATUS_FILTERS.map((status) => (
          <div className={styles.statusChip} key={status}>
            <span className={styles.statusCount}>{counts[status]}</span>
            <span className={styles.statusLabel}>{status}</span>
          </div>
        ))}
      </div>
      <div className={styles.taskList}>
        {recentTasks.map((task) => (
          <TaskRow task={task} key={task.id} />
        ))}
      </div>
    </div>
  );
}
