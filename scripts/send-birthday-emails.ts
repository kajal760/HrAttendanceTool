// Standalone entry point for scheduling outside of the web server, e.g.
// Windows Task Scheduler running daily at 10:00 AM:
//
//   schtasks /create /tn "HR Attendance Birthday Emails" ^
//     /tr "node -r tsx/cjs \"C:\path\to\project\scripts\send-birthday-emails.ts\"" ^
//     /sc daily /st 10:00
//
// Or, from this folder, just run it manually / via `npm run birthdays:send`.
// Loads `.env.local` first so SMTP_* vars are available outside of Next's
// own env loading (which only applies when the Next server itself runs).

import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { sendBirthdayEmails } from "../src/lib/employee/birthday-mailer";

sendBirthdayEmails()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.configured) {
      console.warn(`\nSMTP is not configured: ${result.skippedReason}`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to send birthday emails:", err);
    process.exit(1);
  });
