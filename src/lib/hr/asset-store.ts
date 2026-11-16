import { backend } from "@/lib/api/backend";
import type { ApiAsset, ApiAssetEvent, ApiAssetHistoryFeedEntry } from "@/lib/api/types";
import type { Asset, AssetCategory, AssetEmploymentStatus, AssetEvent } from "@/types/asset";

// Backed by the FastAPI `/assets` endpoints.

// The backend always sends `ownerId: null` for event types that never touch
// an owner (Added/Sent for repair/Repaired/Retired) as well as for
// "Returned" (which genuinely clears it) - the two only differ by event
// `type`, so that's what tells the UI "-" (not applicable) apart from
// "Unassigned" (cleared), same distinction the old local store made by
// omitting the key entirely for the former.
function toAssetEvent(e: ApiAssetEvent): AssetEvent {
  return {
    id: e.id,
    date: e.date,
    type: e.type,
    ownerId: e.ownerId !== null ? e.ownerId : e.type === "Returned" ? null : undefined,
    detail: e.detail ?? undefined,
    performedBy: e.performedBy,
  };
}

function toAsset(a: ApiAsset): Asset {
  return {
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    category: a.category as AssetCategory,
    deviceMake: a.deviceMake ?? undefined,
    model: a.model ?? undefined,
    serialNumber: a.serialNumber ?? undefined,
    purchasedOn: a.purchasedOn ?? undefined,
    status: a.status,
    ownerId: a.ownerId,
    assignedOn: a.assignedOn ?? undefined,
    department: a.department ?? undefined,
    employmentStatus: a.employmentStatus ?? undefined,
    vendor: a.vendor ?? undefined,
    invoiceDetails: a.invoiceDetails ?? undefined,
    warrantyStartDate: a.warrantyStartDate ?? undefined,
    warrantyEndDate: a.warrantyEndDate ?? undefined,
    notes: a.notes ?? undefined,
    history: a.history.map(toAssetEvent),
  };
}

export async function getAssets(): Promise<Asset[]> {
  return (await backend<ApiAsset[]>("/assets")).map(toAsset);
}

export interface AssetHistoryFeedEvent extends AssetEvent {
  assetId: string;
  assetTag: string;
  assetName: string;
}

export async function getAssetEvents(): Promise<AssetHistoryFeedEvent[]> {
  const events = await backend<ApiAssetHistoryFeedEntry[]>("/assets/events");
  return events.map((e) => ({ ...toAssetEvent(e), assetId: e.assetId, assetTag: e.assetTag, assetName: e.assetName }));
}

// Inventory-sheet detail fields shared by create and edit - everything
// beyond identity (name/category/tag) and lifecycle (status/owner).
export interface AssetDetailFields {
  deviceMake?: string;
  model?: string;
  serialNumber?: string;
  department?: string;
  employmentStatus?: AssetEmploymentStatus;
  vendor?: string;
  invoiceDetails?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  notes?: string;
}

export interface NewAssetInput extends AssetDetailFields {
  name: string;
  category: AssetCategory;
  assetTag?: string;
  purchasedOn?: string;
  ownerId?: string | null;
}

export async function addAsset(input: NewAssetInput): Promise<Asset> {
  return toAsset(
    await backend<ApiAsset>("/assets", {
      method: "POST",
      body: {
        name: input.name,
        category: input.category,
        assetTag: input.assetTag,
        serialNumber: input.serialNumber,
        purchasedOn: input.purchasedOn,
        ownerId: input.ownerId || null,
        deviceMake: input.deviceMake,
        model: input.model,
        department: input.department,
        employmentStatus: input.employmentStatus,
        vendor: input.vendor,
        invoiceDetails: input.invoiceDetails,
        warrantyStartDate: input.warrantyStartDate,
        warrantyEndDate: input.warrantyEndDate,
        notes: input.notes,
      },
    }),
  );
}

export interface UpdateAssetInput extends AssetDetailFields {
  name?: string;
  category?: AssetCategory;
  purchasedOn?: string;
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
  return toAsset(await backend<ApiAsset>(`/assets/${id}`, { method: "PATCH", body: input }));
}

export type AssetAction = "assign" | "return" | "send-to-repair" | "repair-done" | "retire";

export async function transitionAsset(id: string, action: AssetAction, employeeId?: string): Promise<Asset> {
  return toAsset(
    await backend<ApiAsset>(`/assets/${id}/actions`, { method: "POST", body: { action, employeeId: employeeId || null } }),
  );
}
