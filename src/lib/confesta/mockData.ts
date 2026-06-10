import type { Category, Session } from "./types";

export const CATEGORIES: Category[] = [
  { key: "ai-math", label: "AI × 수학", flavor: "mint" },
  { key: "edutech", label: "에듀테크", flavor: "blueberry" },
  { key: "pedagogy", label: "교수법", flavor: "strawberry" },
  { key: "research", label: "연구사례", flavor: "mango" },
  { key: "policy", label: "정책", flavor: "chocolate" },
];

export const getCategory = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];

export const SESSIONS: Session[] = [
  {
    id: "s1",
    day: 1,
    title: "배수판별법으로 만나는 AI 수학 모델",
    presenter: "김민서 교수",
    room: "401-A",
    timeSlot: "10:00 - 10:50",
    category: "ai-math",
    capacity: 40,
  },
  {
    id: "s2",
    day: 1,
    title: "초등 수학 수업을 바꾸는 생성형 AI",
    presenter: "이지윤 박사",
    room: "403-B",
    timeSlot: "11:00 - 11:50",
    category: "edutech",
    capacity: 60,
  },
  {
    id: "s3",
    day: 1,
    title: "탐구 중심 교수-학습 모델 설계",
    presenter: "박서준 선생",
    room: "LEWEST Hall A",
    timeSlot: "13:00 - 13:50",
    category: "pedagogy",
    capacity: 120,
  },
  {
    id: "s4",
    day: 1,
    title: "현장 연구 사례 발표",
    presenter: "정하늘 연구원",
    room: "402-A",
    timeSlot: "14:00 - 14:50",
    category: "research",
    capacity: 40,
  },
  {
    id: "s5",
    day: 2,
    title: "디지털 교과서 정책 동향",
    presenter: "최정훈 과장",
    room: "LEWEST Hall B",
    timeSlot: "10:00 - 10:50",
    category: "policy",
    capacity: 120,
  },
  {
    id: "s6",
    day: 2,
    title: "AI 튜터와 함께하는 개별화 학습",
    presenter: "한소영 교수",
    room: "404-B",
    timeSlot: "11:00 - 11:50",
    category: "ai-math",
    capacity: 60,
  },
  {
    id: "s7",
    day: 2,
    title: "수업 데이터 시각화 워크숍",
    presenter: "오현우 박사",
    room: "401-C",
    timeSlot: "13:00 - 13:50",
    category: "edutech",
    capacity: 40,
  },
  {
    id: "s8",
    day: 2,
    title: "교사 연구 공동체 운영 사례",
    presenter: "윤다은 교사",
    room: "LEWEST Hall C",
    timeSlot: "14:00 - 14:50",
    category: "pedagogy",
    capacity: 120,
  },
];

// 행사장 평면도 기반 공간 정의 (LEWEST 4층)
export interface Venue {
  id: string;          // major space id, e.g. "401"
  name: string;        // 표시 이름
  subspaces: string[]; // 세부 공간 코드(예: "A","B"). 빈 배열이면 단일 공간
  /** CSS grid area name for floor-plan layout */
  area: string;
  /** 주문/수령 집계를 표시하지 않는 공간(예: VIP 보드룸) */
  noMetrics?: boolean;
}

export const VENUES: Venue[] = [
  { id: "402", name: "402", subspaces: ["A", "B"], area: "v402" },
  { id: "hall", name: "LEWEST Hall", subspaces: ["A", "B", "C"], area: "hall" },
  { id: "403", name: "403", subspaces: ["A", "B", "C"], area: "v403" },
  { id: "401", name: "401", subspaces: ["A", "B", "C", "D"], area: "v401" },
  { id: "404", name: "404", subspaces: ["A", "B", "C"], area: "v404" },
  { id: "400", name: "400 VIP 보드룸", subspaces: [], area: "v400", noMetrics: true },
];

/** 세션의 room → venue.id 매핑 (예: "401-A" → "401", "LEWEST Hall A" → "hall") */
export function venueOfRoom(room: string): string | null {
  if (room.startsWith("LEWEST Hall")) return "hall";
  const major = room.split("-")[0];
  return major || null;
}

