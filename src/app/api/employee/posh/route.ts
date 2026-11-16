import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addPoshComplaint, getPoshComplaintsForEmployee } from "@/lib/hr/posh-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Anonymous complaints are never attributed to the submitting employee (see
// posh-store.ts), so an anonymous filer can't look their own one up again
// here - only their non-anonymous history is returned.
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    const complaints = await getPoshComplaintsForEmployee(session.employeeId);
    return NextResponse.json({ complaints });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const respondent = typeof body?.respondent === "string" ? body.respondent.trim() : "";
  const anonymous = body?.anonymous === true;

  if (description.length < 10) {
    return NextResponse.json({ error: "Please describe the incident (at least 10 characters)." }, { status: 400 });
  }

  try {
    const complaint = await addPoshComplaint({
      anonymous,
      respondent: respondent || undefined,
      description,
    });
    return NextResponse.json({ complaint }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
