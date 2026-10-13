import { NextResponse } from "next/server";
import { getEmployee, patchEmployee } from "@/lib/hr/employee-store";
import { getSession } from "@/lib/auth/get-session";
import type { EmergencyContact, EmployeeOverview } from "@/types/hr";

export const dynamic = "force-dynamic";

// Fields an employee may edit on their own record. Employment/financial
// fields (department, designation, salary, manager, status, ...) stay
// HR/Manager-only via /superadmin - see ContactDetails.tsx's comment.
const EDITABLE_FIELDS: { key: keyof EmployeeOverview; label: string }[] = [
  { key: "phone", label: "Phone" },
  { key: "personalEmail", label: "Personal email" },
  { key: "currentAddress", label: "Current address" },
  { key: "permanentAddress", label: "Permanent address" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "maritalStatus", label: "Marital status" },
];

function cleanString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// `employeeId` comes from the session, not the request body - one employee
// can't edit another's record by passing a different id.
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const employee = await getEmployee(session.employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
  }

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  const changedLabels: string[] = [];

  for (const { key, label } of EDITABLE_FIELDS) {
    if (!(key in (body ?? {}))) continue;
    const next = cleanString(body[key]) ?? "";
    const previous = employee[key];
    if (next !== (previous ?? "")) {
      patch[key] = next || undefined;
      changedLabels.push(label);
    }
  }

  if (body?.emergencyContact && typeof body.emergencyContact === "object") {
    const nextContact: EmergencyContact = {
      name: cleanString(body.emergencyContact.name) ?? "",
      relation: cleanString(body.emergencyContact.relation) ?? "",
      phone: cleanString(body.emergencyContact.phone) ?? "",
    };
    const prevContact = employee.emergencyContact;
    const changed =
      !prevContact ||
      prevContact.name !== nextContact.name ||
      prevContact.relation !== nextContact.relation ||
      prevContact.phone !== nextContact.phone;
    if (changed) {
      patch.emergencyContact =
        nextContact.name || nextContact.relation || nextContact.phone ? nextContact : undefined;
      changedLabels.push("Emergency contact");
    }
  }

  if (changedLabels.length === 0) {
    return NextResponse.json({ employee, changed: false });
  }

  // Logged as a real lifecycle/audit entry on the employee's own record -
  // the same trail HR/the manager sees on the Super Admin side for every
  // other change, and what feeds the Activity Log (`describeLifecycleEvent`
  // in log-store.ts). This is the "notified to the upper department" the
  // UI tells the employee about after saving.
  const updated = await patchEmployee(session.employeeId, patch, {
    type: "Profile updated by employee",
    detail: `Updated: ${changedLabels.join(", ")}`,
    performedBy: employee.name,
  });

  return NextResponse.json({ employee: updated, changed: true });
}
