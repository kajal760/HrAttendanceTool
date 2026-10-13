import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { transitionAsset, type AssetAction } from "@/lib/hr/asset-store";

export const dynamic = "force-dynamic";

const ACTIONS: AssetAction[] = ["assign", "return", "send-to-repair", "repair-done", "retire"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Only admin or HR can change assets." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const action = body?.action as AssetAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const result = await transitionAsset(id, action, session.name, typeof body?.employeeId === "string" ? body.employeeId : undefined);
  if (result === null) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ asset: result.asset });
}
