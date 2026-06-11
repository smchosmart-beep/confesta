// Shared cookie-based role assertions for serverFn handlers.
// Server-only — must be imported lazily inside .handler() to avoid client bundle leak.
import { getCookie } from "@tanstack/react-start/server";
import type { PinRole } from "./pin.server";

export async function assertRole(role: PinRole) {
  const { verifyCookieValue, cookieName } = await import("./pin.server");
  const v = getCookie(cookieName(role));
  if (!verifyCookieValue(role, v)) {
    throw new Error(`Unauthorized: ${role} PIN required`);
  }
}

/** Per-session presenter slot authorization. The unlock cookie is issued
 *  by `unlockPresenterSlot` after the per-session password is verified. */
export async function assertPresenterSlot(sessionId: string) {
  const { slotCookieName, verifySlotCookieValue } = await import("./presenterSlot.server");
  const v = getCookie(slotCookieName(sessionId));
  if (!verifySlotCookieValue(sessionId, v)) {
    throw new Error("Unauthorized: presenter slot password required");
  }
}
