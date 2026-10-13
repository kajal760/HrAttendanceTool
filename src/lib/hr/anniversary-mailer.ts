import nodemailer from "nodemailer";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getSettings } from "@/lib/hr/settings-store";
import { getTodaysAnniversaries, type UpcomingAnniversary } from "@/lib/hr/anniversaries";

// Work Anniversary email - the same mechanism as `birthday-mailer.ts`
// (same SMTP env vars, same to-person/CC-everyone shape), just keyed off
// `joinedOn` instead of a birthdate. See that file's header comment for the
// `.env.local` setup and the two ways to trigger this daily at 10:00 AM.

export interface AnniversarySendResult {
  configured: boolean;
  sentTo: string[];
  skippedReason?: string;
}

function renderAnniversaryEmailHtml(person: UpcomingAnniversary): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 22px;">🎉 Happy ${person.years}-Year Work Anniversary, ${person.name}!</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #333;">
        Congratulations on ${person.years} year${person.years === 1 ? "" : "s"} with us! Thank you for everything
        you bring to the ${person.department} team, from everyone at HR Attendance.
      </p>
      <p style="font-size: 15px; color: #333;">&mdash; Team HR Attendance</p>
    </div>
  `;
}

export async function sendAnniversaryEmails(): Promise<AnniversarySendResult> {
  const settings = await getSettings();
  if (!settings.celebrations.anniversariesEnabled) {
    return { configured: true, sentTo: [], skippedReason: "Disabled in settings" };
  }

  const todaysAnniversaries = await getTodaysAnniversaries();
  if (todaysAnniversaries.length === 0) {
    return { configured: true, sentTo: [], skippedReason: "No work anniversaries today" };
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return {
      configured: false,
      sentTo: [],
      skippedReason:
        "SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM in .env.local (see .env.example).",
    };
  }

  const employees = await getEmployeeOverviews();
  const allEmails = employees.map((e) => e.email);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const sentTo: string[] = [];
  for (const person of todaysAnniversaries) {
    const cc = allEmails.filter((email) => email !== person.email);
    await transporter.sendMail({
      from: SMTP_FROM,
      to: person.email,
      cc,
      subject: `🎉 Happy ${person.years}-Year Work Anniversary, ${person.name}!`,
      html: renderAnniversaryEmailHtml(person),
    });
    sentTo.push(person.email);
  }

  return { configured: true, sentTo };
}
