import nodemailer from "nodemailer";
import type { DirectoryPerson } from "../../types/employee";
import { getCompanyDirectory, getTodaysBirthdays } from "./mock-data";
import { getSettings } from "@/lib/hr/settings-store";

// Sends "Happy Birthday" emails for everyone whose birthday is today,
// CC'ing the rest of the company directory. This is the automation behind
// the on-app banner in `BirthdayBanner.tsx`.
//
// Real delivery requires SMTP credentials that only you have - see
// `.env.example` for the variables to set in `.env.local`:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
// Until those are set, this function is a documented no-op: it reports
// what it *would* have sent instead of failing the build/dev server.
//
// Trigger this once a day at 10:00 AM local time, either:
//   - `npm run birthdays:send` via Windows Task Scheduler / cron, or
//   - an HTTP-triggered scheduler (e.g. Vercel Cron) hitting
//     `GET /api/birthdays/notify?token=<CRON_SECRET>`.

export interface BirthdaySendResult {
  configured: boolean;
  sentTo: string[];
  skippedReason?: string;
}

function renderBirthdayEmailHtml(person: DirectoryPerson): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 22px;">🎉 Happy Birthday, ${person.name}!</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #333;">
        Wishing you a fantastic day filled with celebration and joy, from
        everyone at HR Attendance. Thank you for everything you bring to the
        ${person.department} team!
      </p>
      <p style="font-size: 15px; color: #333;">&mdash; Team HR Attendance</p>
    </div>
  `;
}

export async function sendBirthdayEmails(): Promise<BirthdaySendResult> {
  const settings = await getSettings();
  if (!settings.celebrations.birthdaysEnabled) {
    return { configured: true, sentTo: [], skippedReason: "Disabled in settings" };
  }

  const todaysBirthdays = await getTodaysBirthdays();
  if (todaysBirthdays.length === 0) {
    return { configured: true, sentTo: [], skippedReason: "No birthdays today" };
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

  const directory = await getCompanyDirectory();
  const allEmails = directory.map((p) => p.email);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const sentTo: string[] = [];
  for (const person of todaysBirthdays) {
    const cc = allEmails.filter((email) => email !== person.email);
    await transporter.sendMail({
      from: SMTP_FROM,
      to: person.email,
      cc,
      subject: `🎉 Happy Birthday, ${person.name}!`,
      html: renderBirthdayEmailHtml(person),
    });
    sentTo.push(person.email);
  }

  return { configured: true, sentTo };
}
