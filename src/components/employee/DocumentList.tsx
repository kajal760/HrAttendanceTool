import { FileText } from "lucide-react";
import type { CompanyDocument } from "@/types/documents";
import styles from "./DocumentList.module.css";

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

interface DocumentListProps {
  documents: CompanyDocument[];
  emptyMessage?: string;
}

// Read-only view of what HR publishes via Superadmin > Reports - leave
// policy, handbook, and similar company PDFs. Also reused for the SOPs tab
// (same list, filtered to a different category) with its own empty text.
export default function DocumentList({ documents, emptyMessage = "No company documents published yet." }: DocumentListProps) {
  if (documents.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.list}>
      {documents.map((doc) => (
        <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className={styles.row}>
          <span className={styles.iconWrap}>
            <FileText size={18} strokeWidth={2} />
          </span>
          <div className={styles.body}>
            <span className={styles.title}>{doc.title}</span>
            <span className={styles.meta}>
              <span className={styles.badge}>{doc.category}</span>
              {formatSize(doc.fileSizeBytes)} &middot; Updated {formatDate(doc.uploadedAt)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
