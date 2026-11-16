import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addHoliday, getCompanyHolidays } from "@/lib/hr/holidays";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ holidays: await getCompanyHolidays() });
  } catch (err) {
    return errorResponse(err);
  }
}

// Same HR-only rule as the org registry (departments/designations/locations).
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "HR") {
    return NextResponse.json({ error: "Only HR can manage holidays." }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const date = typeof body?.date === "string" ? body.date : "";
  const type = body?.type === "Public" || body?.type === "Optional" ? body.type : null;
  if (!name || !date || !type) {
    return NextResponse.json({ error: "A name, date, and type are required." }, { status: 400 });
  }

  try {
    const holiday = await addHoliday({ name, date, type });
    return NextResponse.json({ holiday }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
