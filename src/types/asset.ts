// Company assets (laptops, phones, ID and access cards, software licences)
// with their lifecycle and current owner.

export const ASSET_CATEGORIES = ["Laptop", "Phone", "ID card", "Access card", "Software licence", "Other"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// Lifecycle: Available -> Assigned (to an owner) -> back to Available when
// returned; Available <-> Under repair; Retired is final and only from stock.
export type AssetLifecycle = "Available" | "Assigned" | "Under repair" | "Retired";

export type AssetEventType = "Added" | "Assigned" | "Returned" | "Sent for repair" | "Repaired" | "Retired";

export interface AssetEvent {
  id: string;
  date: string; // ISO
  type: AssetEventType;
  ownerId?: string | null; // owner after this event, when it changed
  detail?: string;
  performedBy: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  serialNumber?: string;
  purchasedOn?: string; // YYYY-MM-DD
  status: AssetLifecycle;
  ownerId: string | null;
  assignedOn?: string; // ISO, when the current owner got it
  history: AssetEvent[];
}
