import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route gate. Passes the current path in headers so server components can
// adapt context.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  function redirectTo(newPathname: string) {
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    return NextResponse.redirect(url);
  }

  // Root just lands on the real login page - it decides for itself whether
  // to show the sign-in form or redirect an already-signed-in session to
  // their portal (see src/app/login/page.tsx). `/login` itself is NOT
  // force-redirected here anymore - it used to be, as a "skip login
  // entirely" dev convenience, but that meant the sign-in form could never
  // actually render, no matter what was typed into it.
  if (pathname === "/") {
    return redirectTo("/login");
  }

  // Pass current pathname to downstream server components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/", "/superadmin/:path*", "/hr/:path*", "/employee/:path*", "/login", "/api/:path*"],
};
