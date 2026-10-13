"use client";

import { usePathname } from "next/navigation";
import { basePathFrom, type PortalBase } from "@/lib/portal";

// Whichever base (`/hr` or `/superadmin`) the current URL is actually
// under - nav components use this to build links that keep an HR user on
// `/hr/*` and an Admin user on `/superadmin/*`, instead of hardcoding one.
export function usePortalBase(): PortalBase {
  return basePathFrom(usePathname());
}
