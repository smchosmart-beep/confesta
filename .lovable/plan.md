# 청중 역할 카드: 아이콘 + 파스텔 색상 개선 계획

## 요약
청중 역할 선택 카드(AudienceRoleGate)와 배지(RoleBadge)의 이모지를 Lucide 아이콘으로 교체하고, 카드/배지 배경색을 기존 그라데이션에서 더 연한 파스텔 단색으로 변경합니다. 배경(바닐라 크림)과 충분히 대비되도록 4개 모두 채도 있는 파스텔로 통일합니다.

## 변경 범위

### 1. 색상 토큰 및 역할 정의
- `src/styles.css`에 4개 파스텔 단색 유틸리티 추가
  - `bg-pastel-mint` — 연한 민트 (#C9F0E2 계열)
  - `bg-pastel-lavender` — 연한 라벤더/블루 (#D6D9FF 계열)
  - `bg-pastel-peach` — 연한 핑크/피치 (#FFD3DD 계열)
  - `bg-pastel-mango` — 연한 살구/망고 (#FFE0B5 계열) ← 기타용, 배경과 확실히 구분
- `src/lib/confesta/audienceRole.ts`
  - `bg`: 기존 `bg-grad-*` → 위 파스텔 단색으로 교체
  - `text`: 어두운 대비색 (`text-teal-800`, `text-indigo-800`, `text-pink-800`, `text-amber-800`)

### 2. AudienceRoleGate 카드
- `src/components/confesta/AudienceRoleGate.tsx`
  - 상단 헤더 아이콘 (IceCream)은 그대로 유지
  - 4개 역할 버튼에서 `text-3xl` 이모지 제거
  - `lucide-react`에서 `School`, `Briefcase`, `Home`, `IceCream` 정적 import
  - 버튼마다 해당 Lucide 아이콘(`size={28}`, `strokeWidth={2}`) 렌더링
  - 버튼 텍스트/아이콘 색상은 파스텔 배경 위에서 가독성 확보를 위해 `text-white` → `def.text`(어두운 톤)로 변경
  - shadow도 파스텔 톤에 맞게 `shadow-cream` 유지

### 3. RoleBadge
- `src/components/confesta/RoleBadge.tsx`
  - `def.emoji` 제거 → 역할 키별 Lucide 아이콘 렌더링 (`size={12}` xs / `size={14}` sm)
  - 텍스트 색상: 파스텔 배경 위 가독성을 위해 `text-white` → `def.text`로 교체

## 아이콘 매핑 (확정)

| 역할 | Lucide 아이콘 | 파스텔 색상 |
|------|--------------|------------|
| 교사 | `School` | 민트 |
| 전문직 | `Briefcase` | 라벤더 |
| 학부모 | `Home` | 피치 |
| 기타 | `IceCream` | 망고/살구 |

## 영향 받는 파일
- `src/styles.css` (파스텔 유틸리티 4개 추가)
- `src/lib/confesta/audienceRole.ts` (bg/text 토큰 교체)
- `src/components/confesta/AudienceRoleGate.tsx` (이모지 → 아이콘, 텍스트 색상)
- `src/components/confesta/RoleBadge.tsx` (이모지 → 아이콘, 텍스트 색상)