/** 호환용: 기존 ROOMS 사용처를 위해 major venue id 목록을 노출 */
export const ROOMS = VENUES.map((v) => v.name);



export interface SampleTopping {
  sessionId: string;
  text: string;
  pinned?: boolean;
  addressed?: boolean;
  ageMin?: number; // 몇 분 전 작성됐는지
}

export const SAMPLE_TOPPINGS: SampleTopping[] = [
  // s1 — 배수판별법으로 만나는 AI 수학 모델
  { sessionId: "s1", text: "배수판별법 예시를 좀 더 보여주실 수 있나요?", pinned: true, ageMin: 2 },
  { sessionId: "s1", text: "GPT 프롬프트 예시 공유 부탁드려요 🍓", ageMin: 4 },
  { sessionId: "s1", text: "배수 판별을 초3 수업에 어떻게 녹이나요?", ageMin: 6 },
  { sessionId: "s1", text: "AI 모델이 틀린 배수를 줄 때 대처법은?", ageMin: 9 },
  { sessionId: "s1", text: "배수 개념 평가는 어떻게 설계하셨나요?", addressed: true, ageMin: 14 },
  { sessionId: "s1", text: "프롬프트 한 줄로 배수 패턴 찾기 데모 가능할까요?", ageMin: 18 },
  { sessionId: "s1", text: "수업에서 학생 반응이 가장 좋았던 프롬프트가 궁금합니다", ageMin: 22 },
  { sessionId: "s1", text: "AI와 배수 학습을 연결한 평가 루브릭이 있나요?", ageMin: 28 },

  // s2 — 초등 수학 수업을 바꾸는 생성형 AI
  { sessionId: "s2", text: "초3 학생들 반응이 궁금합니다!", pinned: true, ageMin: 1 },
  { sessionId: "s2", text: "생성형 AI 사용 시 학부모 동의는 어떻게 받으셨나요?", ageMin: 3 },
  { sessionId: "s2", text: "프롬프트 템플릿을 공유 받을 수 있을까요?", ageMin: 5 },
  { sessionId: "s2", text: "AI가 만든 문제의 오류는 어떻게 검수하시나요?", ageMin: 8 },
  { sessionId: "s2", text: "초등 수업 시간 분배 팁이 궁금합니다", ageMin: 11 },
  { sessionId: "s2", text: "협력학습에 AI를 접목한 사례가 있으신가요?", addressed: true, ageMin: 17 },
  { sessionId: "s2", text: "수업 후 평가 데이터는 어떻게 수집하셨나요?", ageMin: 24 },

  // s3 — 탐구 중심 교수-학습 모델 설계
  { sessionId: "s3", text: "탐구 과제 설계 단계에서 가장 어려운 점은 무엇인가요?", pinned: true, ageMin: 2 },
  { sessionId: "s3", text: "탐구 수업과 일반 수업의 평가 차이를 알고 싶어요", ageMin: 6 },
  { sessionId: "s3", text: "협력학습 그룹 구성 노하우 부탁드립니다", ageMin: 10 },
  { sessionId: "s3", text: "교수-학습 모델을 학교 전체에 확산시키는 전략은?", ageMin: 15 },
  { sessionId: "s3", text: "탐구 활동 시간 관리가 어렵습니다. 팁이 있을까요?", ageMin: 20 },
  { sessionId: "s3", text: "수업 데이터 기반 피드백 사례가 더 보고 싶어요", addressed: true, ageMin: 26 },
  { sessionId: "s3", text: "탐구 중심 모델에서 AI 도구의 역할은 어떻게 정의하시나요?", ageMin: 33 },

  // s4 — 현장 연구 사례 발표
  { sessionId: "s4", text: "연구 설계에서 IRB 절차는 어떻게 진행하셨나요?", pinned: true, ageMin: 3 },
  { sessionId: "s4", text: "현장 데이터 수집 시 가장 큰 어려움이 무엇이었나요?", ageMin: 7 },
  { sessionId: "s4", text: "교사 연구자로서 시간 확보 전략이 궁금합니다", ageMin: 12 },
  { sessionId: "s4", text: "연구 결과를 수업에 다시 적용한 사례 부탁드려요", ageMin: 16 },
  { sessionId: "s4", text: "연구 협력 네트워크는 어떻게 구축하셨나요?", addressed: true, ageMin: 22 },
  { sessionId: "s4", text: "데이터 분석 도구 추천 부탁드립니다", ageMin: 30 },

  // s5 — 디지털 교과서 정책 동향
  { sessionId: "s5", text: "디지털 교과서 도입 일정이 가장 궁금합니다", pinned: true, ageMin: 1 },
  { sessionId: "s5", text: "현장 교사 의견 반영 채널이 있나요?", ageMin: 4 },
  { sessionId: "s5", text: "기존 종이 교과서와 병행 사용 가이드라인은?", ageMin: 8 },
  { sessionId: "s5", text: "디지털 교과서 평가 데이터 활용 정책이 궁금합니다", ageMin: 13 },
  { sessionId: "s5", text: "저학년 디지털 교과서 사용 시간 권고치가 있나요?", ageMin: 19 },
  { sessionId: "s5", text: "AI 디지털 교과서 도입 예산은 어떻게 배정되나요?", addressed: true, ageMin: 25 },
  { sessionId: "s5", text: "교사 연수 계획이 어떻게 되는지 알고 싶습니다", ageMin: 31 },

  // s6 — AI 튜터와 함께하는 개별화 학습
  { sessionId: "s6", text: "AI 튜터 도입 후 학생 성취도 변화가 궁금합니다", pinned: true, ageMin: 2 },
  { sessionId: "s6", text: "개별화 학습 데이터는 어떻게 관리하시나요?", ageMin: 5 },
  { sessionId: "s6", text: "AI 튜터가 어려운 개념을 잘못 설명할 때 대처는?", ageMin: 9 },
  { sessionId: "s6", text: "학부모 피드백은 어떤가요?", ageMin: 14 },
  { sessionId: "s6", text: "수업 중 AI 튜터와 교사 역할 분담이 궁금합니다", addressed: true, ageMin: 20 },
  { sessionId: "s6", text: "개별화 학습 평가 루브릭 공유 가능할까요?", ageMin: 27 },

  // s7 — 수업 데이터 시각화 워크숍
  { sessionId: "s7", text: "추천하시는 시각화 도구가 무엇인가요?", pinned: true, ageMin: 1 },
  { sessionId: "s7", text: "수업 데이터 수집 자동화 방법이 궁금합니다", ageMin: 4 },
  { sessionId: "s7", text: "데이터 시각화 결과를 학부모와 공유하시나요?", ageMin: 8 },
  { sessionId: "s7", text: "시각화 결과 해석 시 주의할 점은?", ageMin: 13 },
  { sessionId: "s7", text: "엑셀 외에 추천 도구가 있을까요?", addressed: true, ageMin: 18 },
  { sessionId: "s7", text: "데이터 기반 수업 개선 사례 더 부탁드립니다", ageMin: 24 },

  // s8 — 교사 연구 공동체 운영 사례
  { sessionId: "s8", text: "연구 공동체 모집은 어떻게 하셨나요?", pinned: true, ageMin: 3 },
  { sessionId: "s8", text: "협력학습 분위기를 만드는 노하우가 궁금합니다", ageMin: 7 },
  { sessionId: "s8", text: "공동체 운영 예산은 어떻게 확보하시나요?", ageMin: 11 },
  { sessionId: "s8", text: "연구 결과 공유 채널이 있다면 알려주세요", ageMin: 16 },
  { sessionId: "s8", text: "교사 연구 공동체와 학교 평가의 연결 고리는?", addressed: true, ageMin: 22 },
  { sessionId: "s8", text: "온라인 공동체와 오프라인 모임 비율은 어떻게 운영하나요?", ageMin: 29 },
];

