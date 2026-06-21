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
import type { AudienceRole } from "@/lib/confesta/audienceRole";
import { useDeviceId } from "./use-device-id";
import { useAudienceRole } from "./use-audience-role";
import {
  subscribeToppings,
  useRealtimeHealth,
} from "@/lib/confesta/realtime-channel";

export function useSessionToppings(sessionId: string | null) {
  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
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
    }) => {
      const role: AudienceRole | undefined =
        roleState === "loading" || roleState === "none"
          ? undefined
          : roleState;
      return addFn({
        data: {
          deviceId: deviceId!,
          sessionId: sessionId!,
          text: input.text,
          kind: input.kind,
          promptId: input.promptId,
          role,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: (toppingId: string) =>
      likeFn({ data: { deviceId: deviceId!, toppingId } }),
    // 작성자 본인 포함 모든 청중이 누를 수 있음. 낙관 업데이트로 즉시 반영.
    onMutate: async (toppingId: string) => {
      await qc.cancelQueries({ queryKey: ["toppings", sessionId] });
      const snapshots = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: ["toppings", sessionId],
      });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === toppingId
              ? {
                  ...t,
                  likedByMe: !t.likedByMe,
                  likes: Math.max(0, (t.likes ?? 0) + (t.likedByMe ? -1 : 1)),
                }
              : t,
          ),
        });
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) {
        qc.setQueryData(key, prev);
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] });
    },
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
