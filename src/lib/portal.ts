import type { Role } from "@/types/auth";

// HR and Admin see the exact same pages (no permission split yet - see
// `types/auth.ts`'s comment), just under a different URL: HR lands on
// `/hr`, Admin on `/superadmin`. A `next.config.ts` rewrite maps every
// `/hr/*` request onto the real `/superadmin/*` route tree, so no page is
// duplicated - this file is the single source of truth for which base a
// role/pathname belongs to, used on both the server (redirects) and the
// client (nav hrefs).

export type PortalBase = "/hr" | "/superadmin";

export function portalBaseForRole(role: Role): PortalBase | "/employee" {
  if (role === "Employee") return "/employee";
  return role === "HR" ? "/hr" : "/superadmin";
}

export function basePathFrom(pathname: string): PortalBase {
  return pathname === "/hr" || pathname.startsWith("/hr/") ? "/hr" : "/superadmin";
}

// Removes whichever base prefix is present, leaving a leading-slash
// relative path ("/employees", or "/" for the bare base).
export function stripBase(pathname: string): string {
  const stripped = pathname.replace(/^\/(hr|superadmin)(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

export function withBase(base: PortalBase, relativeHref: string): string {
  return relativeHref === "/" ? base : `${base}${relativeHref}`;
}
