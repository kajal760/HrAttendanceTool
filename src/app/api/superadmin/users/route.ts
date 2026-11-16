import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { createUserLogin } from "@/lib/auth/user-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Matches the Roles & Permissions matrix's "Create HR / Employee login
// accounts" feature, which defaults to HR (and Admin) only.
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "HR" && session?.role !== "Admin") {
    return NextResponse.json({ error: "Only HR can create login accounts." }, { status: 403 });
  }

  const body = await request.json();
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "HR" || body?.role === "Employee" ? body.role : null;

  if (!employeeId || !email || !password || !role) {
    return NextResponse.json({ error: "An employee, email, password, and role are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await createUserLogin({ employeeId, email, password, role });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
