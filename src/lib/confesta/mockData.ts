import type { Category, Session } from "./types";

export const CATEGORIES: Category[] = [
  { key: "vision-keynote", label: "비전특강 및 선포식", flavor: "strawberry" },
  { key: "conference", label: "컨퍼런스", flavor: "blueberry" },
  { key: "class-share", label: "수업나눔", flavor: "mint" },
  { key: "networking", label: "네트워킹 (feat. 선도교사)", flavor: "mango" },
  { key: "leader-school", label: "선도학교 공유회", flavor: "chocolate" },
  { key: "parents", label: "학부모 대상 특강", flavor: "strawberry" },
  { key: "hackathon", label: "누구나 개발자 해커톤", flavor: "blueberry" },
];

export const getCategory = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];

export const SESSIONS: Session[] = [
  { id: "s1", day: 1, title: "AI 시대, 교육의 새 지평 (비전 선포)", presenter: "김민서 교수", room: "LEWEST Hall A", timeSlot: "10:00 - 10:50", category: "vision-keynote", capacity: 200 },
  { id: "s2", day: 1, title: "AI × 교육 컨퍼런스: 미래 수업의 조건", presenter: "이지윤 박사", room: "LEWEST Hall B", timeSlot: "11:00 - 11:50", category: "conference", capacity: 200 },
  { id: "s3", day: 1, title: "AI를 활용한 초등 수학 수업나눔", presenter: "박서준 선생", room: "401-A", timeSlot: "13:00 - 13:50", category: "class-share", capacity: 40 },
  { id: "s4", day: 1, title: "선도교사와 함께하는 네트워킹", presenter: "정하늘 선도교사", room: "402-A", timeSlot: "14:00 - 14:50", category: "networking", capacity: 40 },
  { id: "s5", day: 2, title: "선도학교 운영 사례 공유회", presenter: "최정훈 교장", room: "LEWEST Hall C", timeSlot: "10:00 - 10:50", category: "leader-school", capacity: 120 },
  { id: "s6", day: 2, title: "가정에서 함께하는 AI 리터러시 (학부모 특강)", presenter: "한소영 교수", room: "404-B", timeSlot: "11:00 - 11:50", category: "parents", capacity: 60 },
  { id: "s7", day: 2, title: "누구나 개발자 해커톤: 첫 프로토타입 만들기", presenter: "오현우 박사", room: "401-C", timeSlot: "13:00 - 16:00", category: "hackathon", capacity: 40 },
  { id: "s8", day: 2, title: "선도학교 협력 수업나눔 세션", presenter: "윤다은 교사", room: "403-B", timeSlot: "14:00 - 14:50", category: "class-share", capacity: 60 },
];


// 행사장 평면도 기반 공간 정의 (LEWEST 4층)
export interface Venue {
  id: string;
  name: string;
  subspaces: string[];
  area: string;
  noMetrics?: boolean;
}

export const VENUES: Venue[] = [
  { id: "402", name: "402", subspaces: ["A"], area: "v402" },
  { id: "hall", name: "LEWEST Hall", subspaces: ["A", "B", "C"], area: "hall" },
  { id: "403", name: "403", subspaces: ["A", "B", "C"], area: "v403" },
  { id: "401", name: "401", subspaces: ["A", "B", "C", "D"], area: "v401" },
  { id: "404", name: "404", subspaces: ["A", "B", "C"], area: "v404" },
  { id: "400", name: "400 VIP 보드룸", subspaces: [], area: "v400", noMetrics: true },
];

export function venueOfRoom(room: string): string | null {
  if (room.startsWith("LEWEST Hall")) return "hall";
  const major = room.split("-")[0];
  return major || null;
}

export const ROOMS = VENUES.map((v) => v.name);

export interface SampleTopping {
  sessionId: string;
  text: string;
  pinned?: boolean;
  addressed?: boolean;
  ageMin?: number;
}

export const SAMPLE_TOPPINGS: SampleTopping[] = [
  { sessionId: "s1", text: "배수판별법 예시를 좀 더 보여주실 수 있나요?", pinned: true, ageMin: 2 },
  { sessionId: "s1", text: "GPT 프롬프트 예시 공유 부탁드려요 🍓", ageMin: 4 },
  { sessionId: "s1", text: "배수 판별을 초3 수업에 어떻게 녹이나요?", ageMin: 6 },
  { sessionId: "s1", text: "AI 모델이 틀린 배수를 줄 때 대처법은?", ageMin: 9 },
  { sessionId: "s1", text: "배수 개념 평가는 어떻게 설계하셨나요?", addressed: true, ageMin: 14 },
  { sessionId: "s2", text: "초3 학생들 반응이 궁금합니다!", pinned: true, ageMin: 1 },
  { sessionId: "s2", text: "생성형 AI 사용 시 학부모 동의는 어떻게 받으셨나요?", ageMin: 3 },
  { sessionId: "s3", text: "탐구 과제 설계 단계에서 가장 어려운 점은 무엇인가요?", pinned: true, ageMin: 2 },
  { sessionId: "s4", text: "연구 설계에서 IRB 절차는 어떻게 진행하셨나요?", pinned: true, ageMin: 3 },
  { sessionId: "s5", text: "디지털 교과서 도입 일정이 가장 궁금합니다", pinned: true, ageMin: 1 },
  { sessionId: "s6", text: "AI 튜터 도입 후 학생 성취도 변화가 궁금합니다", pinned: true, ageMin: 2 },
  { sessionId: "s7", text: "추천하시는 시각화 도구가 무엇인가요?", pinned: true, ageMin: 1 },
  { sessionId: "s8", text: "연구 공동체 모집은 어떻게 하셨나요?", pinned: true, ageMin: 3 },
];
