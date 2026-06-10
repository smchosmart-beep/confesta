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
}

export interface Topping {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
  pinned?: boolean;
  addressed?: boolean;
  likes?: number;
}

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
