import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, isDemoMode } from "../db/client";
import type { AdminUser } from "../types";
import { verifyPassword } from "./password";

export const SESSION_COOKIE = "blanc_admin";
const SESSION_HOURS = 12;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (isDemoMode()) return "blanc-demo-session-secret-change-me-before-launch!!";
  throw new Error("SESSION_SECRET (min 32 characters) must be set when a database is configured.");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(uid: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ uid, exp: now + SESSION_HOURS * 3600_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined, now = Date.now()): { uid: string } | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    if (!data.uid || data.exp < now) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}

export async function getAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const rows = await db.query<{ id: string; email: string; name: string; role: "owner" | "staff" }>(
    `select id, email, name, role from admin_users where id = $1 and active`,
    [session.uid]
  );
  return rows[0] ?? null;
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(role?: "owner"): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin?denied=1");
  return admin;
}

// Simple in-memory brute-force protection (per server instance).
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60_000;
const MAX_ATTEMPTS = 8;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export function rateLimited(key: string, max = MAX_ATTEMPTS, windowMs = WINDOW): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.first > windowMs) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  a.count++;
  return a.count > max;
}

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  if (rateLimited(`login:${ip}`)) return { ok: false, error: "Too many attempts. Please wait 15 minutes and try again." };
  const db = await getDb();
  const rows = await db.query<{ id: string; password_hash: string | null }>(
    `select id, password_hash from admin_users where lower(email) = lower($1) and active`,
    [email.trim()]
  );
  const ok = await verifyPassword(password, rows[0]?.password_hash ?? "scrypt$AAAA$AAAA");
  if (!rows[0] || !ok) return { ok: false, error: "Incorrect email or password." };
  await db.query(`update admin_users set last_login_at = now() where id = $1`, [rows[0].id]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(rows[0].id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
