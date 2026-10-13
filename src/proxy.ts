import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { portalBaseForRole } from "@/lib/portal";

// Route gate for the three portal bases - `middleware.ts` was renamed to
// `proxy.ts` in Next.js 16 (same behavior, see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Narrow matcher by design: only the paths that actually need gating, so
// this never has to reason about static assets or API routes.
//
// `/hr` and `/superadmin` serve the exact same page tree (see
// `next.config.ts`'s rewrite) - this just decides which URL a signed-in
// Admin/HR user is allowed to see, redirecting the other way if they land
// on the wrong one. Runs before the rewrite, so it only ever sees the
// original `/hr` or `/superadmin` path the browser actually requested.
//
// Every redirect below clones `nextUrl` and only changes `pathname`, so the
// query string (e.g. a `?module=` log filter, or Announcements' `?status=`)
// always survives the bounce.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);

  function redirectTo(newPathname: string) {
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    if (session) return redirectTo(portalBaseForRole(session.role));
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/employee") && session.role !== "Employee") {
    return redirectTo(portalBaseForRole(session.role) + pathname.replace(/^\/employee/, ""));
  }
  if (session.role === "Employee" && (pathname.startsWith("/superadmin") || pathname.startsWith("/hr"))) {
    return redirectTo("/employee");
  }
  if (pathname.startsWith("/superadmin") && session.role === "HR") {
    return redirectTo(pathname.replace(/^\/superadmin/, "/hr"));
  }
  if (pathname.startsWith("/hr") && session.role === "Admin") {
    return redirectTo(pathname.replace(/^\/hr/, "/superadmin"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*", "/hr/:path*", "/employee/:path*", "/login"],
};
