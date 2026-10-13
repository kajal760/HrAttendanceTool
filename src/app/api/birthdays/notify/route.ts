import { NextResponse } from "next/server";
import { sendBirthdayEmails } from "@/lib/employee/birthday-mailer";

export const dynamic = "force-dynamic";

// Meant to be hit once a day at 10:00 AM local time by an HTTP-triggered
// scheduler (e.g. Vercel Cron - see vercel.json). Protected by CRON_SECRET
// so it can't be triggered by anyone who finds the URL.
//
//   GET /api/birthdays/notify?token=<CRON_SECRET>
//   (or header: Authorization: Bearer <CRON_SECRET>)
//
// If you're running on a plain Node/Windows box instead, prefer
// `npm run birthdays:send` on a scheduled task - it doesn't need the
// server running or a secret at all.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendBirthdayEmails();
  return NextResponse.json(result);
}
