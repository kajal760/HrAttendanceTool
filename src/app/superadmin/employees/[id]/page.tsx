import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEmployee, getEmployeeOverviews } from "@/lib/hr/employee-store";
import EmployeeProfile from "@/components/hr/EmployeeProfile";
import { getAttendanceHistory } from "@/lib/hr/attendance-history";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const employee = await getEmployee(id);
  return { title: employee ? `${employee.name} | HR Attendance` : "Employee | HR Attendance" };
}

export default async function EmployeeMasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, allEmployees] = await Promise.all([getEmployee(id), getEmployeeOverviews()]);

  if (!employee) {
    notFound();
  }

  const managerOptions = allEmployees
    .filter((e) => e.id !== id)
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <EmployeeProfile
      employee={employee}
      managerOptions={managerOptions}
      attendance={getAttendanceHistory(employee.id)}
    />
  );
}
