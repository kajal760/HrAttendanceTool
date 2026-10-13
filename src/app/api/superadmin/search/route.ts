import { NextResponse } from "next/server";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getDepartments } from "@/lib/hr/department-store";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getSession } from "@/lib/auth/get-session";
import { withBase, type PortalBase } from "@/lib/portal";

export const dynamic = "force-dynamic";

const MAX_PER_GROUP = 6;

// A handful of top-level pages that aren't records in a store - matching
// these lets the search bar also act as a quick-jump/command-palette for
// site sections, not just data. Relative - prefixed with whichever base
// (`/hr` or `/superadmin`) the caller is signed in under.
const PAGES = [
  { label: "All Employees", href: "/employees" },
  { label: "Org Structure", href: "/employees/org" },
  { label: "Employee Lifecycle", href: "/employees/lifecycle" },
  { label: "Department", href: "/employees/department" },
  { label: "Roles & Permissions", href: "/employees/roles" },
  { label: "Work & Projects", href: "/work" },
  { label: "Tasks", href: "/work/tasks" },
  { label: "Workload", href: "/work/workload" },
  { label: "Announcements", href: "/announcements" },
  { label: "Activity Log", href: "/log" },
  { label: "Reports", href: "/reports" },
];

function matches(q: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ employees: [], departments: [], announcements: [], projects: [], tasks: [], pages: [] });
  }

  const session = await getSession();
  const base: PortalBase = session?.role === "HR" ? "/hr" : "/superadmin";

  const [employees, departments, announcements, projects, tasks] = await Promise.all([
    getEmployeeOverviews(),
    getDepartments(),
    getAnnouncements(),
    getProjects(),
    getTasks(),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return NextResponse.json({
    employees: employees
      .filter((e) => matches(q, e.name, e.email, e.department, e.designation, e.employeeCode))
      .slice(0, MAX_PER_GROUP)
      .map((e) => ({ id: e.id, label: e.name, meta: `${e.employeeCode} · ${e.designation} · ${e.department}`, href: withBase(base, `/employees/${e.id}`) })),

    departments: departments
      .filter((d) => matches(q, d.name, d.description))
      .slice(0, MAX_PER_GROUP)
      .map((d) => ({ id: d.id, label: d.name, meta: d.archived ? "Archived" : "Department", href: withBase(base, `/employees/department/${d.id}`) })),

    announcements: announcements
      .filter((a) => matches(q, a.title))
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({ id: a.id, label: a.title, meta: a.type, href: withBase(base, `/announcements/${a.id}`) })),

    projects: projects
      .filter((p) => matches(q, p.name, p.description))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ id: p.id, label: p.name, meta: "Project", href: withBase(base, "/work") })),

    tasks: tasks
      .filter((t) => matches(q, t.title, t.description))
      .slice(0, MAX_PER_GROUP)
      .map((t) => ({
        id: t.id,
        label: t.title,
        meta: projectsById.get(t.projectId)?.name ?? "Task",
        href: withBase(base, "/work/tasks"),
      })),

    pages: PAGES.filter((p) => matches(q, p.label))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ ...p, href: withBase(base, p.href) })),
  });
}
