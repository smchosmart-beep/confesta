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
    room: "Room 101",
    timeSlot: "10:00 - 10:50",
    category: "ai-math",
    capacity: 40,
  },
  {
    id: "s2",
    day: 1,
    title: "초등 수학 수업을 바꾸는 생성형 AI",
    presenter: "이지윤 박사",
    room: "Room 202",
    timeSlot: "11:00 - 11:50",
    category: "edutech",
    capacity: 60,
  },
  {
    id: "s3",
    day: 1,
    title: "탐구 중심 교수-학습 모델 설계",
    presenter: "박서준 선생",
    room: "Main Hall",
    timeSlot: "13:00 - 13:50",
    category: "pedagogy",
    capacity: 120,
  },
  {
    id: "s4",
    day: 1,
    title: "현장 연구 사례 발표",
    presenter: "정하늘 연구원",
    room: "Room 101",
    timeSlot: "14:00 - 14:50",
    category: "research",
    capacity: 40,
  },
  {
    id: "s5",
    day: 2,
    title: "디지털 교과서 정책 동향",
    presenter: "최정훈 과장",
    room: "Main Hall",
    timeSlot: "10:00 - 10:50",
    category: "policy",
    capacity: 120,
  },
  {
    id: "s6",
    day: 2,
    title: "AI 튜터와 함께하는 개별화 학습",
    presenter: "한소영 교수",
    room: "Room 202",
    timeSlot: "11:00 - 11:50",
    category: "ai-math",
    capacity: 60,
  },
  {
    id: "s7",
    day: 2,
    title: "수업 데이터 시각화 워크숍",
    presenter: "오현우 박사",
    room: "Room 101",
    timeSlot: "13:00 - 13:50",
    category: "edutech",
    capacity: 40,
  },
  {
    id: "s8",
    day: 2,
    title: "교사 연구 공동체 운영 사례",
    presenter: "윤다은 교사",
    room: "Main Hall",
    timeSlot: "14:00 - 14:50",
    category: "pedagogy",
    capacity: 120,
  },
];

export const ROOMS = ["Room 101", "Room 202", "Main Hall"] as const;

export const SAMPLE_TOPPINGS: { sessionId: string; text: string }[] = [
  { sessionId: "s1", text: "배수판별법 예시를 좀 더 보여주실 수 있나요?" },
  { sessionId: "s1", text: "GPT 프롬프트 예시 공유 부탁드려요 🍓" },
  { sessionId: "s2", text: "초3 학생들 반응이 궁금합니다!" },
];
