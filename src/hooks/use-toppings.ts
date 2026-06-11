import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listToppings,
  addTopping as addToppingFn,
  toggleLikeTopping as toggleLikeFn,
  togglePinTopping as togglePinFn,
  toggleAddressedTopping as toggleAddressedFn,
  deleteOwnTopping as deleteOwnFn,
  type ToppingDTO,
} from "@/lib/confesta/toppings.functions";
import { useDeviceId } from "./use-device-id";
import {
  subscribeToppings,
  useRealtimeHealth,
} from "@/lib/confesta/realtime-channel";

export function useSessionToppings(sessionId: string | null) {
  const deviceId = useDeviceId();
  const qc = useQueryClient();
  const listFn = useServerFn(listToppings);
  const addFn = useServerFn(addToppingFn);
  const likeFn = useServerFn(toggleLikeFn);
  const pinFn = useServerFn(togglePinFn);
  const addrFn = useServerFn(toggleAddressedFn);
  const deleteFn = useServerFn(deleteOwnFn);

  const queryKey = ["toppings", sessionId, deviceId] as const;
  const healthy = useRealtimeHealth("toppings", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({ data: { sessionId: sessionId!, deviceId: deviceId ?? undefined } }),
    enabled: !!sessionId,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: healthy ? false : 30_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToppings(sessionId, () =>
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
    );
  }, [sessionId, qc]);

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
    mutationFn: (toppingId: string) =>
      pinFn({ data: { sessionId: sessionId!, toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const toggleAddressed = useMutation({
    mutationFn: (toppingId: string) =>
      addrFn({ data: { sessionId: sessionId!, toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const deleteOwnMut = useMutation({
    mutationFn: (toppingId: string) =>
      deleteFn({ data: { deviceId: deviceId!, toppingId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
  });

  const submit = useCallback(
    async (text: string, kind: "question" | "answer" = "question", promptId?: string) => {
      const r = await addTopping.mutateAsync({ text, kind, promptId });
      return r;
    },
    [addTopping],
  );

  const deleteOwn = useCallback(
    (toppingId: string) => deleteOwnMut.mutateAsync(toppingId),
    [deleteOwnMut],
  );

  return useMemo(
    () => ({
      toppings,
      ready: !!deviceId && !!sessionId,
      submit,
      toggleLike: toggleLike.mutate,
      togglePin: togglePin.mutate,
      toggleAddressed: toggleAddressed.mutate,
      deleteOwn,
    }),
    [toppings, deviceId, sessionId, submit, toggleLike.mutate, togglePin.mutate, toggleAddressed.mutate, deleteOwn],
  );
}
