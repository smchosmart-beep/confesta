export type ScoopFlavor =
  | "mint"
  | "strawberry"
  | "mango"
  | "blueberry"
  | "chocolate";

export type CategoryKey =
  | "ai-math"
  | "edutech"
  | "pedagogy"
  | "research"
  | "policy";

export interface Category {
  key: CategoryKey;
  label: string;
  flavor: ScoopFlavor;
}

export interface Session {
  id: string;
  day: 1 | 2;
  title: string;
  presenter: string;
  room: string;
  timeSlot: string; // "10:00 - 10:50"
  category: CategoryKey;
  capacity: number;
  /** Demo-only seed password used by the presenter view's auth gate. */
  presenterPassword: string;
}

export type ToppingKind = "question" | "answer";

export interface Topping {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
  kind?: ToppingKind; // default "question"
  pinned?: boolean;
  addressed?: boolean;
  likes?: number;
}

export interface ToppingGate {
  questionsOpen: boolean;
  answersOpen: boolean;
  answerPrompt: string;
}

export const DEFAULT_TOPPING_GATE: ToppingGate = {
  questionsOpen: true,
  answersOpen: false,
  answerPrompt: "",
};

export interface StackedScoop {
  id: string;
  sessionId: string;
  flavor: ScoopFlavor;
  stackedAt: number;
}

export interface RedemptionLog {
  token: string;
  redeemedAt: number;
  status: "success" | "duplicate" | "invalid";
}

export interface Order {
  id: string;
  sessionId: string;
  orderedAt: number;
  pickedUpAt: number | null;
}

export type SessionQRKind = "order" | "pickup";
