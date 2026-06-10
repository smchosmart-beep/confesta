// Shared PIN-cookie role assertion for serverFn handlers.
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
