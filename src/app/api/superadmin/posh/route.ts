import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getPoshComplaints } from "@/lib/hr/posh-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ complaints: await getPoshComplaints() });
  } catch (err) {
    return errorResponse(err);
  }
}
