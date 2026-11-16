// Training module – full type definitions (backed by real FastAPI endpoints).
// String values match the backend's StrEnum values so responses pass through
// without remapping.

export type TrainingCategory =
  | "Technical"
  | "Soft Skills"
  | "Compliance"
  | "Security"
  | "Leadership"
  | "Other";

export type TrainingMode = "Online" | "Offline" | "Hybrid";

export type TrainingStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Overdue";

export type TrainingAttendance = "Present" | "Absent" | "Partial";

export type TrainingPriority = "High" | "Medium" | "Low";

export const TRAINING_CATEGORIES: TrainingCategory[] = [
  "Technical",
  "Soft Skills",
  "Compliance",
  "Security",
  "Leadership",
  "Other",
];

export const TRAINING_MODES: TrainingMode[] = ["Online", "Offline", "Hybrid"];

export const TRAINING_STATUSES: TrainingStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Overdue",
];

export const TRAINING_ATTENDANCES: TrainingAttendance[] = [
  "Present",
  "Absent",
  "Partial",
];

export const TRAINING_PRIORITIES: TrainingPriority[] = [
  "High",
  "Medium",
  "Low",
];

// Keep for backward-compat with TrainingPanel (assigned-by choices)
export type TrainingAssignedBy = "HR" | "Manager";
export const TRAINING_ASSIGNED_BY: TrainingAssignedBy[] = ["HR", "Manager"];

export interface TrainingProgramme {
  id: string;
  trainingRef: string;
  name: string;
  category: TrainingCategory;
  description?: string;
  trainerName?: string;
  mode: TrainingMode;
  provider?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  durationHours?: number;
  cost?: number;
  isActive: boolean;
  assignmentCount: number;
}

export interface EmployeeTraining {
  id: string;
  programmeId: string;
  programmeName: string;
  trainingRef: string;
  category: TrainingCategory;
  mode: TrainingMode;
  trainerName?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  durationHours?: number;

  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;

  assignedDate: string;
  assignedBy?: string;
  dueDate?: string;
  priority: TrainingPriority;
  status: TrainingStatus;
  progress: number; // 0–100
  attendance?: TrainingAttendance;
  assessmentScore?: number;
  feedback?: string;
  trainerRemarks?: string;
  completionDate?: string;

  certificateName?: string;
  certificateRef?: string;
  certIssueDate?: string;
  certExpiryDate?: string;
  hasCertificateFile: boolean;
  certFileName?: string;
  certVerificationLink?: string;
}

export interface TrainingDashboard {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  notStarted: number;
}
