import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setAudienceRole } from "@/lib/confesta/audienceRole.functions";
import type { AudienceRole } from "@/lib/confesta/audienceRole";
import { AUDIENCE_ROLE_KEYS } from "@/lib/confesta/audienceRole";
import { useDeviceId } from "./use-device-id";

const STORAGE_KEY = "confesta:audience-role";

export type AudienceRoleState = "loading" | "none" | AudienceRole;

function readStored(): AudienceRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && (AUDIENCE_ROLE_KEYS as string[]).includes(v)) return v as AudienceRole;
    return null;
  } catch {
    return null;
  }
}

/**
 * 디바이스 단위 청중 역할 (localStorage). 첫 렌더는 "loading" → 깜빡임 방지.
 * setRole 호출 시 localStorage 기록 + 백그라운드 서버 upsert.
 */
export function useAudienceRole() {
  const deviceId = useDeviceId();
  const setOnServer = useServerFn(setAudienceRole);
  const [state, setState] = useState<AudienceRoleState>("loading");

  useEffect(() => {
    const stored = readStored();
    setState(stored ?? "none");
  }, []);

  const setRole = useCallback(
    (role: AudienceRole) => {
      // Skip server call when nothing changed.
      const prev = readStored();
      try {
        window.localStorage.setItem(STORAGE_KEY, role);
      } catch {
        // ignore
      }
      setState(role);
      if (prev === role) return;
      if (!deviceId) return;
      // fire-and-forget; UI doesn't wait
      setOnServer({ data: { deviceId, role } }).catch((e) => {
        console.error("setAudienceRole failed", e);
      });
    },
    [deviceId, setOnServer],
  );

  const clearRole = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState("none");
  }, []);

  return { state, setRole, clearRole };
}
