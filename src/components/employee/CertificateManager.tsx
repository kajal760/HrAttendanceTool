"use client";

import { useRef, useState } from "react";
import { Award, Download, Trash2, Upload } from "lucide-react";
import type { CompanyDocument } from "@/types/documents";
import styles from "./CertificateManager.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface CertificateManagerProps {
  initialCertificates: CompanyDocument[];
}

// Self-service upload/download for an employee's own certificates (degree,
// training, course completion, ...). Separate from the HR-managed Documents
// tab on the Employee Profile (ID proof, offer letter) - employees can only
// see and delete what they uploaded here, via /api/employee/documents.
export default function CertificateManager({ initialCertificates }: CertificateManagerProps) {
  const [certificates, setCertificates] = useState<CompanyDocument[]>(initialCertificates);
  const [title, setTitle] = useState("");
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
      setError("Give the certificate a title.");
      return;
    }

    const form = new FormData();
    form.set("title", title.trim());
    form.set("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/employee/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setCertificates((prev) => [data.document, ...prev]);
      setTitle("");
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
      const res = await fetch(`/api/employee/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCertificates((prev) => prev.filter((d) => d.id !== id));
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
          placeholder="Certificate title, e.g. AWS Certified Developer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.titleInput}
        />
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className={styles.fileInput} />
        <button type="submit" className={styles.uploadButton} disabled={uploading}>
          <Upload size={14} strokeWidth={2.25} />
          {uploading ? "Uploading..." : "Upload certificate"}
        </button>
      </form>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {certificates.map((doc) => (
          <div key={doc.id} className={styles.row}>
            <span className={styles.iconWrap}>
              <Award size={18} strokeWidth={2} />
            </span>
            <div className={styles.body}>
              <span className={styles.title}>{doc.title}</span>
              <span className={styles.meta}>
                {doc.fileName} &middot; {formatSize(doc.fileSizeBytes)} &middot; Uploaded {formatDate(doc.uploadedAt)}
              </span>
            </div>
            <a href={doc.fileUrl} download={doc.fileName} className={styles.downloadLink}>
              <Download size={13} strokeWidth={2.25} /> Download
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
        {certificates.length === 0 && <div className={styles.empty}>No certificates uploaded yet.</div>}
      </div>
    </div>
  );
}
