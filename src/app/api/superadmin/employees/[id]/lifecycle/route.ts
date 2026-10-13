import { NextResponse } from "next/server";
import { buildExitChecklist, getEmployee, patchEmployee } from "@/lib/hr/employee-store";
import { getActiveDepartmentHeadId } from "@/lib/hr/department-store";
import { getUserByEmployeeId, updateUserRole } from "@/lib/auth/user-store";
import type { Role } from "@/types/auth";
import type { ConfirmationStatus, EmployeeStatus, ExitChecklistItemStatus, LifecycleEventType } from "@/types/hr";

export const dynamic = "force-dynamic";

const PERFORMED_BY = "Super Admin"; // TODO: read from the session once auth exists.

const ROLES: Role[] = ["Admin", "HR", "Employee"];
const CONFIRMATION_STATUSES: ConfirmationStatus[] = ["Probation", "Confirmation Due", "Confirmed", "Extended"];
const EXIT_ITEM_STATUSES: ExitChecklistItemStatus[] = ["Pending", "In Progress", "Completed"];

type Action =
  | "complete-onboarding"
  | "confirm"
  | "record-confirmation"
  | "transfer"
  | "promote"
  | "change-designation"
  | "change-manager"
  | "change-role"
  | "initiate-separation"
  | "update-exit-checklist"
  | "finalize-separation"
  | "record-fnf"
  | "deactivate"
  | "delete-record"
  | "change-status"
  | "reactivate"
  | "toggle-onboarding-task";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Every transition below the lifecycle:
