import { AsyncLocalStorage } from "node:async_hooks";
import { getSession } from "@/lib/auth/get-session";

// Server-side client for the FastAPI backend (`../Hr Attendance Backend`).
// Every call is made from the Next.js server with the signed-in user's
// bearer token, which lives inside the httpOnly session cookie - the browser
// never talks to the backend directly or sees the token.

export const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8010/api/v1").replace(/\/$/, "");

export class BackendError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  form?: FormData;
  query?: Query;
  // Override the session token (used by the login route, before a session exists).
  token?: string | null;
}

const serviceScope = new AsyncLocalStorage<true>();
let adminTokenCache: { value: string; expiresAt: number } | null = null;
let employeeTokenCache: { value: string; expiresAt: number } | null = null;

export function asServiceAccount<T>(fn: () => Promise<T>): Promise<T> {
  return serviceScope.run(true, fn);
}

// Breaking change: the backend dropped email+password login (`/auth/login`)
// for mobile number + OTP, and an OTP can't reach a service account. This
// call now 401s and silently falls through to the `catch` below (dev-bypass
// token), so cron jobs using `asServiceAccount` (e.g. the anniversary
// mailer) go quiet instead of crashing. Needs a real machine-to-machine
// credential - out of scope for the login-page update; see the backend's
// README ("Breaking change / machine-to-machine auth").
export async function getAdminToken(): Promise<string> {
  if (adminTokenCache && adminTokenCache.expiresAt > Date.now() + 60_000) return adminTokenCache.value;
  try {
    const email = process.env.BACKEND_SERVICE_EMAIL ?? "admin@hrattendance.example";
    const password = process.env.BACKEND_SERVICE_PASSWORD ?? "admin123";
    const data = await backend<{ accessToken: string; expiresIn: number }>("/auth/login", {
      method: "POST",
      body: { email, password },
      token: null,
    });
    adminTokenCache = { value: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000 };
    return data.accessToken;
  } catch {
    return "dev-bypass-token";
  }
}

export async function getEmployeeToken(): Promise<string> {
  if (employeeTokenCache && employeeTokenCache.expiresAt > Date.now() + 60_000) return employeeTokenCache.value;
  try {
    const data = await backend<{ accessToken: string; expiresIn: number }>("/auth/login", {
      method: "POST",
      body: { email: "sameer.iyer@hrattendance.example", password: "employee123" },
      token: null,
    });
    employeeTokenCache = { value: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000 };
    return data.accessToken;
  } catch {
    return "dev-bypass-token";
  }
}

async function resolveToken(
  override: string | null | undefined,
): Promise<{ token: string | null; fromSession: boolean; debugRole?: string }> {
  if (override !== undefined) return { token: override, fromSession: false };
  if (serviceScope.getStore()) return { token: await getAdminToken(), fromSession: false };
  const session = await getSession();

  // Email-OTP login is wired up end-to-end now (see @/components/auth/LoginForm and
  // /api/auth/otp/verify) - a real, unexpired signed-in session always wins.
  if (session?.accessToken && session.accessToken !== "dev-bypass-token") {
    return { token: session.accessToken, fromSession: true };
  }

  // TEMPORARY route-testing bypass: no real session, so impersonate the
  // seeded demo login for whichever portal this request belongs to (the
  // dev-bypass fallback session from `getSession()` always carries a role)
  // - the backend's matching `_debug_bypass_user` (app/api/deps.py) maps
  // this role to a real seeded user. Lets every page across all 3 portals
  // stay browsable in development without signing in; disabled outright in
  // production by the backend side of this bypass.
  if (session?.role === "Employee") {
    return { token: await getEmployeeToken(), fromSession: false, debugRole: "Employee" };
  }
  if (session?.role === "HR") {
    return { token: await getAdminToken(), fromSession: false, debugRole: "HR" };
  }
  return { token: await getAdminToken(), fromSession: false, debugRole: "Admin" };
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BACKEND_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    // FastAPI request-validation errors: [{loc, msg}, ...]
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg: string }) => d.msg).join(" ");
  } catch {
    // not JSON
  }
  return res.statusText || "The server returned an error.";
}

export async function backendRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  const { token, debugRole } = await resolveToken(options.token);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (debugRole) headers["X-Debug-Role"] = debugRole; // TEMPORARY - see resolveToken

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    throw new BackendError(503, "Can't reach the HR backend. Is it running?");
  }

  if (!res.ok) throw new BackendError(res.status, await errorDetail(res));
  return res;
}

export async function backend<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await backendRaw(path, options);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Route-handler helper: turn a BackendError into the `{ error }` JSON shape
// every existing API route and client component already expects.
export function errorResponse(err: unknown): Response {
  if (err instanceof BackendError) {
    return Response.json({ error: err.detail }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
