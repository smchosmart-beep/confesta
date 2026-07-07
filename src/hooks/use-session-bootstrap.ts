import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapSession } from "@/lib/confesta/session-bootstrap.functions";
import { useDeviceId } from "./use-device-id";
import { applyLikeGuards } from "./use-toppings";

/**
 * 세션 진입 시 4개 조회를 단일 batch RPC로 수행하고, 성공한 필드를 각 훅의
 * 캐시 키에 직접 시딩한다. 하위 훅(useSessionToppings, useAnswerPrompts,
 * useToppingGate, useSessionToppingComments)은 캐시가 이미 채워져 있으면
 * 각자의 staleTime 내에서 자체 서버 호출을 건너뛴다.
 *
 * 실패한 필드는 시딩되지 않으며, 해당 훅이 원래 방식대로 자체 fetch로 폴백.
 */
export function useSessionBootstrap(sessionId: string | null) {
  const qc = useQueryClient();
  const deviceId = useDeviceId();
  const bootFn = useServerFn(bootstrapSession);

  return useQuery({
    queryKey: ["session-bootstrap", sessionId, deviceId] as const,
    queryFn: async () => {
      const r = await bootFn({
        data: { sessionId: sessionId!, deviceId: deviceId! },
      });

      if (r.toppings) {
        const guarded = applyLikeGuards(sessionId!, deviceId, r.toppings.toppings);
        qc.setQueryData(["toppings", sessionId, deviceId], {
          ...r.toppings,
          toppings: guarded,
        });
      }
      if (r.prompts) {
        qc.setQueryData(["prompts", sessionId], r.prompts);
      }
      if (r.gate) {
        qc.setQueryData(["gate", sessionId], r.gate);
      }
      if (r.comments) {
        qc.setQueryData(["topping-comments", sessionId, deviceId], r.comments);
      }
      return r;
    },
    enabled: !!sessionId && !!deviceId,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
