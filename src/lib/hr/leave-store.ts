import { backend, backendRaw } from "@/lib/api/backend";
import type { ApiLeaveRequest, ApiLeaveSummary, ApiLeaveTotals, ApiLeaveType } from "@/lib/api/types";
import { getSession } from "@/lib/auth/get-session";
import type { HalfDaySession, LeaveRequest, LeaveSummary, LeaveTypeOption } from "@/types/employee";

// Leave requests, types and balances - backed by the FastAPI `/leave`
// endpoints, which enforce the leave policy (yearly limits, half days,
// sick-leave certificates, maternity rules, holidays/weekends not counted).
// Errors come back as BackendError with the policy's own message, e.g.
// "Casual Leave can be at most 4 day(s) per request."

function toRequest(r: ApiLeaveRequest): LeaveRequest {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    category: r.category,
    startDate: r.startDate,
    endDate: r.endDate,
    days: r.days,
    reason: r.reason,
    status: r.status,
    submittedAt: r.submittedAt,
    decidedBy: r.decidedBy ?? undefined,
    decidedAt: r.decidedAt ?? undefined,
    decisionNote: r.decisionNote ?? undefined,
    halfDaySession: r.halfDaySession ?? undefined,
    expectedDeliveryDate: r.expectedDeliveryDate ?? undefined,
    hasAttachment: r.hasAttachment,
    certificateRequired: r.certificateRequired,
  };
}

export async function getLeaveTypes(): Promise<LeaveTypeOption[]> {
  const types = await backend<ApiLeaveType[]>("/leave/types");
  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description ?? undefined,
    annualQuota: t.annualQuota,
    maxDaysPerRequest: t.maxDaysPerRequest,
    allowHalfDay: t.allowHalfDay,
    certificateRequiredAfterDays: t.certificateRequiredAfterDays,
    needsExpectedDeliveryDate: t.maxDaysBeforeEvent !== null,
  }));
}

// Admin leave-type editor: every type (including inactive ones), with the
// full set of policy fields - `getLeaveTypes()` above only maps the subset
// the apply form needs.
export async function getLeaveTypesAdmin(): Promise<ApiLeaveType[]> {
  return backend<ApiLeaveType[]>("/leave/types", { query: { includeInactive: true } });
}

export interface LeaveTypePatch {
  description?: string | null;
  annualQuota?: number | null;
  minDaysPerRequest?: number | null;
  maxDaysPerRequest?: number | null;
  allowHalfDay?: boolean;
  certificateRequiredAfterDays?: number | null;
  perOccurrenceDays?: number | null;
  maxOccurrences?: number | null;
  maxDaysBeforeEvent?: number | null;
  isActive?: boolean;
}

// `code`/`name` aren't editable - the backend's schema doesn't expose them.
export async function patchLeaveType(id: string, patch: LeaveTypePatch): Promise<ApiLeaveType> {
  return backend<ApiLeaveType>(`/leave/types/${id}`, { method: "PATCH", body: patch });
}

// Admin/HR: every request. An Employee only ever gets their own.
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const session = await getSession();
  const path = session?.role === "Employee" ? "/leave/me/requests" : "/leave/requests";
  return (await backend<ApiLeaveRequest[]>(path)).map(toRequest);
}

export async function getLeaveRequestsForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  const session = await getSession();
  const requests =
    session?.employeeId === employeeId
      ? await backend<ApiLeaveRequest[]>("/leave/me/requests")
      : await backend<ApiLeaveRequest[]>("/leave/requests", { query: { employeeId } });
  return requests.map(toRequest);
}

function toSummary(s: ApiLeaveSummary): LeaveSummary {
  return {
    totalAllocated: s.totalAllocated,
    totalUsed: s.totalUsed,
    totalRemaining: s.totalRemaining,
    percentUsed: s.percentUsed,
    // Types without a yearly quota (maternity) show their per-occasion
    // entitlement as "allocated" so the donut still has a scale.
    byType: s.byType.map((b) => ({
      type: b.type,
      allocated: b.allocated ?? 0,
      used: b.used,
      remaining: b.remaining ?? 0,
    })),
  };
}

// Balances for the calendar year - computed by the backend from approved
// days against each type's yearly quota. (Pending days count against
// `remaining` there too, so an employee can't over-apply.)
export async function getLeaveSummary(employeeId: string, year?: number): Promise<LeaveSummary> {
  const session = await getSession();
  const path = session?.employeeId === employeeId ? "/leave/me/summary" : `/leave/employees/${employeeId}/summary`;
  return toSummary(await backend<ApiLeaveSummary>(path, { query: { year } }));
}

// Admin/HR: every active employee's totals in one call.
export async function getAllLeaveTotals(year?: number): Promise<ApiLeaveTotals[]> {
  return backend<ApiLeaveTotals[]>("/leave/summaries", { query: { year } });
}

export interface NewLeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDaySession?: HalfDaySession;
  expectedDeliveryDate?: string;
  reason: string;
}

// The signed-in employee's own request (the backend takes the employee
// from the token, so nobody can apply on someone else's behalf).
export async function addLeaveRequest(input: NewLeaveRequestInput): Promise<LeaveRequest> {
  return toRequest(await backend<ApiLeaveRequest>("/leave/me/requests", { method: "POST", body: input }));
}

export interface LeavePreview {
  days: number;
  certificateRequired: boolean;
  remainingAfter: number | null;
}

// Dry run of `addLeaveRequest`: the day count, or the policy error it would hit.
export async function previewLeaveRequest(input: NewLeaveRequestInput): Promise<LeavePreview> {
  return backend<LeavePreview>("/leave/me/requests/preview", { method: "POST", body: input });
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  return toRequest(await backend<ApiLeaveRequest>(`/leave/me/requests/${id}/cancel`, { method: "POST" }));
}

export async function uploadLeaveAttachment(id: string, file: File): Promise<LeaveRequest> {
  const form = new FormData();
  form.append("file", file, file.name);
  return toRequest(
    await backend<ApiLeaveRequest>(`/leave/me/requests/${id}/attachment`, { method: "POST", form }),
  );
}

export async function downloadLeaveAttachment(id: string): Promise<Response> {
  return backendRaw(`/leave/requests/${id}/attachment`);
}

// HR's approve/reject - the backend only allows it from Pending, refuses
// HR deciding their own request, and blocks approving sick leave that
// needs a certificate until one is attached.
export async function decideLeaveRequest(
  id: string,
  status: "Approved" | "Rejected",
  note?: string,
): Promise<LeaveRequest> {
  return toRequest(
    await backend<ApiLeaveRequest>(`/leave/requests/${id}/decision`, {
      method: "POST",
      body: { status, note: note ?? null },
    }),
  );
}
