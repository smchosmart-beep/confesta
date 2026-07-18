## 목표
프로젝트 루트에 `README.md` 를 새로 생성합니다. 기존 `spec.md`(제품 스펙)와 `package.json` 을 근거로, GitHub/저장소 첫 진입자가 바로 이해할 수 있는 한글 README 를 만듭니다.

## 파일
- **신규**: `README.md` (루트)
- 기존 `spec.md`, `design.md` 는 그대로 두고 README 에서 링크로 참조

## 구성

1. **프로젝트 타이틀 & 태그라인**
   - Confesta (콘페스타) — AI 디지털 컨퍼런스&페스티벌 게이미피케이션 플랫폼
2. **한 줄 소개 + 핵심 메타포**
   - 콘 / 주문 / 스쿱 / 토핑 / 영수증 개념 요약
3. **주요 기능**
   - 4개 역할(청중·발표자·스태프·관리자)별 핵심 액션 bullet
4. **기술 스택**
   - TanStack Start v1, React 19, Vite 7, Tailwind v4, shadcn/ui, TanStack Query/Router, Lovable Cloud(Postgres+Realtime+Auth), Cloudflare Workers 타겟
5. **시작하기**
   - 요구사항: Bun
   - `bun install`
   - `bun run dev` / `bun run build` / `bun run lint` / `bun run format`
   - Lovable Cloud 사용 안내 (`.env` 는 자동 관리, 수동 편집 금지)
6. **디렉터리 구조 요약**
   - `src/routes/` (파일 기반 라우팅, `/audience`, `/presenter`, `/staff`, `/admin`)
   - `src/components/confesta/`, `src/hooks/`, `src/lib/confesta/`, `src/integrations/supabase/`
7. **배포**
   - Lovable 에서 Publish (Preview / Published URL 예시 문구)
8. **문서 링크**
   - 상세 스펙: `./spec.md`
   - 디자인 가이드: `./design.md`
9. **라이선스/크레딧**
   - Private 프로젝트 명시, "Built with Lovable" 배지 언급

## 스타일
- 한국어 본문, 코드 블록은 영어
- 이모지 없음(사용자 정책 존중), 간결한 마크다운
- 길이: 약 120~180줄 목표

## 확인
- 파일 생성 후 `bun run lint` 는 md 를 검사하지 않으므로 별도 명령 없이 종료. 빌드/타입 영향 없음.
