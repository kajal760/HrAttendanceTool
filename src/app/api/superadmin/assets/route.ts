import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addAsset, getAssets } from "@/lib/hr/asset-store";
import { ASSET_CATEGORIES, type AssetCategory } from "@/types/asset";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ assets: await getAssets() });
  } catch (err) {
    return errorResponse(err);
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    category,
    assetTag,
    serialNumber,
    purchasedOn,
    ownerId,
    deviceMake,
    model,
    department,
    employmentStatus,
    vendor,
    invoiceDetails,
    warrantyStartDate,
    warrantyEndDate,
    notes,
  } = body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
  }
  if (!ASSET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (purchasedOn !== undefined && purchasedOn !== "" && Number.isNaN(Date.parse(purchasedOn))) {
    return NextResponse.json({ error: "Invalid purchase date." }, { status: 400 });
  }
  try {
    const asset = await addAsset({
      name,
      category: category as AssetCategory,
      assetTag: str(assetTag),
      serialNumber: str(serialNumber),
      purchasedOn: str(purchasedOn),
      ownerId: typeof ownerId === "string" && ownerId ? ownerId : null,
      deviceMake: str(deviceMake),
      model: str(model),
      department: str(department),
      employmentStatus: employmentStatus === "Employee" || employmentStatus === "Consultant" ? employmentStatus : undefined,
      vendor: str(vendor),
      invoiceDetails: str(invoiceDetails),
      warrantyStartDate: str(warrantyStartDate),
      warrantyEndDate: str(warrantyEndDate),
      notes: str(notes),
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
