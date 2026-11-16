import { backend } from "@/lib/api/backend";
import type { ApiPoshComplaint } from "@/lib/api/types";
import type { PoshComplaint } from "@/types/posh";

// Backed by the FastAPI `/posh` endpoints.

function toComplaint(c: ApiPoshComplaint): PoshComplaint {
  return {
    id: c.id,
    employeeId: c.employeeId ?? undefined,
    employeeName: c.employeeName ?? undefined,
    anonymous: c.anonymous,
    respondent: c.respondent ?? undefined,
    description: c.description,
    status: c.status,
    submittedAt: c.submittedAt,
    resolutionNote: c.resolutionNote ?? undefined,
    resolvedBy: c.resolvedBy ?? undefined,
    resolvedAt: c.resolvedAt ?? undefined,
  };
}

// Admin and HR both see the full queue.
export async function getPoshComplaints(): Promise<PoshComplaint[]> {
  return (await backend<ApiPoshComplaint[]>("/posh")).map(toComplaint);
}

// Always the signed-in employee's own (non-anonymous) complaints - the
// backend takes the employee from the session token.
export async function getPoshComplaintsForEmployee(_employeeId: string): Promise<PoshComplaint[]> {
  return (await backend<ApiPoshComplaint[]>("/posh/me")).map(toComplaint);
}

interface AddPoshComplaintInput {
  anonymous: boolean;
  respondent?: string;
  description: string;
}

export async function addPoshComplaint(input: AddPoshComplaintInput): Promise<PoshComplaint> {
  return toComplaint(
    await backend<ApiPoshComplaint>("/posh/me", {
      method: "POST",
      body: { anonymous: input.anonymous, respondent: input.respondent, description: input.description },
    }),
  );
}

export async function updatePoshComplaintStatus(
  id: string,
  status: PoshComplaint["status"],
  resolutionNote?: string,
): Promise<PoshComplaint> {
  return toComplaint(
    await backend<ApiPoshComplaint>(`/posh/${id}`, { method: "PATCH", body: { status, resolutionNote } }),
  );
}
