import { useEffect } from "react";
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
} from "@/lib/confesta/realtime-channel";

const DEFAULT: Omit<ToppingGateDTO, "sessionId"> = {
  questionsOpen: true,
  answersOpen: false,
  activePromptId: null,
};

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
    return subscribeGate(sessionId, () =>
      qc.invalidateQueries({ queryKey: ["gate", sessionId] }),
    );
  }, [sessionId, qc]);

  const update = useMutation({
    mutationFn: (patch: { questionsOpen?: boolean; answersOpen?: boolean }) =>
      setFn({ data: { sessionId: sessionId!, ...patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const gate: ToppingGateDTO = data ?? { sessionId: sessionId ?? "", ...DEFAULT };
  return { gate, setGate: update.mutate };
}
