// Per-session presenter password + slot cookie helpers — server-only (filename guard).
import crypto from "node:crypto";

const COOKIE_PREFIX = "confesta_ps_";
const COOKIE_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  const s = process.env.CONFESTA_SESSION_SECRET;
  if (!s) throw new Error("CONFESTA_SESSION_SECRET not set");
  return s;
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Cookie name is namespaced by session id (truncated hash to keep header small). */
export function slotCookieName(sessionId: string) {
  const h = crypto.createHash("sha1").update(sessionId).digest("hex").slice(0, 16);
  return `${COOKIE_PREFIX}${h}`;
}

/** Hash a password for storage. */
export function hashPassword(password: string) {
  return hmac(`pw:${password}`);
}

export function passwordsMatch(stored: string, candidate: string) {
  const a = Buffer.from(stored);
  const b = Buffer.from(hashPassword(candidate));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function makeSlotCookieValue(sessionId: string) {
  const issuedAt = Date.now();
  const payload = `${sessionId}.${issuedAt}`;
  return `${payload}.${hmac(`slot:${payload}`)}`;
}

export function verifySlotCookieValue(
  sessionId: string,
  value: string | undefined | null,
): boolean {
  return inspectSlotCookieValue(sessionId, value).ok;
}

export type SlotCookieInspection =
  | { ok: true; ageMs: number }
  | {
      ok: false;
      reason:
        | "no-cookie"
        | "bad-format"
        | "sid-mismatch"
        | "bad-signature"
        | "bad-age";
      ageMs?: number;
    };

export function inspectSlotCookieValue(
  sessionId: string,
  value: string | undefined | null,
): SlotCookieInspection {
  if (!value) return { ok: false, reason: "no-cookie" };
  const idx = value.lastIndexOf(".");
  if (idx < 0) return { ok: false, reason: "bad-format" };
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const dot = payload.lastIndexOf(".");
  if (dot < 0) return { ok: false, reason: "bad-format" };
  const sid = payload.slice(0, dot);
  const issuedAt = payload.slice(dot + 1);
  if (sid !== sessionId) return { ok: false, reason: "sid-mismatch" };
  let expected: string;
  try {
    expected = hmac(`slot:${payload}`);
  } catch {
    return { ok: false, reason: "bad-signature" };
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > COOKIE_TTL_SECONDS * 1000) {
    return { ok: false, reason: "bad-age", ageMs };
  }
  return { ok: true, ageMs };
}


export const SLOT_COOKIE_MAX_AGE = COOKIE_TTL_SECONDS;

