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

      // 조건부 시딩: 각 하위 훅의 캐시가 비어 있을 때만 초기값을 주입한다.
      // 이미 캐시가 존재하면(=하위 훅이 자체 fetch/mutation/realtime으로 최신
      // 상태를 유지 중이면) 스테일한 bootstrap 응답이 최신 상태를 덮어써
      // 낙관 업데이트가 되돌려지는 회귀를 방지한다.
      if (r.toppings) {
        const key = ["toppings", sessionId, deviceId] as const;
        if (qc.getQueryData(key) == null) {
          const guarded = applyLikeGuards(sessionId!, deviceId, r.toppings.toppings);
          qc.setQueryData(key, { ...r.toppings, toppings: guarded });
        }
      }
      if (r.prompts) {
        const key = ["prompts", sessionId] as const;
        if (qc.getQueryData(key) == null) qc.setQueryData(key, r.prompts);
      }
      if (r.gate) {
        const key = ["gate", sessionId] as const;
        if (qc.getQueryData(key) == null) qc.setQueryData(key, r.gate);
      }
      if (r.commentCounts) {
        const key = ["comment-counts", sessionId] as const;
        if (qc.getQueryData(key) == null) {
          qc.setQueryData(key, { counts: r.commentCounts });
        }
      }
      return r;
    },
    enabled: !!sessionId && !!deviceId,
    // 세션 진입 1회만 실행. 이후 각 하위 훅의 realtime/refetch/mutation이
    // 개별 캐시의 최신성을 책임진다. 재실행되면 시딩 로직이 스테일 데이터로
    // 캐시를 덮어쓸 위험이 있어 refetch를 원천 차단한다.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

