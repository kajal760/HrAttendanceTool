import { backend } from "@/lib/api/backend";
import type { ApiEmployeeTraining, ApiTrainingDashboard, ApiTrainingProgramme } from "@/lib/api/types";
import type {
  EmployeeTraining,
  TrainingDashboard,
  TrainingProgramme,
} from "@/types/training";

// Backed by the FastAPI `/training` endpoints.

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toProgramme(p: ApiTrainingProgramme): TrainingProgramme {
  return {
    id: p.id,
    trainingRef: p.trainingRef,
    name: p.name,
    category: p.category as TrainingProgramme["category"],
    description: p.description ?? undefined,
    trainerName: p.trainerName ?? undefined,
    mode: p.mode as TrainingProgramme["mode"],
    provider: p.provider ?? undefined,
    startDate: p.startDate ?? undefined,
    endDate: p.endDate ?? undefined,
    durationHours: p.durationHours ?? undefined,
    cost: p.cost ?? undefined,
    isActive: p.isActive,
    assignmentCount: p.assignmentCount,
  };
}

function toAssignment(a: ApiEmployeeTraining): EmployeeTraining {
  return {
    id: a.id,
    programmeId: a.programmeId,
    programmeName: a.programmeName,
    trainingRef: a.trainingRef,
    category: a.category as EmployeeTraining["category"],
    mode: a.mode as EmployeeTraining["mode"],
    trainerName: a.trainerName ?? undefined,
    provider: a.provider ?? undefined,
    startDate: a.startDate ?? undefined,
    endDate: a.endDate ?? undefined,
    durationHours: a.durationHours ?? undefined,
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    department: a.department ?? undefined,
    designation: a.designation ?? undefined,
    assignedDate: a.assignedDate,
    assignedBy: a.assignedBy ?? undefined,
    dueDate: a.dueDate ?? undefined,
    priority: a.priority as EmployeeTraining["priority"],
    status: a.status as EmployeeTraining["status"],
    progress: a.progress,
    attendance: a.attendance as EmployeeTraining["attendance"] ?? undefined,
    assessmentScore: a.assessmentScore ?? undefined,
    feedback: a.feedback ?? undefined,
    trainerRemarks: a.trainerRemarks ?? undefined,
    completionDate: a.completionDate ?? undefined,
    certificateName: a.certificateName ?? undefined,
    certificateRef: a.certificateRef ?? undefined,
    certIssueDate: a.certIssueDate ?? undefined,
    certExpiryDate: a.certExpiryDate ?? undefined,
    hasCertificateFile: a.hasCertificateFile,
    certFileName: a.certFileName ?? undefined,
    certVerificationLink: a.certVerificationLink ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Training Programmes
// ---------------------------------------------------------------------------

export async function getTrainingProgrammes(includeInactive = false): Promise<TrainingProgramme[]> {
  return (
    await backend<ApiTrainingProgramme[]>("/training/programmes", {
      query: includeInactive ? { includeInactive: true } : undefined,
    })
  ).map(toProgramme);
}

export interface CreateProgrammeInput {
  name: string;
  category: string;
  description?: string;
  trainerName?: string;
  mode: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  durationHours?: number;
  cost?: number;
}

export async function createTrainingProgramme(input: CreateProgrammeInput): Promise<TrainingProgramme> {
  return toProgramme(
    await backend<ApiTrainingProgramme>("/training/programmes", {
      method: "POST",
      body: input,
    }),
  );
}

export async function updateTrainingProgramme(
  id: string,
  input: Partial<CreateProgrammeInput & { isActive: boolean }>,
): Promise<TrainingProgramme> {
  return toProgramme(
    await backend<ApiTrainingProgramme>(`/training/programmes/${id}`, {
      method: "PATCH",
      body: input,
    }),
  );
}

// ---------------------------------------------------------------------------
// Employee Training Assignments
// ---------------------------------------------------------------------------

export interface ListAssignmentsParams {
  employeeId?: string;
  status?: string;
  programmeId?: string;
}

export async function getTrainingAssignments(params: ListAssignmentsParams = {}): Promise<EmployeeTraining[]> {
  const query: Record<string, string> = {};
  if (params.employeeId) query.employeeId = params.employeeId;
  if (params.status) query.status = params.status;
  if (params.programmeId) query.programmeId = params.programmeId;
  return (
    await backend<ApiEmployeeTraining[]>("/training/assignments", {
      query: Object.keys(query).length ? query : undefined,
    })
  ).map(toAssignment);
}

export interface CreateAssignmentInput {
  programmeId: string;
  employeeId: string;
  assignedDate: string;
  assignedBy?: string;
  dueDate?: string;
  priority?: string;
}

export async function createTrainingAssignment(input: CreateAssignmentInput): Promise<EmployeeTraining> {
  return toAssignment(
    await backend<ApiEmployeeTraining>("/training/assignments", {
      method: "POST",
      body: input,
    }),
  );
}

export interface UpdateAssignmentInput {
  status?: string;
  progress?: number;
  attendance?: string;
  assessmentScore?: number;
  feedback?: string;
  trainerRemarks?: string;
  completionDate?: string;
  dueDate?: string;
  priority?: string;
  assignedBy?: string;
  certificateName?: string;
  certificateRef?: string;
  certIssueDate?: string;
  certExpiryDate?: string;
  certVerificationLink?: string;
}

export async function updateTrainingAssignment(
  id: string,
  input: UpdateAssignmentInput,
): Promise<EmployeeTraining> {
  return toAssignment(
    await backend<ApiEmployeeTraining>(`/training/assignments/${id}`, {
      method: "PATCH",
      body: input,
    }),
  );
}

export async function uploadCertificate(id: string, file: File): Promise<EmployeeTraining> {
  const form = new FormData();
  form.append("file", file);
  return toAssignment(
    await backend<ApiEmployeeTraining>(`/training/assignments/${id}/certificate`, {
      method: "POST",
      form,
    }),
  );
}

export function getCertificateDownloadUrl(assignmentId: string): string {
  const { BACKEND_URL } = require("@/lib/api/backend");
  return `${BACKEND_URL}/training/assignments/${assignmentId}/certificate`;
}

// ---------------------------------------------------------------------------
// Employee self-service
// ---------------------------------------------------------------------------

export async function getMyTrainingAssignments(status?: string): Promise<EmployeeTraining[]> {
  const query: Record<string, string> = {};
  if (status) query.status = status;
  return (
    await backend<ApiEmployeeTraining[]>("/training/me/assignments", {
      query: Object.keys(query).length ? query : undefined,
    })
  ).map(toAssignment);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getTrainingDashboard(): Promise<TrainingDashboard> {
  const d = await backend<ApiTrainingDashboard>("/training/dashboard");
  return {
    total: d.total,
    completed: d.completed,
    inProgress: d.inProgress,
    overdue: d.overdue,
    notStarted: d.notStarted,
  };
}
