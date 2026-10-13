import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Asset, AssetCategory, AssetEvent, AssetEventType, AssetLifecycle } from "@/types/asset";

// File-backed asset register, same pattern as the other stores. Seeded once
// with a few sample assets so the page has something to show.

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "assets.json");

function event(type: AssetEventType, performedBy: string, extra: Partial<AssetEvent> = {}, at = new Date()): AssetEvent {
  return { id: `evt-${type.replace(/\s+/g, "-").toLowerCase()}-${at.getTime()}-${Math.round(Math.random() * 1e6)}`, date: at.toISOString(), type, performedBy, ...extra };
}

function seed(): Asset[] {
  const now = new Date();
  const ago = (n: number) => new Date(now.getTime() - n * 86400000);
  const addedAt = ago(60);
  const mk = (
    n: number,
    name: string,
    category: AssetCategory,
    status: AssetLifecycle,
    ownerId: string | null,
    serialNumber?: string,
  ): Asset => {
    const history: AssetEvent[] = [event("Added", "Super Admin", {}, addedAt)];
    if (ownerId) history.push(event("Assigned", "Super Admin", { ownerId, detail: "Issued on joining" }, ago(40)));
    return {
      id: `ast-${n}`,
      assetTag: `AST-${String(n).padStart(4, "0")}`,
      name,
      category,
      serialNumber,
      purchasedOn: "2025-08-01",
      status,
      ownerId,
      assignedOn: ownerId ? ago(40).toISOString() : undefined,
      history,
    };
  };
  return [
    mk(1, "Dell Latitude 5440", "Laptop", "Assigned", "emp-1024", "DL5440-A1"),
    mk(2, "MacBook Air M2", "Laptop", "Assigned", "emp-1032", "MBA-M2-33"),
    mk(3, "iPhone 14", "Phone", "Available", null, "IP14-0912"),
    mk(4, "Access card - Floor 3", "Access card", "Assigned", "emp-1045"),
    mk(5, "Office 365 licence", "Software licence", "Available", null),
  ];
}

async function readIndex(): Promise<Asset[]> {
  try {
    return JSON.parse(await readFile(INDEX_PATH, "utf8")) as Asset[];
  } catch {
    const seeded = seed();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(INDEX_PATH, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

async function writeIndex(list: Asset[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getAssets(): Promise<Asset[]> {
  return readIndex();
}

export interface AssetHistoryFeedEvent extends AssetEvent {
  assetId: string;
  assetTag: string;
  assetName: string;
}

// Every asset already carries its own `history: AssetEvent[]` - this just
// flattens them all into one cross-asset feed, newest first.
export async function getAssetEvents(): Promise<AssetHistoryFeedEvent[]> {
  const assets = await readIndex();
  return assets
    .flatMap((a) => a.history.map((ev) => ({ ...ev, assetId: a.id, assetTag: a.assetTag, assetName: a.name })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface NewAssetInput {
  name: string;
  category: AssetCategory;
  assetTag?: string;
  serialNumber?: string;
  purchasedOn?: string;
  ownerId?: string | null;
  performedBy: string;
}

export async function addAsset(input: NewAssetInput): Promise<Asset | { error: string }> {
  const list = await readIndex();
  const tag = input.assetTag?.trim() || nextTag(list);
  if (list.some((a) => a.assetTag.toLowerCase() === tag.toLowerCase())) {
    return { error: `Asset tag "${tag}" is already used.` };
  }
  const now = new Date();
  const history: AssetEvent[] = [event("Added", input.performedBy, {}, now)];
  if (input.ownerId) history.push(event("Assigned", input.performedBy, { ownerId: input.ownerId }, now));
  const asset: Asset = {
    id: `ast-${Date.now()}`,
    assetTag: tag,
    name: input.name.trim(),
    category: input.category,
    serialNumber: input.serialNumber?.trim() || undefined,
    purchasedOn: input.purchasedOn || undefined,
    status: input.ownerId ? "Assigned" : "Available",
    ownerId: input.ownerId ?? null,
    assignedOn: input.ownerId ? now.toISOString() : undefined,
    history,
  };
  await writeIndex([asset, ...list]);
  return asset;
}

function nextTag(list: Asset[]): string {
  const max = list.reduce((m, a) => {
    const n = Number(a.assetTag.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `AST-${String(max + 1).padStart(4, "0")}`;
}

export type AssetAction = "assign" | "return" | "send-to-repair" | "repair-done" | "retire";

export type TransitionResult = { asset: Asset } | { error: string } | null;

// One write path for every lifecycle move, recording each as a history event.
export async function transitionAsset(
  id: string,
  action: AssetAction,
  performedBy: string,
  employeeId?: string,
): Promise<TransitionResult> {
  const list = await readIndex();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;
  const a = list[index];
  const now = new Date();
  let next: Asset;

  switch (action) {
    case "assign": {
      if (a.status !== "Available") return { error: `Only available assets can be assigned (this one is ${a.status.toLowerCase()}).` };
      if (!employeeId) return { error: "Choose an employee to assign this asset to." };
      next = { ...a, status: "Assigned", ownerId: employeeId, assignedOn: now.toISOString(), history: [event("Assigned", performedBy, { ownerId: employeeId }, now), ...a.history] };
      break;
    }
    case "return": {
      if (a.status !== "Assigned") return { error: "Only assigned assets can be returned." };
      next = { ...a, status: "Available", ownerId: null, assignedOn: undefined, history: [event("Returned", performedBy, { ownerId: null }, now), ...a.history] };
      break;
    }
    case "send-to-repair": {
      if (a.status !== "Available") return { error: "Return the asset from its owner before sending it for repair." };
      next = { ...a, status: "Under repair", history: [event("Sent for repair", performedBy, {}, now), ...a.history] };
      break;
    }
    case "repair-done": {
      if (a.status !== "Under repair") return { error: "This asset isn't under repair." };
      next = { ...a, status: "Available", history: [event("Repaired", performedBy, {}, now), ...a.history] };
      break;
    }
    case "retire": {
      if (a.status === "Retired") return { error: "This asset is already retired." };
      if (a.ownerId) return { error: "Return the asset from its owner before retiring it." };
      next = { ...a, status: "Retired", history: [event("Retired", performedBy, {}, now), ...a.history] };
      break;
    }
  }

  list[index] = next;
  await writeIndex(list);
  return { asset: next };
}
