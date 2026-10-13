import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionPayload } from "@/types/auth";

export const SESSION_COOKIE = "hr_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

// TODO: require this from the environment once there's a real deployment
// target - a hardcoded fallback is fine for `next dev`/a local prototype
// but would let anyone forge a session if shipped as-is.
const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

// A signed cookie, not a JWT - no external dependency needed for something
// this simple: base64url(JSON) + "." + HMAC-SHA256 of that string, verified
// with a constant-time comparison so this doesn't become its own timing
// side-channel.
export function encodeSession(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${json}.${sign(json)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expected = sign(json);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}
