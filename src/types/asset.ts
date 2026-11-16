// Company assets (laptops, phones, ID and access cards, software licences)
// with their lifecycle and current owner.

export const ASSET_CATEGORIES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Keyboard",
  "Trackpad",
  "Phone",
  "ID card",
  "Access card",
  "Software licence",
  "Other",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_EMPLOYMENT_STATUSES = ["Employee", "Consultant"] as const;
export type AssetEmploymentStatus = (typeof ASSET_EMPLOYMENT_STATUSES)[number];

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
  deviceMake?: string;
  model?: string;
  serialNumber?: string;
  purchasedOn?: string; // YYYY-MM-DD
  status: AssetLifecycle;
  ownerId: string | null;
  assignedOn?: string; // ISO, when the current owner got it
  // Who the asset's budget/ownership sits with on the inventory sheet - free
  // text, not necessarily the current holder's own department.
  department?: string;
  employmentStatus?: AssetEmploymentStatus;
  vendor?: string;
  invoiceDetails?: string;
  warrantyStartDate?: string; // YYYY-MM-DD
  warrantyEndDate?: string; // YYYY-MM-DD
  notes?: string;
  history: AssetEvent[];
}
