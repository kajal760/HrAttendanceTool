import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { transitionAsset, updateAsset, type AssetAction } from "@/lib/hr/asset-store";
import { ASSET_CATEGORIES, type AssetCategory } from "@/types/asset";

export const dynamic = "force-dynamic";

const ACTIONS: AssetAction[] = ["assign", "return", "send-to-repair", "repair-done", "retire"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const action = body?.action as AssetAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  try {
    const asset = await transitionAsset(id, action, typeof body?.employeeId === "string" ? body.employeeId : undefined);
    return NextResponse.json({ asset });
  } catch (err) {
    return errorResponse(err);
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

// Edits the inventory-sheet detail fields only (make/model/department/
// vendor/warranty/notes/...) - identity and lifecycle go through their own
// dedicated flows (POST above, and the create route) so they keep producing
// history entries.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { category, name, purchasedOn } = body ?? {};
  if (category !== undefined && !ASSET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (purchasedOn !== undefined && purchasedOn !== "" && Number.isNaN(Date.parse(purchasedOn))) {
    return NextResponse.json({ error: "Invalid purchase date." }, { status: 400 });
  }
  try {
    const asset = await updateAsset(id, {
      name: typeof name === "string" ? name : undefined,
      category: category as AssetCategory | undefined,
      purchasedOn: str(purchasedOn),
      deviceMake: str(body?.deviceMake),
      model: str(body?.model),
      serialNumber: str(body?.serialNumber),
      department: str(body?.department),
      employmentStatus:
        body?.employmentStatus === "Employee" || body?.employmentStatus === "Consultant"
          ? body.employmentStatus
          : undefined,
      vendor: str(body?.vendor),
      invoiceDetails: str(body?.invoiceDetails),
      warrantyStartDate: str(body?.warrantyStartDate),
      warrantyEndDate: str(body?.warrantyEndDate),
      notes: str(body?.notes),
    });
    return NextResponse.json({ asset });
  } catch (err) {
    return errorResponse(err);
  }
}
