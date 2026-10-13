"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  AssetItem,
  AssetRequest,
  AssetRequestStatus,
  AssetRequestType,
} from "@/types/employee";
import Pager from "./Pager";
import styles from "./AssetRequestPanel.module.css";

const STORAGE_KEY = "hr-attendance:asset-requests:v1";
const PAGE_SIZE = 5;

// "New Asset" needs no existing allocated asset to pick from (there isn't
// one yet) - every other type is about something already assigned to this
// employee.
const EXISTING_ASSET_TYPES: AssetRequestType[] = ["Return", "Report Lost", "Technical Issue", "Report Damaged", "Replacement"];
const REQUEST_TYPES: AssetRequestType[] = ["New Asset", ...EXISTING_ASSET_TYPES];

const BADGE_CLASS: Record<AssetRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function loadStored(fallback: AssetRequest[]): AssetRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssetRequest[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(requests: AssetRequest[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // localStorage unavailable - in-memory state still holds for this tab.
  }
}

interface AssetRequestPanelProps {
  assets: AssetItem[];
  initialRequests: AssetRequest[];
}

// TODO: submit to `POST /api/assets/requests` for real IT review once the
// backend exists; this persists to localStorage as a stand-in.
export default function AssetRequestPanel({
  assets,
  initialRequests,
}: AssetRequestPanelProps) {
  const allocatedAssets = assets.filter((a) => a.status === "Allocated");
  const [requests, setRequests] = useState<AssetRequest[]>(initialRequests);
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [assetId, setAssetId] = useState(allocatedAssets[0]?.id ?? "");
  const [newAssetName, setNewAssetName] = useState("");
  const [type, setType] = useState<AssetRequestType>("New Asset");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isNewAssetRequest = type === "New Asset";

  useEffect(() => {
    setRequests(loadStored(initialRequests));
    // Only merge from storage on mount; initialRequests is a static prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageRequests = useMemo(
    () => requests.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [requests, page],
  );

  function resetForm() {
    setAssetId(allocatedAssets[0]?.id ?? "");
    setNewAssetName("");
    setType("New Asset");
    setNote("");
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (note.trim().length < 10) {
      setError("Please add details (10+ characters).");
      return;
    }

    let request: AssetRequest;
    if (isNewAssetRequest) {
      if (newAssetName.trim().length === 0) {
        setError("Please say what asset you need.");
        return;
      }
      request = {
        id: `areq-${Date.now()}`,
        assetName: newAssetName.trim(),
        type,
        note: note.trim(),
        status: "Pending",
        submittedAt: new Date().toISOString(),
      };
    } else {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) {
        setError("Please pick an asset.");
        return;
      }
      request = {
        id: `areq-${Date.now()}`,
        assetId: asset.id,
        assetName: asset.name,
        type,
        note: note.trim(),
        status: "Pending",
        submittedAt: new Date().toISOString(),
      };
    }

    const next = [request, ...requests];
    setRequests(next);
    saveStored(next);
    setPage(0);
    resetForm();
    setShowForm(false);
  }

  return (
    <div>
      <div className={styles.toggleRow}>
        <button type="button" className={styles.toggleButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New request"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.field}>
              Request type
              <select value={type} onChange={(e) => setType(e.target.value as AssetRequestType)}>
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {isNewAssetRequest ? (
              <label className={styles.field}>
                What do you need?
                <input
                  type="text"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="e.g. External monitor, Laptop, ID card..."
                />
              </label>
            ) : (
              <label className={styles.field}>
                Asset
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={allocatedAssets.length === 0}>
                  {allocatedAssets.length === 0 && <option value="">No allocated assets</option>}
                  {allocatedAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetTag})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className={styles.field}>
            Details
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isNewAssetRequest
                  ? "Explain why you need this (e.g. starting a new project, existing one is outdated...)"
                  : "Explain the reason (e.g. device issue, last seen location, replacement needed for...)"
              }
              required
            />
          </label>
          {error && <span className={styles.error}>{error}</span>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              Submit to IT
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <p className={styles.empty}>No asset requests yet.</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Details</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {pageRequests.map((req) => (
                <tr key={req.id}>
                  <td>{req.assetName}</td>
                  <td className={styles.muted}>{req.type}</td>
                  <td className={styles.noteCell}>{req.note}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>{req.status}</span>
                  </td>
                  <td className={styles.muted}>{formatDate(req.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