// Joining -> Onboarding -> Confirmation -> Transfer/Promotion -> Role change
// -> Separation -> Full & Final settlement
// is one case here: validate it's legal from the employee's current status,
// build a patch + a LifecycleEvent, and hand both to the store's one write
// primitive (`patchEmployee`) so the update and the audit entry land
// atomically.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const action = body?.action as Action | undefined;

  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  switch (action) {
    case "complete-onboarding": {
      if (employee.status !== "Onboarding") {
        return badRequest(`Cannot complete onboarding from status "${employee.status}".`);
      }
      const updated = await patchEmployee(
        id,
        { status: "Probation" as EmployeeStatus },
        { type: "Onboarding completed" as LifecycleEventType, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "confirm": {
      if (employee.status !== "Probation") {
        return badRequest(`Cannot confirm employment from status "${employee.status}".`);
      }
      const updated = await patchEmployee(
        id,
        { status: "Active" as EmployeeStatus, confirmationStatus: "Confirmed", confirmationDate: new Date().toISOString().slice(0, 10) },
        {
          type: "Confirmed",
          previousValue: employee.confirmationStatus ?? "Probation",
          newValue: "Confirmed",
          performedBy: PERFORMED_BY,
        },
      );
      return NextResponse.json({ employee: updated });
    }

    // The Confirmation form in Employment Changes - richer than bare
    // "confirm": records probation/confirmation dates and a status that can
    // land on Confirmed, or stay open as Confirmation Due/Extended. Only a
    // "Confirmed" outcome moves the employee off Probation.
    case "record-confirmation": {
      const { probationStartDate, probationEndDate, confirmationDate, confirmationStatus, remarks } = body ?? {};
      if (!CONFIRMATION_STATUSES.includes(confirmationStatus)) {
        return badRequest(`Confirmation status must be one of: ${CONFIRMATION_STATUSES.join(", ")}.`);
      }
      const patch: Record<string, unknown> = { confirmationStatus };
      if (typeof probationStartDate === "string" && probationStartDate) patch.probationStartDate = probationStartDate;
      if (typeof probationEndDate === "string" && probationEndDate) patch.probationEndDate = probationEndDate;
      if (typeof confirmationDate === "string" && confirmationDate) patch.confirmationDate = confirmationDate;
      if (confirmationStatus === "Confirmed" && employee.status === "Probation") {
        patch.status = "Active" as EmployeeStatus;
      }
      const updated = await patchEmployee(id, patch, {
        type: confirmationStatus === "Confirmed" ? "Confirmed" : "Confirmation updated",
        detail: remarks || undefined,
        previousValue: employee.confirmationStatus ?? "Probation",
        newValue: confirmationStatus,
        performedBy: PERFORMED_BY,
      });
      return NextResponse.json({ employee: updated });
    }

    case "transfer": {
      const { department, designation, location, managerId, effectiveDate, reason, remarks } = body ?? {};
      if (!department && !designation && !location && managerId === undefined) {
        return badRequest("Provide at least one of department, designation, location, or manager.");
      }
      const patch: Record<string, unknown> = {};
      const previous: string[] = [];
      const next: string[] = [];
      if (typeof department === "string" && department.trim() && department.trim() !== employee.department) {
        patch.department = department.trim();
        previous.push(`Dept: ${employee.department}`);
        next.push(`Dept: ${department.trim()}`);
      }
      if (typeof designation === "string" && designation.trim() && designation.trim() !== employee.designation) {
        patch.designation = designation.trim();
        previous.push(`Designation: ${employee.designation}`);
        next.push(`Designation: ${designation.trim()}`);
      }
      if (typeof location === "string" && location.trim() && location.trim() !== employee.location) {
        patch.location = location.trim();
        previous.push(`Location: ${employee.location ?? "-"}`);
        next.push(`Location: ${location.trim()}`);
      }
      // Moving into a department without naming a manager hands them to that
      // department's head - unless they are the head themselves.
      let resolvedManagerId: string | null | undefined = managerId;
      if (managerId === undefined && typeof department === "string" && department.trim() && department.trim() !== employee.department) {
        const head = await getActiveDepartmentHeadId(department.trim());
        if (head && head !== id) resolvedManagerId = head;
      }
      if (resolvedManagerId !== undefined && resolvedManagerId !== employee.managerId) {
        patch.managerId = resolvedManagerId || null;
        previous.push(`Manager: ${employee.managerId ?? "none"}`);
        next.push(`Manager: ${resolvedManagerId || "none"}`);
      }
      const changes: string[] = [...next];
      if (typeof effectiveDate === "string" && effectiveDate) changes.push(`effective ${effectiveDate}`);
      if (typeof reason === "string" && reason.trim()) changes.push(`reason: ${reason.trim()}`);
      if (typeof remarks === "string" && remarks.trim()) changes.push(remarks.trim());
      const updated = await patchEmployee(id, patch, {
        type: "Transferred",
        detail: changes.join(", "),
        previousValue: previous.join(", ") || undefined,
        newValue: next.join(", ") || undefined,
        performedBy: PERFORMED_BY,
      });
      return NextResponse.json({ employee: updated });
    }

    case "promote": {
      const { designation, salary, grade, effectiveDate, reason, remarks } = body ?? {};
      if (typeof designation !== "string" || !designation.trim()) {
        return badRequest("A new designation is required.");
      }
      const patch: Record<string, unknown> = { designation: designation.trim() };
      const previous = [`Designation: ${employee.designation}`];
      const next = [`Designation: ${designation.trim()}`];
      let detail = `New designation: ${designation.trim()}`;
      if (typeof salary === "number" && Number.isFinite(salary) && salary >= 0) {
        patch.salary = salary;
        detail += ` · New salary: ₹${salary.toLocaleString("en-IN")}/yr`;
      }
      if (typeof grade === "string" && grade.trim()) {
        patch.grade = grade.trim();
        previous.push(`Grade: ${employee.grade ?? "-"}`);
        next.push(`Grade: ${grade.trim()}`);
        detail += ` · New grade: ${grade.trim()}`;
      }
      if (typeof effectiveDate === "string" && effectiveDate) detail += ` · Effective ${effectiveDate}`;
      if (typeof reason === "string" && reason.trim()) detail += ` · Reason: ${reason.trim()}`;
      if (typeof remarks === "string" && remarks.trim()) detail += ` · ${remarks.trim()}`;
      const updated = await patchEmployee(id, patch, {
        type: "Promoted",
        detail,
        previousValue: previous.join(", "),
        newValue: next.join(", "),
        performedBy: PERFORMED_BY,
      });
      return NextResponse.json({ employee: updated });
    }

    // Changes which role an employee's *login* resolves to (Admin/HR/
    // Employee) - distinct from `change-designation`, which is their job
    // title. Updates the linked user account for real, if one exists;
    // either way the change is logged so it shows in Activity/Timeline.
    case "change-role": {
      const { newRole, reason } = body ?? {};
      if (!ROLES.includes(newRole)) {
        return badRequest(`Role must be one of: ${ROLES.join(", ")}.`);
      }
      const account = await getUserByEmployeeId(id);
      const previousRole = account?.role;
      if (account) {
        await updateUserRole(id, newRole);
      }
      const updated = await patchEmployee(id, {}, {
        type: "Role changed",
        detail: `${account ? "" : "No login account linked yet"}${reason ? ` · ${reason}` : ""}`.trim() || undefined,
        previousValue: previousRole ?? "No account",
        newValue: newRole,
        performedBy: PERFORMED_BY,
      });
      return NextResponse.json({ employee: updated, accountUpdated: !!account });
    }

    case "change-designation": {
      const { designation } = body ?? {};
      if (typeof designation !== "string" || !designation.trim()) {
        return badRequest("A new designation is required.");
      }
      const updated = await patchEmployee(
        id,
        { designation: designation.trim() },
        { type: "Designation changed", detail: designation.trim(), performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "change-manager": {
      const { managerId } = body ?? {};
      const updated = await patchEmployee(
        id,
        { managerId: managerId || null },
        { type: "Manager changed", performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    // Active <-> On Leave. Moves into or out of separation and onboarding have
    // their own actions with their own checks.
    case "change-status": {
      const target = body?.status;
      const allowed: Record<string, EmployeeStatus[]> = {
        Active: ["On Leave" as EmployeeStatus],
        "On Leave": ["Active" as EmployeeStatus],
      };
      if (employee.deactivated || employee.exit?.deletedOn) {
        return badRequest("This record can't change stage.");
      }
      if (!(allowed[employee.status] ?? []).includes(target)) {
        return badRequest(`Cannot move from "${employee.status}" to "${String(target)}" here.`);
      }
      const updated = await patchEmployee(
        id,
        { status: target as EmployeeStatus },
        { type: "Status changed", detail: `${employee.status} -> ${target}`, previousValue: employee.status, newValue: target, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "initiate-separation": {
      if (!["Active", "On Leave", "Probation"].includes(employee.status)) {
        return badRequest(`Cannot initiate separation from status "${employee.status}".`);
      }
      const { reason, lastWorkingDay, resignationDate, noticePeriodDays, remarks } = body ?? {};
      const updated = await patchEmployee(
        id,
        {
          status: "Notice Period" as EmployeeStatus,
          exit: {
            ...employee.exit,
            initiatedOn: new Date().toISOString(),
            resignationDate: typeof resignationDate === "string" ? resignationDate : undefined,
            reason: typeof reason === "string" ? reason : undefined,
            lastWorkingDay: typeof lastWorkingDay === "string" ? lastWorkingDay : undefined,
            noticePeriodDays:
              typeof noticePeriodDays === "number" && Number.isFinite(noticePeriodDays) ? noticePeriodDays : undefined,
            remarks: typeof remarks === "string" ? remarks : undefined,
            checklist: employee.exit?.checklist ?? buildExitChecklist(),
          },
        },
        { type: "Separation initiated", detail: reason, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    // Toggles one exit-checklist line item (Handover/Assets/Access/HR) - the
    // Separation tab's progress bar is derived client-side from this array,
    // so updating one item here is what actually moves that percentage.
    case "update-exit-checklist": {
      const { itemId, status } = body ?? {};
      if (typeof itemId !== "string" || !itemId) {
        return badRequest("An item id is required.");
      }
      if (!EXIT_ITEM_STATUSES.includes(status)) {
        return badRequest(`Status must be one of: ${EXIT_ITEM_STATUSES.join(", ")}.`);
      }
      const checklist = employee.exit?.checklist ?? buildExitChecklist();
      const item = checklist.find((c) => c.id === itemId);
      if (!item) return badRequest("Unknown checklist item.");
      const updatedChecklist = checklist.map((c) => (c.id === itemId ? { ...c, status } : c));
      const updated = await patchEmployee(
        id,
        { exit: { ...employee.exit, checklist: updatedChecklist } },
        { type: "Exit checklist updated", detail: `${item.label}: ${status}`, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "finalize-separation": {
      if (employee.status !== "Notice Period") {
        return badRequest(`Cannot finalize separation from status "${employee.status}".`);
      }
      const finalStatus: EmployeeStatus = body?.status === "Resigned" ? "Resigned" : "Exited";
      const updated = await patchEmployee(
        id,
        { status: finalStatus },
        { type: "Exited", detail: `Status set to ${finalStatus}`, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "record-fnf": {
      if (!["Resigned", "Exited"].includes(employee.status)) {
        return badRequest("Full & Final settlement can only be recorded after separation.");
      }
      const { amount, notes, settled } = body ?? {};
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
        return badRequest("A valid settlement amount is required.");
      }
      const updated = await patchEmployee(
        id,
        {
          exit: {
            ...employee.exit,
            fnfAmount: amount,
            fnfNotes: typeof notes === "string" ? notes : undefined,
            fnfSettled: Boolean(settled),
          },
        },
        {
          type: "F&F settled",
          detail: `₹${amount.toLocaleString("en-IN")}${settled ? " · settled" : " · pending"}`,
          performedBy: PERFORMED_BY,
        },
      );
      return NextResponse.json({ employee: updated });
    }

    // Deleting moves the record to Exited and locks the login. Nothing is
    // erased - the history stays, and the Lifecycle module lists the record
    // under Separation as a deleted exit.
    case "delete-record": {
      if (employee.exit?.deletedOn) {
        return badRequest("This employee record has already been deleted.");
      }
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        return badRequest("A reason is required to delete an employee record.");
      }
      const deletedOn = new Date().toISOString();
      const updated = await patchEmployee(
        id,
        {
          status: "Exited" as EmployeeStatus,
          deactivated: true,
          exit: { ...employee.exit, deletedOn, deletedReason: reason },
        },
        { type: "Exited", detail: `Record deleted by HR · ${reason}`, performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "deactivate": {
      const updated = await patchEmployee(
        id,
        { deactivated: true },
        { type: "Deactivated", performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "reactivate": {
      const updated = await patchEmployee(
        id,
        { deactivated: false },
        { type: "Reactivated", performedBy: PERFORMED_BY },
      );
      return NextResponse.json({ employee: updated });
    }

    case "toggle-onboarding-task": {
      const { taskId } = body ?? {};
      if (typeof taskId !== "string") {
        return badRequest("A task id is required.");
      }
      const onboardingTasks = employee.onboardingTasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t,
      );
      const updated = await patchEmployee(id, { onboardingTasks });
      return NextResponse.json({ employee: updated });
    }

    default:
      return badRequest(`Unknown action "${String(action)}".`);
  }
}
