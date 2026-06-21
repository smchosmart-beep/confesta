import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AUDIENCE_ROLE_KEYS } from "./audienceRole";

const DeviceIdSchema = z.string().uuid();
const RoleSchema = z.enum(AUDIENCE_ROLE_KEYS as [string, ...string[]]);

export const setAudienceRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema, role: RoleSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("audience_devices")
      .upsert(
        {
          device_id: data.deviceId,
          role: data.role as "teacher" | "specialist" | "parent" | "other",
          last_seen: new Date().toISOString(),
        },
        { onConflict: "device_id" },
      );
    if (error) throw error;
    return { ok: true as const };
  });
