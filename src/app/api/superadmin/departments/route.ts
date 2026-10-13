import { NextResponse } from "next/server";
import { addDepartment, getDepartmentNames, getDepartments } from "@/lib/hr/department-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [departments, { names, activeNames }] = await Promise.all([getDepartments(), getDepartmentNames()]);
  return NextResponse.json({ departments, names, activeNames });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, headId } = body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "A department name is required." }, { status: 400 });
  }

  const result = await addDepartment({
    name,
    description: typeof description === "string" ? description : undefined,
    headId: typeof headId === "string" && headId.length > 0 ? headId : null,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ department: result }, { status: 201 });
}
