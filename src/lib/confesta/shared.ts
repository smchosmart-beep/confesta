// Pure helpers shared between client and server. No imports from store/zustand.
import type { SessionQRKind, StackedScoop } from "./types";

export const QR_PAYLOAD_PREFIX = "confesta:";
export const MAX_SCOOPS = 3;

export function makeOrderQR(sessionId: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}order:${sessionId}:${nonce}`;
}
export function makePickupQR(sessionId: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}pickup:${sessionId}:${nonce}`;
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
