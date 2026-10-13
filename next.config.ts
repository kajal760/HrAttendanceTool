import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // HR and Admin share the exact same page tree (`src/app/superadmin/...`)
  // but land on different URLs - `/hr` for HR, `/superadmin` for Admin (see
  // `src/lib/portal.ts`). This rewrite serves the real `/superadmin/*`
  // route tree for any `/hr/*` request, so no page file is duplicated.
  // `proxy.ts` runs before rewrites and isn't re-run on the rewritten path,
  // so this can't loop.
  async rewrites() {
    return [{ source: "/hr/:path*", destination: "/superadmin/:path*" }];
  },
};

export default nextConfig;
