// Company documents that HR/super admin publishes for employees to read -
// leave policy PDFs, handbooks, benefits guides, and similar reference
// material. Distinct from the per-employee "asset" or "request" records.

export type DocumentCategory =
  | "Leave Policy"
  | "Company Policy"
  | "Onboarding"
  | "Benefits"
  | "SOP"
  | "Other";

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "Leave Policy",
  "Company Policy",
  "Onboarding",
  "Benefits",
  "SOP",
  "Other",
];

export interface CompanyDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string; // ISO
  uploadedBy: string;
  // Set when this was uploaded to a specific employee's Documents tab (ID
  // proof, certificates, joining letter) rather than published company-wide
  // via Reports.
  employeeId?: string;
}
