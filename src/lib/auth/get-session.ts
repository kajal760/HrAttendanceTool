import { cookies } from "next/headers";
import type { SessionPayload } from "@/types/auth";
import { decodeSession, SESSION_COOKIE } from "./session";

// Server Component / Route Handler helper - reads and verifies the session
// cookie. Returns null when signed out or the cookie fails verification
// (tampered, expired signing secret, ...).
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
