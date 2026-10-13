import { NextResponse } from "next/server";
import { getRolesMatrix, saveRolesMatrix } from "@/lib/hr/roles-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ matrix: await getRolesMatrix() });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (typeof body?.matrix !== "object" || body.matrix === null) {
    return NextResponse.json({ error: "A matrix object is required." }, { status: 400 });
  }
  await saveRolesMatrix(body.matrix);
  return NextResponse.json({ matrix: body.matrix });
}
