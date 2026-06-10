import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getToppingGate,
  setToppingGate as setGateFn,
  type ToppingGateDTO,
} from "@/lib/confesta/gates.functions";

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
  const { data } = useQuery({
    queryKey,
    queryFn: () => getFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 3_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`gate:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "topping_gates", filter: `session_id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, qc]);

  const update = useMutation({
    mutationFn: (patch: { questionsOpen?: boolean; answersOpen?: boolean }) =>
      setFn({ data: { sessionId: sessionId!, ...patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const gate: ToppingGateDTO = data ?? { sessionId: sessionId ?? "", ...DEFAULT };
  return { gate, setGate: update.mutate };
}
