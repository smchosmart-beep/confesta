import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAnswerPrompts,
  createAnswerPrompt as createFn,
  updateAnswerPrompt as updateFn,
  closeAnswerPrompt as closeFn,
  reopenAnswerPrompt as reopenFn,
  deleteAnswerPrompt as deleteFnSrv,
  type AnswerPromptDTO,
} from "@/lib/confesta/prompts.functions";
import {
  subscribePrompts,
  useRealtimeHealth,
  type RealtimePayload,
} from "@/lib/confesta/realtime-channel";

type PromptRow = {
  id: string;
  session_id: string;
  text: string;
  created_at: string;
  closed_at: string | null;
};

function toDTO(r: PromptRow): AnswerPromptDTO {
  return {
    id: r.id,
    sessionId: r.session_id,
    text: r.text,
    createdAt: new Date(r.created_at).getTime(),
    closedAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
  };
}

export function useAnswerPrompts(sessionId: string | null) {
  const qc = useQueryClient();
  const listSrv = useServerFn(listAnswerPrompts);
  const createSrv = useServerFn(createFn);
  const updateSrv = useServerFn(updateFn);
  const closeSrv = useServerFn(closeFn);
  const reopenSrv = useServerFn(reopenFn);
  const deleteSrv = useServerFn(deleteFnSrv);

  const queryKey = ["prompts", sessionId] as const;
  const healthy = useRealtimeHealth("prompts", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: () => listSrv({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 15_000,
    refetchOnWindowFocus: !healthy,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: healthy ? false : 60_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribePrompts(sessionId, (payload: RealtimePayload) => {
      try {
        const type = payload.eventType;
        const key = ["prompts", sessionId] as const;

        if (type === "DELETE") {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (!oldId) return;
          const prev = qc.getQueryData<{ prompts: AnswerPromptDTO[] }>(key);
          if (!prev) return;
          const next = prev.prompts.filter((p) => p.id !== oldId);
          if (next.length !== prev.prompts.length) {
            qc.setQueryData(key, { prompts: next });
          }
          return;
        }

        const row = payload.new as PromptRow | null;
        if (!row?.id) return;
        const dto = toDTO(row);
        const prev = qc.getQueryData<{ prompts: AnswerPromptDTO[] }>(key);
        if (!prev) {
          qc.setQueryData(key, { prompts: [dto] });
          return;
        }
        const idx = prev.prompts.findIndex((p) => p.id === row.id);
        let next: AnswerPromptDTO[];
        if (idx >= 0) {
          next = prev.prompts.slice();
          next[idx] = dto;
        } else {
          // 서버 정렬: created_at DESC
          next = [dto, ...prev.prompts];
        }
        qc.setQueryData(key, { prompts: next });
      } catch {
        qc.invalidateQueries({ queryKey: ["prompts", sessionId] });
      }
    });
  }, [sessionId, qc]);

  // 채널 재연결 시 놓친 이벤트 동기화 (false→true 전이만)
  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey: ["prompts", sessionId] });
    }
  }, [healthy, sessionId, qc]);

  const create = useMutation({
    mutationFn: (text: string) => createSrv({ data: { sessionId: sessionId!, text } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const update = useMutation({
    mutationFn: (input: { promptId: string; text: string }) => updateSrv({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const close = useMutation({
    mutationFn: (promptId: string) => closeSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const reopen = useMutation({
    mutationFn: (promptId: string) => reopenSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const remove = useMutation({
    mutationFn: (promptId: string) => deleteSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const prompts: AnswerPromptDTO[] = data?.prompts ?? [];

  return {
    prompts,
    create: create.mutateAsync,
    update: update.mutate,
    close: close.mutate,
    reopen: reopen.mutate,
    remove: remove.mutate,
  };
}
