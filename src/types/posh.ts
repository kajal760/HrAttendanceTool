// POSH (Prevention of Sexual Harassment) complaints - a confidential
// channel separate from the general HR Requests form. Only HR can see who
// filed a non-anonymous complaint and move its status; Admin can see the
// queue (same shared /hr /superadmin tree) but not resolve it.

export type PoshComplaintStatus = "Submitted" | "Under Review" | "Resolved";

export interface PoshComplaint {
  id: string;
  // Both absent when filed anonymously.
  employeeId?: string;
  employeeName?: string;
  anonymous: boolean;
  respondent?: string; // optional - who/which team the complaint concerns
  description: string;
  status: PoshComplaintStatus;
  submittedAt: string; // ISO
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string; // ISO
}
