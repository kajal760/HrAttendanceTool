import { backend, BackendError } from "@/lib/api/backend";
import type { ApiCorrectionRequest } from "@/lib/api/types";

// Attendance correction requests - backed by the FastAPI `/attendance/*corrections*`
// endpoints. Approving one applies the requested time(s) straight to that day's
// attendance record (creating it if the employee never clocked in at all).

export type CorrectionStatus = "Pending" | "Approved" | "Rejected";

export interface CorrectionRequest {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  requestedCheckIn?: string; // HH:MM
  requestedCheckOut?: string; // HH:MM
  reason: string;
  status: CorrectionStatus;
  submittedOn: string; // ISO
  decidedOn?: string; // ISO
}

function toCorrection(r: ApiCorrectionRequest): CorrectionRequest {
  return {
    id: r.id,
    employeeId: r.employeeId,
    date: r.workDate,
    requestedCheckIn: r.requestedClockIn?.slice(0, 5) ?? undefined,
    requestedCheckOut: r.requestedClockOut?.slice(0, 5) ?? undefined,
    reason: r.reason,
    status: r.status,
    submittedOn: r.submittedAt,
    decidedOn: r.decidedAt ?? undefined,
  };
}

// Admin/HR: every request, newest first.
export async function getCorrections(): Promise<CorrectionRequest[]> {
  return (await backend<ApiCorrectionRequest[]>("/attendance/corrections")).map(toCorrection);
}

// The route calling this has already checked `employeeId` is the signed-in
// employee's own id - the backend takes the employee from the session token too,
// so one employee can never see another's correction requests this way.
export async function getCorrectionsForEmployee(employeeId: string): Promise<CorrectionRequest[]> {
  void employeeId;
  return (await backend<ApiCorrectionRequest[]>("/attendance/me/corrections")).map(toCorrection);
}

export async function addCorrection(input: {
  employeeId: string;
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}): Promise<CorrectionRequest> {
  void input.employeeId;
  return toCorrection(
    await backend<ApiCorrectionRequest>("/attendance/me/corrections", {
      method: "POST",
      body: {
        workDate: input.date,
        requestedClockIn: input.requestedCheckIn ?? null,
        requestedClockOut: input.requestedCheckOut ?? null,
        reason: input.reason,
      },
    }),
  );
}

export async function decideCorrection(
  id: string,
  status: "Approved" | "Rejected",
): Promise<CorrectionRequest | null | "already-decided"> {
  try {
    return toCorrection(
      await backend<ApiCorrectionRequest>(`/attendance/corrections/${id}/decision`, {
        method: "POST",
        body: { status },
      }),
    );
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    if (err instanceof BackendError && err.status === 409) return "already-decided";
    throw err;
  }
}
