"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { DOCUMENT_CATEGORIES, type CompanyDocument, type DocumentCategory } from "@/types/documents";
import styles from "./DocumentManager.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DocumentManagerProps {
  initialDocuments: CompanyDocument[];
}

// Upload form + list for the company documents employees see under
// Employee > Policies (leave policy, handbook, and similar PDFs). Uploads go
// to `POST /api/superadmin/documents`; see `src/lib/superadmin/document-store.ts`
// for where the files actually land.
export default function DocumentManager({ initialDocuments }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<CompanyDocument[]>(initialDocuments);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Leave Policy");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Give the document a title.");
      return;
    }

    const form = new FormData();
    form.set("title", title.trim());
    form.set("category", category);
    form.set("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/superadmin/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setDocuments((prev) => [data.document, ...prev]);
      setTitle("");
      setCategory("Leave Policy");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Upload failed - check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/superadmin/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <form className={styles.uploadForm} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Document title, e.g. Leave Policy 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          aria-label="Document category"
        >
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className={styles.fileInput} />
        <button type="submit" className={styles.uploadButton} disabled={uploading}>
          <Upload size={14} strokeWidth={2.25} />
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </form>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {documents.map((doc) => (
          <div key={doc.id} className={styles.row}>
            <span className={styles.iconWrap}>
              <FileText size={18} strokeWidth={2} />
            </span>
            <div className={styles.body}>
              <span className={styles.title}>{doc.title}</span>
              <span className={styles.meta}>
                <span className={styles.badge}>{doc.category}</span>
                {doc.fileName} &middot; {formatSize(doc.fileSizeBytes)} &middot; Uploaded{" "}
                {formatDate(doc.uploadedAt)}
              </span>
            </div>
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className={styles.downloadLink}>
              View
            </a>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => handleDelete(doc.id)}
              disabled={deletingId === doc.id}
              aria-label={`Delete ${doc.title}`}
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        ))}
        {documents.length === 0 && (
          <div className={styles.empty}>No documents uploaded yet.</div>
        )}
      </div>
    </div>
  );
}
