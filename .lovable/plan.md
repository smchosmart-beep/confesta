# 주문 카드 세션명 미표시 버그 수정

## 원인

`audience.functions.ts`의 제목 조회 맵이 키를 `1-am-402-A`(하이픈) 형식으로 만들지만, 주문의 session_id는 `1|am|402-A`(파이프) 형식입니다. 형식이 달라 제목이 절대 매칭되지 않고 항상 방 이름으로 폴백됩니다.

데이터베이스에는 제목이 정상적으로 저장되어 있음을 확인했습니다 (예: "402호 A 행사명", "LEWEST A Hall 행사명").

## 수정 내용

`src/lib/confesta/audience.functions.ts` — `byKey` 맵 키를 `${r.day}|${r.period}|${r.room}` (파이프 구분)으로 변경하여 session_id 형식과 일치시킵니다. 한 줄 수정입니다.

## 참고

현재 보고 계신 화면은 **게시된 사이트(confesta.lovable.app)**입니다. 수정 후 변경 사항을 반영하려면 다시 게시해야 합니다.