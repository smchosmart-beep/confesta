// Pure helpers shared between client and server. No imports from store/zustand.
import type { SessionQRKind, StackedScoop } from "./types";

export const QR_PAYLOAD_PREFIX = "confesta:";
export const MAX_SCOOPS = 3;

export type Period = "am" | "pm";

// Slot key uses `|` as separator so QR payload (`:`-separated) parses cleanly.
export function makeSlotKey(day: number, period: Period, room: string) {
  return `${day}|${period}|${room}`;
}
export function parseSlotKey(
  key: string,
): { day: number; period: Period; room: string } | null {
  const parts = key.split("|");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const period = parts[1];
  if (!Number.isFinite(day) || (period !== "am" && period !== "pm")) return null;
  return { day, period, room: parts.slice(2).join("|") };
}

export function makeOrderQR(slotKey: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}order:${slotKey}:${nonce}`;
}
export function makePickupQR(slotKey: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}pickup:${slotKey}:${nonce}`;
}

export function parseSessionQR(
  payload: string,
): { kind: SessionQRKind; sessionId: string; nonce: string } | null {
  if (!payload.startsWith(QR_PAYLOAD_PREFIX)) return null;
  const parts = payload.split(":");
  if (parts.length !== 4) return null;
  const kind = parts[1];
  if (kind !== "order" && kind !== "pickup") return null;
  return { kind, sessionId: parts[2], nonce: parts[3] };
}

export function makeReceiptToken(scoops: Pick<StackedScoop, "sessionId">[]) {
  const ids = scoops.map((s) => s.sessionId).join("-");
  return `${QR_PAYLOAD_PREFIX}receipt:${ids}:${Date.now().toString(36)}`;
}

export function parseReceiptToken(payload: string) {
  if (!payload.startsWith(`${QR_PAYLOAD_PREFIX}receipt:`)) return null;
  return payload;
}
