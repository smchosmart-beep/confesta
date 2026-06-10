import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const PinRoleSchema = z.enum(["presenter", "staff", "admin"]);

export const verifyPin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ role: PinRoleSchema, pin: z.string().min(1).max(32) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { verifyPinValue, makeCookieValue, cookieName, COOKIE_MAX_AGE } = await import(
      "./pin.server"
    );
    if (!verifyPinValue(data.role, data.pin)) {
      return { ok: false as const };
    }
    setCookie(cookieName(data.role), makeCookieValue(data.role), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      partitioned: true,
    } as Parameters<typeof setCookie>[2]);
    return { ok: true as const };
  });

export const checkPin = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ role: PinRoleSchema }).parse(input))
  .handler(async ({ data }) => {
    const { verifyCookieValue, cookieName } = await import("./pin.server");
    const v = getCookie(cookieName(data.role));
    return { ok: verifyCookieValue(data.role, v) };
  });

export const clearPin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ role: PinRoleSchema }).parse(input))
  .handler(async ({ data }) => {
    const { cookieName } = await import("./pin.server");
    deleteCookie(cookieName(data.role), {
      path: "/",
      secure: true,
      sameSite: "none",
      partitioned: true,
    } as Parameters<typeof deleteCookie>[1]);
    return { ok: true as const };
  });
