import { NextResponse } from "next/server";
import { getUsers } from "@/lib/auth/user-store";

export const dynamic = "force-dynamic";

// Minimal account list for the Lifecycle module's Role Change form - just
// enough to show "this employee's login is currently HR" without ever
// shipping password hashes to the client.
export async function GET() {
  const users = await getUsers();
  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, email: u.email, role: u.role, name: u.name, employeeId: u.employeeId })),
  });
}
