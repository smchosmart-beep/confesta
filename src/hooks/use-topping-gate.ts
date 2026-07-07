import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getToppingGate,
  setToppingGate as setGateFn,
  type ToppingGateDTO,
} from "@/lib/confesta/gates.functions";
import {
  subscribeGate,
  useRealtimeHealth,
  type RealtimePayload,
} from "@/lib/confesta/realtime-channel";

const DEFAULT: Omit<ToppingGateDTO, "sessionId"> = {
  questionsOpen: true,
  answersOpen: false,
  activePromptId: null,
};

type GateRow = {
  session_id: string;
  questions_open: boolean;
  answers_open: boolean;
  active_prompt_id: string | null;
};

function rowToDTO(r: GateRow): ToppingGateDTO {
  return {
    sessionId: r.session_id,
    questionsOpen: !!r.questions_open,
    answersOpen: !!r.answers_open,
    activePromptId: r.active_prompt_id ?? null,
  };
}

export function useToppingGate(sessionId: string | null) {
  const qc = useQueryClient();
  const getFn = useServerFn(getToppingGate);
  const setFn = useServerFn(setGateFn);

  const queryKey = ["gate", sessionId] as const;
  const healthy = useRealtimeHealth("gate", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: () => getFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 3_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: healthy ? false : 30_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeGate(sessionId, (payload: RealtimePayload) => {
      try {
        const key = ["gate", sessionId] as const;
        if (payload.eventType === "DELETE") {
          qc.setQueryData(key, { sessionId, ...DEFAULT });
          return;
        }
        const row = payload.new as GateRow | null;
        if (!row?.session_id) return;
        qc.setQueryData(key, rowToDTO(row));
      } catch {
        qc.invalidateQueries({ queryKey: ["gate", sessionId] });
      }
    });
  }, [sessionId, qc]);

  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey: ["gate", sessionId] });
    }
  }, [healthy, sessionId, qc]);

  const update = useMutation({
    mutationFn: (patch: { questionsOpen?: boolean; answersOpen?: boolean }) =>
      setFn({ data: { sessionId: sessionId!, ...patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const gate: ToppingGateDTO = data ?? { sessionId: sessionId ?? "", ...DEFAULT };
  return { gate, setGate: update.mutate };
}
