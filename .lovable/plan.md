## 문제 원인

`pickupFromQR` 서버 함수(`src/lib/confesta/audience.functions.ts`)가 스쿱 맛(flavor)을 결정할 때 **레거시 mock `SESSIONS` 배열에서만** 세션을 찾고 있어요:

```ts
const session = SESSIONS.find((s) => s.id === parsed.sessionId);
if (!session) return { ok: false, message: "세션을 찾을 수 없어요" };
```

하지만 실제 운영에서 발급되는 수령 QR의 `sessionId`는 **슬롯 키 형식**(`day-period-room`, 예: `1-am-LEWEST Hall A`)이라 mock 배열에 존재하지 않습니다. → 항상 "세션을 찾을 수 없어요" 반환.

`OrderCard.tsx`의 `resolveSessionDisplay`는 이미 두 형식을 모두 처리하지만 서버 픽업 로직은 그렇지 않아 발생한 불일치입니다.

## 수정 방향

`pickupFromQR` 핸들러의 flavor 결정 부분을 `OrderCard`와 동일한 폴백 로직으로 교체:

1. 먼저 `SESSIONS.find(...)` 시도 (레거시 데모 QR 호환)
2. 실패 시 `parseSlotKey(parsed.sessionId)`로 슬롯 키 파싱
3. 슬롯의 `room` 문자열 해시 → `CATEGORIES[hash % length].flavor` 사용 (OrderCard와 동일 공식이라 화면 카테고리 색과 스쿱 맛이 일치)
4. 둘 다 실패할 때만 "세션을 찾을 수 없어요" 반환

다른 검증(논스, 주문 존재, 중복 수령, 최대 스쿱) 로직은 그대로 두고, **flavor 해석 부분만** 바꿉니다.

## 변경 파일

- `src/lib/confesta/audience.functions.ts` — `pickupFromQR` 핸들러 내 flavor 해석 블록 교체 (약 5줄)

## 검증

- 진행 중인 실제 슬롯의 수령 QR을 스캔 → "수령 완료! 스쿱이 쌓였어요" 메시지, 콘에 스쿱 추가
- 잘못된/만료된 nonce → 기존 메시지 그대로 표시
- 주문하지 않은 세션 QR → "이 세션을 주문하지 않았어요" 그대로
