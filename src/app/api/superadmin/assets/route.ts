import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { addAsset, getAssets } from "@/lib/hr/asset-store";
import { ASSET_CATEGORIES, type AssetCategory } from "@/types/asset";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ assets: await getAssets() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Only admin or HR can add assets." }, { status: 401 });
  }
  const body = await request.json();
  const { name, category, assetTag, serialNumber, purchasedOn, ownerId } = body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
  }
  if (!ASSET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (purchasedOn !== undefined && purchasedOn !== "" && Number.isNaN(Date.parse(purchasedOn))) {
    return NextResponse.json({ error: "Invalid purchase date." }, { status: 400 });
  }
  const result = await addAsset({
    name,
    category: category as AssetCategory,
    assetTag: typeof assetTag === "string" ? assetTag : undefined,
    serialNumber: typeof serialNumber === "string" ? serialNumber : undefined,
    purchasedOn: typeof purchasedOn === "string" && purchasedOn ? purchasedOn : undefined,
    ownerId: typeof ownerId === "string" && ownerId ? ownerId : null,
    performedBy: session.name,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ asset: result }, { status: 201 });
}
