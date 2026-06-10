import { useCallback, useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listToppings,
  addTopping as addToppingFn,
  toggleLikeTopping as toggleLikeFn,
  togglePinTopping as togglePinFn,
  toggleAddressedTopping as toggleAddressedFn,
  type ToppingDTO,
} from "@/lib/confesta/toppings.functions";
import { useDeviceId } from "./use-device-id";

export function useSessionToppings(sessionId: string | null) {
  const deviceId = useDeviceId();
  const channelId = useId();
  const qc = useQueryClient();
  const listFn = useServerFn(listToppings);
  const addFn = useServerFn(addToppingFn);
  const likeFn = useServerFn(toggleLikeFn);
  const pinFn = useServerFn(togglePinFn);
  const addrFn = useServerFn(toggleAddressedFn);

  const queryKey = ["toppings", sessionId, deviceId] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({ data: { sessionId: sessionId!, deviceId: deviceId ?? undefined } }),
    enabled: !!sessionId,
    staleTime: 5_000,
  });

  // Realtime: refetch on any change touching this session
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`toppings:${sessionId}:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "toppings", filter: `session_id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "topping_likes" },
        () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, qc, channelId]);

  const toppings: ToppingDTO[] = data?.toppings ?? [];

  const addTopping = useMutation({
    mutationFn: (input: {
      text: string;
      kind?: "question" | "answer";
      promptId?: string;
    }) =>
      addFn({
        data: {
          deviceId: deviceId!,
          sessionId: sessionId!,
          text: input.text,
          kind: input.kind,
          promptId: input.promptId,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const toggleLike = useMutation({
    mutationFn: (toppingId: string) =>
      likeFn({ data: { deviceId: deviceId!, toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const togglePin = useMutation({
    mutationFn: (toppingId: string) => pinFn({ data: { toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const toggleAddressed = useMutation({
    mutationFn: (toppingId: string) => addrFn({ data: { toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const submit = useCallback(
    async (text: string, kind: "question" | "answer" = "question", promptId?: string) => {
      const r = await addTopping.mutateAsync({ text, kind, promptId });
      return r;
    },
    [addTopping],
  );

  return useMemo(
    () => ({
      toppings,
      ready: !!deviceId && !!sessionId,
      submit,
      toggleLike: toggleLike.mutate,
      togglePin: togglePin.mutate,
      toggleAddressed: toggleAddressed.mutate,
    }),
    [toppings, deviceId, sessionId, submit, toggleLike.mutate, togglePin.mutate, toggleAddressed.mutate],
  );
}
