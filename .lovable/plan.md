## 목표
수령 QR을 주문 QR처럼 세션별로 한 번 발급되면 계속 고정 — 시간에 따른 자동 갱신 제거.

## 부작용 검토 결과 (요약)
**결론: 안전. 라이브 이벤트 중에도 적용 가능.**

| 항목 | 영향 | 근거 |
|---|---|---|
| 다른 기능 오작동 | 없음 | 변경은 `presenter.tsx`의 표시 로직에 국한. 서버/DB/청중 화면 무변경. |
| 서버 비용 | **감소** | 5분마다 발생하던 `rotatePickupQR` RPC가 사라짐. |
| 이미 발급된 nonce | 그대로 유효 | 배포 순간에도 청중의 수령 흐름이 끊기지 않음. |
| 보안 | 실질 동일 | nonce는 UUID로 예측 불가, 발급 권한은 발표자만(`assertPresenterSlotKey`). 기존에도 시간 만료는 클라 재발급에 의존한 소프트 만료였음. |
| 청중 검증 | 무변경 | `pickupFromQR`은 nonce 일치만 확인하고 시간 만료 개념이 원래 없음. |

## 변경 사항 (최소 범위)

### `src/routes/presenter.tsx`
1. `rotatePickupQR` import, `rotateFn` / `rotate` mutation 제거.
2. `progress` state, `QR_INTERVAL_MS`, 회전용 `setInterval` 2개(`tickId`, `rotateId`) 모두 제거.
3. 모달 하단의 진행 바(`h-3 rounded-full` div)와 "다음 갱신까지 약 N초" 문구, "5분마다 갱신" 배지 제거.
4. 모달 오픈 시 `issue.mutate()`만 1회 호출 (기존 nonce 있으면 서버가 재사용).
5. 상단 설명 문구 살짝 다듬음 ("종료 직전에만 잠깐 띄워서 청중이 스캔하도록 하세요" 유지 또는 순화).

### 서버 (`src/lib/confesta/slots.functions.ts`)
- **변경 없음.** `rotatePickupQR` 함수는 코드에 남겨두되 호출부만 제거 (향후 수동 재발급이 필요할 경우 대비).

### DB / 마이그레이션
- 없음. `session_nonces` 스키마, `pickupFromQR` 검증 로직 그대로.

## 검증 (스모크 테스트)
1. 발표자 화면에서 수령 QR 모달을 열고 수 분간 QR이 바뀌지 않는지 확인.
2. 모달을 닫았다 다시 열어도 같은 QR이 표시되는지 확인.
3. 청중 기기로 스캔해 정상적으로 스쿱이 적립되는지 확인.
4. 다른 세션의 수령 QR과 페이로드가 서로 다른지 확인 (세션별 고유성).
