# 세션 부하 최적화 — 최종 확정본 (19개 보정)

## 배경
30명 규모 동시 세션에서 질문/댓글/좋아요 폭주 시 발생하는 DB·네트워크 과부하를 3축(리스트 API / Realtime patch / 서버 캐시)으로 완화. 3차 재검토를 거쳐 발견한 부작용 리스크는 모두 커버됨.

## 확정된 19개 보정

**1차 (기본 3축 + 정합성 5개)**
1. LIMIT 도입 시 통계·워드클라우드는 별도 집계 함수로 분리
2. Realtime payload patch에 drift 안전망 유지 (→ R5에서 idle-based로 재설계)
3. 본인 이벤트 dedupe용 `op_id` 도입
4. 프롬프트 텍스트 변경은 patch 대신 관련 캐시 invalidate
5. 서버 인메모리 캐시는 정적 데이터만 (`topping_gates` 제외)
6. `useInfiniteQuery` 전환 스킵 — 하드캡만 적용, 소비자 API 유지
7. UPDATE payload는 `likedByMe` 절대 미변경 — Like Guard 침범 방지
8. `op_id` 컬럼 추가 + `toggle_topping_like` 오버로드 (하위호환)
9. 댓글 훅 상위 통합 스킵 — refCount+RQ dedupe로 이미 충분

**2차 (부작용 완화)**
10. LIMIT 쿼리에 `pinned OR addressed` 무조건 포함 — 발표자 pinned 소실 방지
11. Realtime patch 시 promptText는 클라 프롬프트 캐시 lookup — 라벨 공백 방지
12. 관리자 전용 무제한 리스트 함수 `list_all_toppings_admin` 신설
13. `session_slots` 서버 캐시 제외 — 비밀번호 변경/잠금 즉시성 보장
14. drift 안전망을 "마지막 이벤트 후 90s idle" 방식으로 재설계
15. `audience_devices` UPSERT skip 간격은 사용처 감사 후 확정

**3차 (롤아웃/사각지대)**
16. RPC는 `_v2` 신규 이름으로 병행 배포 후 구버전 DROP — 무중단 롤아웃
17. idle 안전망 타이머는 마운트 시 즉시 시동 — 조용한 세션 drift 방지
18. Realtime 요금은 변화 없음 (문서화)
19. 착수 전 supabase linter로 RLS/publication 정합 사전 확인

## 최종 부작용·비용 매트릭스

| 리스크 | 상태 |
|---|---|
| 발표자 pinned 소실 | ✅ 보정 10 |
| 답변 라벨 공백 | ✅ 보정 11 |
| 관리자 데이터 손실 | ✅ 보정 12 |
| slot 인증 지연 | ✅ 보정 13 |
| 안전망 트래픽 급증 | ✅ 보정 14 (idle) |
| 참여자 카운트 왜곡 | ✅ 보정 15 (감사) |
| RPC 시그니처 변경 500 | ✅ 보정 16 (v2 병행) |
| 조용한 세션 drift | ✅ 보정 17 (마운트 시동) |
| Realtime 요금 증가 | ✅ 보정 18 (무변화) |
| RLS/publication 미정합 | ✅ 보정 19 (사전확인) |
| Data API 요청량 | ▼ 60~80% 감소 |
| Realtime 메시지 수 | = 변화 없음 |
| 스토리지·CPU | ▼ payload 축소·JOIN·인덱스로 감소 |
| 기존 기능 회귀 | 소비자 API·RPC 오버로드로 최소화 |

## 파일 목록
- `supabase/migrations/*`
  - 인덱스 3개 추가 (`toppings(session_id, created_at DESC)`, `topping_likes(device_id, topping_id)`, `topping_comments(session_id, created_at)`) + 중복 인덱스 2개 제거
  - `toppings.op_id UUID`, `topping_comments.op_id UUID` 컬럼 추가
  - `list_toppings_with_my_like_v2` 신설 (JOIN + prompt_text + `pinned OR addressed OR LIMIT 100`)
  - `toggle_topping_like` `_op_id` 인자 오버로드
  - 집계 함수 신설(`aggregate_answers_by_prompt`, `count_toppings_by_role`)
  - `list_all_toppings_admin` 신설
- `src/lib/confesta/toppings.functions.ts` · `comments.functions.ts` · `prompts.functions.ts` — v2 호출, LIMIT/op_id/관리자 경로
- `src/lib/confesta/realtime-channel.ts` — payload 콜백 전달, debounce 600ms±200ms jitter
- `src/hooks/use-toppings.ts` · `use-topping-comments.ts` · `use-answer-prompts.ts` — idle 안전망(마운트 시동), op_id 생성/전달, UPDATE patch 규칙(`likedByMe` 보호), promptText 캐시 lookup, `staleTime 15s` + `refetchOnWindowFocus: !healthy`
- `src/hooks/use-audience.ts` — UPSERT skip 간격(감사 반영)
- `src/components/confesta/SlotToppingsModal.tsx` — 관리자 무제한 함수 사용

## 진행 순서
1. supabase linter로 RLS/publication 사전 확인 · `audience_devices.last_seen_at` 사용처 감사
2. 마이그레이션 승인/실행(v2 신설, 오버로드, 인덱스, op_id 컬럼) → 타입 재생성
3. 클라이언트 v2 전환 + LIMIT/op_id/JOIN/promptText lookup
4. Realtime 채널 payload 전파 + 훅 idle 안전망(마운트 시동)
5. audience_devices 캐시, SlotToppingsModal 관리자 경로 교체
6. 안정화 후 후속 마이그레이션에서 구 RPC DROP
7. 실세션 모니터링(pinned 표시, 답변 라벨, slot 인증, 안전망 실요청량, likes 정합, Realtime 재연결)
