// PIN cookie helpers — server-only (filename guard).
import crypto from "node:crypto";

export type PinRole = "presenter" | "staff" | "admin";

const COOKIE_PREFIX = "confesta_pin_";
const COOKIE_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  const s = process.env.CONFESTA_SESSION_SECRET;
  if (!s) throw new Error("CONFESTA_SESSION_SECRET not set");
  return s;
}

function getRolePin(role: PinRole) {
  const map: Record<PinRole, string | undefined> = {
    presenter: process.env.PRESENTER_PIN,
    staff: process.env.STAFF_PIN,
    admin: process.env.ADMIN_PIN,
  };
  const pin = map[role];
  if (!pin) throw new Error(`${role.toUpperCase()}_PIN not set`);
  return pin;
}

export function verifyPinValue(role: PinRole, pin: string): boolean {
  try {
    const expected = getRolePin(role);
    const a = Buffer.from(pin);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function cookieName(role: PinRole) {
  return `${COOKIE_PREFIX}${role}`;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function makeCookieValue(role: PinRole) {
  const issuedAt = Date.now();
  const payload = `${role}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyCookieValue(role: PinRole, value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [r, issuedAt, sig] = parts;
  if (r !== role) return false;
  const payload = `${r}.${issuedAt}`;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > COOKIE_TTL_SECONDS * 1000) return false;
  return true;
}

export const COOKIE_MAX_AGE = COOKIE_TTL_SECONDS;
