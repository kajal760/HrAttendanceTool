import { backend, backendRaw } from "@/lib/api/backend";
import type { ApiDocument } from "@/lib/api/types";
import type { CompanyDocument, DocumentCategory } from "@/types/documents";

// Backed by the FastAPI `/documents` endpoints. Files are proxied through
// `/api/documents/[id]/file` since the backend serves them from an
// authenticated route, not a public static path.

function toDocument(d: ApiDocument): CompanyDocument {
  return {
    id: d.id,
    title: d.title,
    category: d.category as DocumentCategory,
    fileName: d.fileName,
    fileUrl: `/api/documents/${d.id}/file`,
    fileSizeBytes: d.fileSizeBytes,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedBy,
    employeeId: d.employeeId ?? undefined,
  };
}

// Company-wide documents only (Reports/Policies) - employee-scoped uploads
// are excluded, see `getEmployeeDocuments`.
export async function getDocuments(): Promise<CompanyDocument[]> {
  return (await backend<ApiDocument[]>("/documents")).map(toDocument);
}

// Admin/HR viewing one specific employee's full document list (ID proof,
// offer letter, certificates...) from the Employee Profile's Documents tab.
export async function getEmployeeDocuments(employeeId: string): Promise<CompanyDocument[]> {
  return (await backend<ApiDocument[]>("/documents", { query: { employeeId } })).map(toDocument);
}

// The signed-in employee's own self-uploaded certificates - the backend
// takes the employee from the session token and already filters to
// category=Certificate, unlike `getEmployeeDocuments`.
export async function getMyDocuments(): Promise<CompanyDocument[]> {
  return (await backend<ApiDocument[]>("/documents/me")).map(toDocument);
}

interface AddDocumentInput {
  title: string;
  category: DocumentCategory;
  file: File;
  employeeId?: string;
}

export async function addDocument(input: AddDocumentInput): Promise<CompanyDocument> {
  const form = new FormData();
  form.set("title", input.title);
  form.set("category", input.category);
  form.set("file", input.file, input.file.name);
  if (input.employeeId) form.set("employeeId", input.employeeId);
  return toDocument(await backend<ApiDocument>("/documents", { method: "POST", form }));
}

export async function deleteDocument(id: string): Promise<boolean> {
  await backend(`/documents/${id}`, { method: "DELETE" });
  return true;
}

export async function addMyDocument(title: string, file: File): Promise<CompanyDocument> {
  const form = new FormData();
  form.set("title", title);
  form.set("file", file, file.name);
  return toDocument(await backend<ApiDocument>("/documents/me", { method: "POST", form }));
}

export async function deleteMyDocument(id: string): Promise<boolean> {
  await backend(`/documents/me/${id}`, { method: "DELETE" });
  return true;
}

export async function downloadDocument(id: string): Promise<Response> {
  return backendRaw(`/documents/${id}/file`);
}
