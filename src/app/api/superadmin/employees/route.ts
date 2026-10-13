import { NextResponse } from "next/server";
import { addEmployee, getEmployeeOverviews, isEmployeeCodeTaken } from "@/lib/hr/employee-store";
import { getActiveDepartmentHeadId } from "@/lib/hr/department-store";
import type { EmployeeCustomField } from "@/types/hr";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB, base64 data URL

export async function GET() {
  return NextResponse.json({ employees: await getEmployeeOverviews() });
}

function parseCustomFields(value: unknown): EmployeeCustomField[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const fields: EmployeeCustomField[] = [];
  for (const entry of value) {
    if (!entry || typeof entry.label !== "string" || typeof entry.value !== "string") return null;
    const label = entry.label.trim();
    if (label.length === 0) continue;
    fields.push({ label, value: entry.value.trim() });
  }
  return fields;
}

// Adds a new card to the Employees grid - this is the "Joining" step of the
// lifecycle, so every new hire starts at status "Onboarding" with the
// default checklist (see `employee-store.ts`); status isn't a field on this
// form, it's driven by the lifecycle from here on.
export async function POST(request: Request) {
  const body = await request.json();
  const {
    employeeCode,
    name,
    email,
    department,
    designation,
    joinedOn,
    age,
    salary,
    managerId,
    location,
    workType,
    employmentType,
    probationPeriodMonths,
    customFields,
    photoUrl,
  } = body ?? {};

  if (typeof employeeCode !== "string" || employeeCode.trim().length === 0) {
    return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
  }
  if (await isEmployeeCodeTaken(employeeCode)) {
    return NextResponse.json({ error: `Employee ID "${employeeCode.trim()}" is already used by another employee.` }, { status: 409 });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (typeof department !== "string" || department.trim().length === 0) {
    return NextResponse.json({ error: "Department is required." }, { status: 400 });
  }
  if (typeof designation !== "string" || designation.trim().length === 0) {
    return NextResponse.json({ error: "Designation is required." }, { status: 400 });
  }
  if (typeof joinedOn !== "string" || Number.isNaN(Date.parse(joinedOn))) {
    return NextResponse.json({ error: "A valid joined-on date is required." }, { status: 400 });
  }
  if (typeof age !== "number" || !Number.isFinite(age) || age < 16 || age > 80) {
    return NextResponse.json({ error: "Age must be a number between 16 and 80." }, { status: 400 });
  }
  if (typeof salary !== "number" || !Number.isFinite(salary) || salary < 0) {
    return NextResponse.json({ error: "Salary must be a positive number." }, { status: 400 });
  }
  const parsedCustomFields = parseCustomFields(customFields);
  if (parsedCustomFields === null) {
    return NextResponse.json({ error: "Invalid custom fields." }, { status: 400 });
  }
  if (photoUrl !== undefined && photoUrl !== null) {
    if (typeof photoUrl !== "string" || !photoUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
    }
    if (photoUrl.length > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo is too large (max 2MB)." }, { status: 400 });
    }
  }

  const employee = await addEmployee({
    employeeCode: employeeCode.trim(),
    name: name.trim(),
    email: email.trim(),
    department: department.trim(),
    designation: designation.trim(),
    joinedOn,
    age,
    salary,
    // Not sent at all -> the department head manages them by default. An
    // explicit null/empty value means "no manager" and is honored as-is.
    managerId:
      managerId === undefined
        ? (await getActiveDepartmentHeadId(department.trim())) ?? null
        : typeof managerId === "string" && managerId.length > 0
          ? managerId
          : null,
    location: typeof location === "string" && location.trim().length > 0 ? location.trim() : undefined,
    workType: workType === "Office" || workType === "Hybrid" || workType === "WFH" ? workType : undefined,
    employmentType: typeof employmentType === "string" && employmentType.trim() ? employmentType.trim() : undefined,
    probationPeriodMonths:
      typeof probationPeriodMonths === "number" && Number.isFinite(probationPeriodMonths) && probationPeriodMonths >= 0
        ? probationPeriodMonths
        : undefined,
    customFields: parsedCustomFields,
    photoUrl: typeof photoUrl === "string" ? photoUrl : undefined,
  });

  return NextResponse.json({ employee }, { status: 201 });
}
