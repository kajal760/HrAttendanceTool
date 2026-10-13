import { NextResponse } from "next/server";
import { addLeaveRequest, getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { getEmployee } from "@/lib/hr/employee-store";
import { getSession } from "@/lib/auth/get-session";
import { LEAVE_CATEGORIES, type LeaveCategory } from "@/types/employee";

export const dynamic = "force-dynamic";

function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({ requests: await getLeaveRequestsForEmployee(session.employeeId) });
}

// employeeId/employeeName come from the session, never the request body, so
// one employee can't apply for leave on another's behalf.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const { category, startDate, endDate, reason } = body ?? {};

  if (typeof category !== "string" || !LEAVE_CATEGORIES.includes(category as LeaveCategory)) {
    return NextResponse.json({ error: "Choose a valid leave type." }, { status: 400 });
  }
  if (typeof startDate !== "string" || typeof endDate !== "string" || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 });
  }
  const days = daysBetween(startDate, endDate);
  if (days <= 0) {
    return NextResponse.json({ error: "End date must be on or after the start date." }, { status: 400 });
  }
  if (typeof reason !== "string" || reason.trim().length < 10) {
    return NextResponse.json({ error: "Please add a short reason (10+ characters)." }, { status: 400 });
  }

  const employee = await getEmployee(session.employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
  }

  const result = await addLeaveRequest({
    employeeId: session.employeeId,
    employeeName: employee.name,
    category: category as LeaveCategory,
    startDate,
    endDate,
    days,
    reason: reason.trim(),
  });

  if (result === "overlap") {
    return NextResponse.json({ error: "You already have a pending or approved leave request overlapping these dates." }, { status: 409 });
  }
  return NextResponse.json({ request: result }, { status: 201 });
}
