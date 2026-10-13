import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CompanyDocument, DocumentCategory } from "@/types/documents";

// TODO: replace with real object storage + a database (S3/Blob + Postgres,
// say) once one exists. For now, uploaded PDFs are written to
// `public/uploads/documents` and their metadata to a JSON index file next to
// them. The index is read fresh on every call rather than cached in a module
// variable: Next's dev server (Turbopack) runs route handlers and page
// components in separate module instances, so a plain in-memory array
// written by one is invisible to the other - reading from disk each time
// sidesteps that. Fine for `next dev`/a single `next start` process, not for
// a multi-instance deployment (same caveat as `superadmin/log-store.ts`).

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const INDEX_PATH = path.join(UPLOAD_DIR, "_index.json");
const PUBLIC_PATH_PREFIX = "/uploads/documents";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function readIndex(): Promise<CompanyDocument[]> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as CompanyDocument[];
  } catch {
    return [];
  }
}

async function writeIndex(docs: CompanyDocument[]): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(docs, null, 2), "utf8");
}

// Company-wide documents only (Reports/Policies) - employee-scoped uploads
// are excluded, see `getEmployeeDocuments`.
export async function getDocuments(): Promise<CompanyDocument[]> {
  const docs = await readIndex();
  return docs.filter((d) => !d.employeeId).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export async function getEmployeeDocuments(employeeId: string): Promise<CompanyDocument[]> {
  const docs = await readIndex();
  return docs
    .filter((d) => d.employeeId === employeeId)
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

interface AddDocumentInput {
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileBytes: Uint8Array;
  uploadedBy: string;
  employeeId?: string;
}

export async function addDocument(input: AddDocumentInput): Promise<CompanyDocument> {
  const id = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const storedFileName = `${id}-${sanitizeFileName(input.fileName)}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedFileName), input.fileBytes);

  const doc: CompanyDocument = {
    id,
    title: input.title,
    category: input.category,
    fileName: input.fileName,
    fileUrl: `${PUBLIC_PATH_PREFIX}/${storedFileName}`,
    fileSizeBytes: input.fileBytes.byteLength,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    employeeId: input.employeeId,
  };

  const docs = await readIndex();
  await writeIndex([doc, ...docs]);
  return doc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const docs = await readIndex();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return false;

  await writeIndex(docs.filter((d) => d.id !== id));
  try {
    await unlink(path.join(process.cwd(), "public", doc.fileUrl));
  } catch {
    // File already gone - index removal above is what matters.
  }
  return true;
}
