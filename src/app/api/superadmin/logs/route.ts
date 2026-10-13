import { NextResponse } from "next/server";
import { getSystemLogs } from "@/lib/superadmin/log-store";

export const dynamic = "force-dynamic";

// Polled by the Log page's client component every 5 minutes (and on demand
// via "Refresh now"). See `src/lib/superadmin/log-store.ts` for the mock
// data behind this - swap that module for a real log query once one exists.
export async function GET() {
  return NextResponse.json({
    logs: await getSystemLogs(),
    fetchedAt: new Date().toISOString(),
  });
}
