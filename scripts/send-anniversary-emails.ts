// Standalone entry point for scheduling outside of the web server - mirrors
// `send-birthday-emails.ts` exactly. Windows Task Scheduler running daily
// at 10:00 AM:
//
//   schtasks /create /tn "HR Attendance Anniversary Emails" ^
//     /tr "node -r tsx/cjs \"C:\path\to\project\scripts\send-anniversary-emails.ts\"" ^
//     /sc daily /st 10:00
//
// Or, from this folder, just run it manually / via `npm run anniversaries:send`.

import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { sendAnniversaryEmails } from "../src/lib/hr/anniversary-mailer";

sendAnniversaryEmails()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.configured) {
      console.warn(`\nSMTP is not configured: ${result.skippedReason}`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to send anniversary emails:", err);
    process.exit(1);
  });
