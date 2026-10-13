import { NextResponse } from "next/server";
import Papa from "papaparse";
import { addEmployee, isEmployeeCodeTaken } from "@/lib/hr/employee-store";

export const dynamic = "force-dynamic";

const REQUIRED_COLUMNS = ["employeeCode", "name", "email", "department", "designation", "joinedOn", "age", "salary"];

interface RowError {
  row: number;
  error: string;
}

// Expects a CSV with a header row containing at least: name, email,
// department, designation, joinedOn (YYYY-MM-DD), age, salary. Optional
// columns: managerId, location, workType. Every valid row is added via the
// same `addEmployee` path as the single "Add employee" form, so bulk-added
// hires also start at status "Onboarding" with the default checklist.
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  const header = parsed.meta.fields ?? [];
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missingColumns.length > 0) {
    return NextResponse.json(
      { error: `CSV is missing required columns: ${missingColumns.join(", ")}` },
      { status: 400 },
    );
  }

  const errors: RowError[] = [];
  let added = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header row

    const employeeCode = row.employeeCode?.trim();
    if (!employeeCode) {
      errors.push({ row: rowNum, error: "Missing employeeCode." });
      continue;
    }
    if (await isEmployeeCodeTaken(employeeCode)) {
      errors.push({ row: rowNum, error: `Employee ID "${employeeCode}" is already used.` });
      continue;
    }
    const name = row.name?.trim();
    const email = row.email?.trim();
    const department = row.department?.trim();
    const designation = row.designation?.trim();
    const joinedOn = row.joinedOn?.trim();
    const age = Number(row.age);
    const salary = Number(row.salary);

    if (!name || !email || !department || !designation) {
      errors.push({ row: rowNum, error: "Missing name, email, department, or designation." });
      continue;
    }
    if (!joinedOn || Number.isNaN(Date.parse(joinedOn))) {
      errors.push({ row: rowNum, error: "Invalid joinedOn date." });
      continue;
    }
    if (!Number.isFinite(age) || age < 16 || age > 80) {
      errors.push({ row: rowNum, error: "Invalid age." });
      continue;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      errors.push({ row: rowNum, error: "Invalid salary." });
      continue;
    }

    await addEmployee({
      employeeCode,
      name,
      email,
      department,
      designation,
      joinedOn,
      age,
      salary,
      managerId: row.managerId?.trim() || null,
      location: row.location?.trim() || undefined,
      workType:
        row.workType === "Office" || row.workType === "Hybrid" || row.workType === "WFH"
          ? row.workType
          : undefined,
    });
    added++;
  }

  return NextResponse.json({ added, skipped: errors.length, errors });
}
