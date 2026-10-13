"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  ANNOUNCEMENT_CREATOR_ROLES,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_TYPES,
} from "@/types/announcement";
import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementAudienceType,
  AnnouncementCreatorRole,
  AnnouncementPriority,
  AnnouncementType,
} from "@/types/announcement";
import type { EmployeeOverview } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import { useDepartmentNames } from "./useDepartmentNames";
import styles from "./AnnouncementForm.module.css";

function toDateInputValue(iso?: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function toDateTimeInputValue(iso?: string): string {
  return iso ? iso.slice(0, 16) : "";
}

interface AnnouncementFormProps {
  mode: "create" | "edit";
  announcement?: Announcement;
  employees: EmployeeOverview[];
}

// One form for both creating and editing - lifecycle transitions (Publish
// now / Archive) live on the detail page instead, so this stays focused on
// content + targeting + schedule.
export default function AnnouncementForm({ mode, announcement, employees }: AnnouncementFormProps) {
  const router = useRouter();
  const base = usePortalBase();
  const departments = useDepartmentNames().names;
  const managers = employees.filter((e) => employees.some((other) => other.managerId === e.id));

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [type, setType] = useState<AnnouncementType>(announcement?.type ?? "General");
  const [priority, setPriority] = useState<AnnouncementPriority>(announcement?.priority ?? "Normal");
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>(announcement?.audience.type ?? "Everyone");
  const [audienceDepartment, setAudienceDepartment] = useState(announcement?.audience.department ?? departments[0] ?? "");
  const [audienceManagerId, setAudienceManagerId] = useState(announcement?.audience.managerId ?? managers[0]?.id ?? "");
  const [audienceEmployeeIds, setAudienceEmployeeIds] = useState<string[]>(announcement?.audience.employeeIds ?? []);
  const [requireAck, setRequireAck] = useState(announcement?.requireAcknowledgement ?? false);
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState(toDateTimeInputValue(announcement?.publishAt));
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(announcement?.expiresAt));
  const [createdByName, setCreatedByName] = useState(announcement?.createdByName ?? "Super Admin");
  const [createdByRole, setCreatedByRole] = useState<AnnouncementCreatorRole>(announcement?.createdByRole ?? "Super Admin");
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<AnnouncementAttachment[]>(announcement?.attachments ?? []);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (!content.trim()) return "Description/content is required.";
    if (audienceType === "Department" && !audienceDepartment) return "Choose a department.";
    if (audienceType === "Team" && !audienceManagerId) return "Choose a manager for the team.";
    if (audienceType === "Employees" && audienceEmployeeIds.length === 0) return "Select at least one employee.";
    if (!createdByName.trim()) return "Enter who's posting this.";
    return null;
  }

  function buildAudience() {
    return {
      type: audienceType,
      department: audienceType === "Department" ? audienceDepartment : undefined,
      managerId: audienceType === "Team" ? audienceManagerId : undefined,
      employeeIds: audienceType === "Employees" ? audienceEmployeeIds : undefined,
    };
  }

  async function handleCreate(e: FormEvent, saveAsDraft: boolean) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!saveAsDraft && publishMode === "schedule" && !scheduledAt) {
      setError("Choose a schedule date and time.");
      return;
    }

    setSubmitting(saveAsDraft ? "draft" : "publish");
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("content", content.trim());
      form.set("type", type);
      form.set("priority", priority);
      form.set("audienceType", audienceType);
      if (audienceType === "Department") form.set("audienceDepartment", audienceDepartment);
      if (audienceType === "Team") form.set("audienceManagerId", audienceManagerId);
      if (audienceType === "Employees") form.set("audienceEmployeeIds", JSON.stringify(audienceEmployeeIds));
      form.set("requireAcknowledgement", String(requireAck));
      form.set("saveAsDraft", String(saveAsDraft));
      form.set("publishMode", publishMode);
      if (publishMode === "schedule") form.set("scheduledAt", scheduledAt);
      if (expiresAt) form.set("expiresAt", expiresAt);
      form.set("createdByName", createdByName.trim());
      form.set("createdByRole", createdByRole);
      for (const file of files) form.append("attachments", file);

      const res = await fetch("/api/superadmin/announcements", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save announcement.");
        return;
      }
      router.push(withBase(base, `/announcements/${data.announcement.id}`));
    } catch {
      setError("Could not save announcement - check your connection and try again.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting("save");
    try {
      const res = await fetch(`/api/superadmin/announcements/${announcement!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          priority,
          audience: buildAudience(),
          requireAcknowledgement: requireAck,
          expiresAt: expiresAt || null,
          attachments: existingAttachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      router.push(withBase(base, `/announcements/${announcement!.id}`));
    } catch {
      setError("Could not save changes - check your connection and try again.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <form className={styles.form} onSubmit={mode === "create" ? (e) => handleCreate(e, false) : handleEdit}>
      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Announcement title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Description / content</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
        </label>

        <label className={styles.field}>
          <span>Announcement type</span>
          <select value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
            {ANNOUNCEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}>
            {ANNOUNCEMENT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Audience</span>
          <select value={audienceType} onChange={(e) => setAudienceType(e.target.value as AnnouncementAudienceType)}>
            <option value="Everyone">Everyone</option>
            <option value="Department">Specific department</option>
            <option value="Team">Specific team (a manager's reports)</option>
            <option value="Employees">Specific employees</option>
            <option value="Managers">Managers only</option>
            <option value="HR">HR only</option>
          </select>
        </label>

        {audienceType === "Department" && (
          <label className={styles.field}>
            <span>Department</span>
            <select value={audienceDepartment} onChange={(e) => setAudienceDepartment(e.target.value)}>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        )}

        {audienceType === "Team" && (
          <label className={styles.field}>
            <span>Manager</span>
            <select value={audienceManagerId} onChange={(e) => setAudienceManagerId(e.target.value)}>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          <span>Publish date {mode === "edit" ? "(set when created)" : ""}</span>
          {mode === "create" ? (
            <div className={styles.publishToggle}>
              <label>
                <input type="radio" checked={publishMode === "now"} onChange={() => setPublishMode("now")} /> Now
              </label>
              <label>
                <input type="radio" checked={publishMode === "schedule"} onChange={() => setPublishMode("schedule")} /> Schedule
              </label>
            </div>
          ) : (
            <input type="text" value={new Date(announcement!.publishAt).toLocaleString()} disabled />
          )}
        </label>

        {mode === "create" && publishMode === "schedule" && (
          <label className={styles.field}>
            <span>Schedule for</span>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </label>
        )}

        <label className={styles.field}>
          <span>Expiry date (optional)</span>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>Posting as</span>
          <select value={createdByRole} onChange={(e) => setCreatedByRole(e.target.value as AnnouncementCreatorRole)}>
            {ANNOUNCEMENT_CREATOR_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Posted by (name)</span>
          <input type="text" value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} />
        </label>
      </div>

      {audienceType === "Employees" && (
        <div className={styles.checklistSection}>
          <span className={styles.checklistTitle}>Select employees</span>
          <div className={styles.checklist}>
            {employees.map((emp) => (
              <label key={emp.id} className={styles.checklistItem}>
                <input
                  type="checkbox"
                  checked={audienceEmployeeIds.includes(emp.id)}
                  onChange={() =>
                    setAudienceEmployeeIds((prev) =>
                      prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                    )
                  }
                />
                {emp.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={requireAck} onChange={(e) => setRequireAck(e.target.checked)} />
        Require acknowledgement ("I have read and understood this")
      </label>

      <div className={styles.attachmentSection}>
        <span className={styles.checklistTitle}>Attachments</span>
        {existingAttachments.length > 0 && (
          <ul className={styles.attachmentList}>
            {existingAttachments.map((att) => (
              <li key={att.id}>
                <span>{att.name}</span>
                <button
                  type="button"
                  className={styles.removeAttachment}
                  onClick={() => setExistingAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  aria-label={`Remove ${att.name}`}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {mode === "create" && (
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={() => router.back()}>
          Cancel
        </button>
        {mode === "create" ? (
          <>
            <button type="button" className={styles.draftButton} disabled={!!submitting} onClick={(e) => handleCreate(e, true)}>
              {submitting === "draft" ? "Saving..." : "Save as Draft"}
            </button>
            <button type="submit" className={styles.saveButton} disabled={!!submitting}>
              {submitting === "publish" ? "Publishing..." : publishMode === "schedule" ? "Schedule" : "Publish"}
            </button>
          </>
        ) : (
          <button type="submit" className={styles.saveButton} disabled={!!submitting}>
            {submitting === "save" ? "Saving..." : "Save changes"}
          </button>
        )}
      </div>
    </form>
  );
}
