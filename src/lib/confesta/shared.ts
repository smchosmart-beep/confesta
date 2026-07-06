// Pure helpers shared between client and server. No imports from store/zustand.
import type { SessionQRKind, StackedScoop } from "./types";

export const QR_PAYLOAD_PREFIX = "confesta:";
export const MAX_SCOOPS = 3;
// Backward-compatible alias (was previously exported from store.ts).
export const MAX_SCOOPS_CONST = MAX_SCOOPS;

export const PERIODS = ["1000", "1320", "1530"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<Period, string> = {
  "1000": "10:00~11:50",
  "1320": "13:20~15:15",
  "1530": "15:30~17:25",
};
export const PERIOD_SHORT: Record<Period, string> = {
  "1000": "오전",
  "1320": "오후 1교시",
  "1530": "오후 2교시",
};
export function isPeriod(v: string): v is Period {
  return (PERIODS as readonly string[]).includes(v);
}

// Slot key uses `|` as separator so QR payload (`:`-separated) parses cleanly.
export function makeSlotKey(day: number, period: Period, room: string) {
  return `${day}|${period}|${room}`;
}

/**
 * UI 표시용 room 라벨. 내부값(서버 인자/DB/QR 페이로드/쿠키 키)은 그대로 유지하고
 * 렌더링되는 텍스트에서만 "402-A"를 "402"로 통일한다.
 */
export function displayRoom(room: string): string {
  return room === "402-A" ? "402" : room;
}

export function parseSlotKey(
  key: string,
): { day: number; period: Period; room: string } | null {
  const parts = key.split("|");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const period = parts[1];
  if (!Number.isFinite(day) || !isPeriod(period)) return null;
  return { day, period, room: parts.slice(2).join("|") };
}

// QR-encoded as an https deep link so phones' native camera apps open the
// audience page directly. The page reads `?qr=` and processes the payload.
const PUBLIC_SITE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env
      ?.VITE_PUBLIC_SITE_URL) ||
  "https://confesta.lovable.app";

function makeDeepLink(inner: string) {
  return `${PUBLIC_SITE_URL}/audience?qr=${encodeURIComponent(inner)}`;
}

export function makeOrderQR(slotKey: string, nonce: string) {
  return makeDeepLink(`${QR_PAYLOAD_PREFIX}order:${slotKey}:${nonce}`);
}
export function makePickupQR(slotKey: string, nonce: string) {
  return makeDeepLink(`${QR_PAYLOAD_PREFIX}pickup:${slotKey}:${nonce}`);
}

export function parseSessionQR(
  payload: string,
): { kind: SessionQRKind; sessionId: string; nonce: string } | null {
  let inner = payload.trim();
  // Accept https deep link: https://.../audience?qr=confesta:order:...
  if (inner.startsWith("http://") || inner.startsWith("https://")) {
    try {
      const url = new URL(inner);
      const qr = url.searchParams.get("qr");
      if (!qr) return null;
      inner = qr;
    } catch {
      return null;
    }
  }
  if (!inner.startsWith(QR_PAYLOAD_PREFIX)) return null;
  const parts = inner.split(":");
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
