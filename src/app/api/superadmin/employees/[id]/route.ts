import { NextResponse } from "next/server";
import { getEmployee, isEmployeeCodeTaken, patchEmployee } from "@/lib/hr/employee-store";
import type { EducationRecord, EmployeeCustomField, ExperienceRecord, WorkType } from "@/types/hr";

export const dynamic = "force-dynamic";

const WORK_TYPES: WorkType[] = ["Office", "Hybrid", "WFH"];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB, base64 data URL

function parseCustomFields(value: unknown): EmployeeCustomField[] | null {
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

function isEducationList(value: unknown): value is EducationRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r) =>
        r && typeof r.id === "string" && typeof r.degree === "string" &&
        typeof r.institution === "string" && typeof r.year === "string",
    )
  );
}

function isExperienceList(value: unknown): value is ExperienceRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r) =>
        r && typeof r.id === "string" && typeof r.company === "string" &&
        typeof r.role === "string" && typeof r.durationYears === "number",
    )
  );
}

// Profile-only edits (personal/contact/emergency contact/education/
// experience/work type), plus quick corrections to name/email/joined-on/
// age/salary/custom fields from the Employee Master modal's "Save changes" -
// none of these are lifecycle-significant, so no history entry is appended.
// Department/designation/manager/location changes go through the lifecycle
// route instead so they're audited.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const {
    employeeCode,
    name,
    email,
    joinedOn,
    age,
    salary,
    photoUrl,
    phone,
    personalEmail,
    dateOfBirth,
    gender,
    maritalStatus,
    currentAddress,
    permanentAddress,
    emergencyContact,
    education,
    experience,
    workType,
    skills,
    customFields,
  } = body ?? {};

  const patch: Record<string, unknown> = {};
  if (employeeCode !== undefined) {
    if (typeof employeeCode !== "string" || employeeCode.trim().length === 0) {
      return NextResponse.json({ error: "Employee ID cannot be empty." }, { status: 400 });
    }
    if (await isEmployeeCodeTaken(employeeCode, id)) {
      return NextResponse.json({ error: `Employee ID "${employeeCode.trim()}" is already used by another employee.` }, { status: 409 });
    }
    patch.employeeCode = employeeCode.trim();
  }
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    patch.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    }
    patch.email = email.trim();
  }
  if (joinedOn !== undefined) {
    if (typeof joinedOn !== "string" || Number.isNaN(Date.parse(joinedOn))) {
      return NextResponse.json({ error: "A valid joined-on date is required." }, { status: 400 });
    }
    patch.joinedOn = joinedOn;
  }
  if (age !== undefined) {
    if (typeof age !== "number" || !Number.isFinite(age) || age < 16 || age > 80) {
      return NextResponse.json({ error: "Age must be a number between 16 and 80." }, { status: 400 });
    }
    patch.age = age;
  }
  if (salary !== undefined) {
    if (typeof salary !== "number" || !Number.isFinite(salary) || salary < 0) {
      return NextResponse.json({ error: "Salary must be a positive number." }, { status: 400 });
    }
    patch.salary = salary;
  }
  if (customFields !== undefined) {
    const parsedCustomFields = parseCustomFields(customFields);
    if (parsedCustomFields === null) {
      return NextResponse.json({ error: "Invalid custom fields." }, { status: 400 });
    }
    patch.customFields = parsedCustomFields;
  }
  if (photoUrl !== undefined) {
    if (photoUrl !== null && (typeof photoUrl !== "string" || !photoUrl.startsWith("data:image/"))) {
      return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
    }
    if (typeof photoUrl === "string" && photoUrl.length > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo is too large (max 2MB)." }, { status: 400 });
    }
    patch.photoUrl = photoUrl ?? undefined;
  }
  if (phone !== undefined) patch.phone = String(phone);
  if (personalEmail !== undefined) patch.personalEmail = String(personalEmail);
  if (dateOfBirth !== undefined) patch.dateOfBirth = String(dateOfBirth);
  if (gender !== undefined) patch.gender = String(gender);
  if (maritalStatus !== undefined) patch.maritalStatus = String(maritalStatus);
  if (currentAddress !== undefined) patch.currentAddress = String(currentAddress);
  if (permanentAddress !== undefined) patch.permanentAddress = String(permanentAddress);
  if (emergencyContact !== undefined) {
    const { name, relation, phone: ecPhone } = emergencyContact ?? {};
    patch.emergencyContact = {
      name: String(name ?? ""),
      relation: String(relation ?? ""),
      phone: String(ecPhone ?? ""),
    };
  }
  if (education !== undefined) {
    if (!isEducationList(education)) {
      return NextResponse.json({ error: "Invalid education records." }, { status: 400 });
    }
    patch.education = education;
  }
  if (experience !== undefined) {
    if (!isExperienceList(experience)) {
      return NextResponse.json({ error: "Invalid experience records." }, { status: 400 });
    }
    patch.experience = experience;
  }
  if (workType !== undefined) {
    if (!WORK_TYPES.includes(workType)) {
      return NextResponse.json({ error: "Invalid work type." }, { status: 400 });
    }
    patch.workType = workType;
  }
  if (skills !== undefined) {
    if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string")) {
      return NextResponse.json({ error: "Invalid skills list." }, { status: 400 });
    }
    patch.skills = skills;
  }

  const employee = await patchEmployee(id, patch);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  return NextResponse.json({ employee });
}
