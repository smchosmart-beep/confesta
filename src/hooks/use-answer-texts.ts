import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  listAnswerTextsBySession,
  type AnswerTextItem,
} from "@/lib/confesta/toppings.functions";
import {
  subscribeToppings,
  useRealtimeHealth,
  type RealtimePayload,
} from "@/lib/confesta/realtime-channel";

type ToppingRow = {
  id: string;
  session_id?: string;
  text?: string;
  kind?: string;
  prompt_id?: string | null;
  created_at?: string;
};

/**
 * 세션의 응답 텍스트만 집계로 반환. 파이차트/워드클라우드/응답 카운트 소스.
 * - 개별 응답 메타(좋아요/핀/삭제)는 포함하지 않음 — 청중 열람용 최소 payload.
 * - realtime로 answer kind 이벤트만 델타 반영.
 */
export function useSessionAnswerTexts(sessionId: string | null) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAnswerTextsBySession);
  const queryKey = ["answer-texts", sessionId] as const;
  const healthy = useRealtimeHealth("toppings", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: async () => fetchFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 15_000,
    refetchOnWindowFocus: !healthy,
    refetchOnReconnect: true,
    refetchInterval: healthy ? false : 60_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToppings(sessionId, (payload: RealtimePayload) => {
      try {
        const type = payload.eventType;

        // DELETE: old row에는 kind가 없을 수 있으니 id로 매칭 후 제거
        if (type === "DELETE") {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (!oldId) return;
          const prev = qc.getQueryData<{ items: AnswerTextItem[] }>(queryKey);
          if (!prev) return;
          const next = prev.items.filter((i) => i.id !== oldId);
          if (next.length !== prev.items.length) {
            qc.setQueryData(queryKey, { items: next });
          }
          return;
        }

        const row = payload.new as ToppingRow | null;
        if (!row?.id || row.kind !== "answer") return;

        const prev = qc.getQueryData<{ items: AnswerTextItem[] }>(queryKey);
        if (!prev) return;

        const item: AnswerTextItem = {
          id: row.id,
          text: row.text ?? "",
          promptId: row.prompt_id ?? null,
          createdAt: row.created_at
            ? new Date(row.created_at).getTime()
            : Date.now(),
        };

        const idx = prev.items.findIndex((i) => i.id === row.id);
        if (idx >= 0) {
          const nextArr = prev.items.slice();
          nextArr[idx] = item;
          qc.setQueryData(queryKey, { items: nextArr });
        } else if (type === "INSERT") {
          qc.setQueryData(queryKey, { items: [item, ...prev.items] });
        } else {
          // UPDATE인데 캐시에 없다 → 서버가 이미 필터에 포함시켰을 수 있으니 재조회
          qc.invalidateQueries({ queryKey });
        }
      } catch {
        qc.invalidateQueries({ queryKey });
      }
    });
  }, [sessionId, qc, queryKey]);

  // 채널 재연결 시 재조회
  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey });
    }
  }, [healthy, sessionId, qc, queryKey]);

  return {
    items: (data?.items ?? []) as AnswerTextItem[],
    ready: !!sessionId,
  };
}
