import { NextResponse } from "next/server";
import { sendAnniversaryEmails } from "@/lib/hr/anniversary-mailer";

export const dynamic = "force-dynamic";

// Mirrors `/api/birthdays/notify` exactly - meant to be hit once a day at
// 10:00 AM local time by an HTTP-triggered scheduler, protected by the same
// CRON_SECRET.
//
//   GET /api/anniversaries/notify?token=<CRON_SECRET>
//   (or header: Authorization: Bearer <CRON_SECRET>)
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendAnniversaryEmails();
  return NextResponse.json(result);
}
