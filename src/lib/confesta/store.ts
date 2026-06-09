import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RedemptionLog, StackedScoop, Topping } from "./types";
import { SESSIONS, getCategory, SAMPLE_TOPPINGS } from "./mockData";

const MAX_SCOOPS = 3;
const QR_PAYLOAD_PREFIX = "confesta:";

export function makeAttendanceQR(sessionId: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}attend:${sessionId}:${nonce}`;
}

export function parseAttendanceQR(payload: string) {
  if (!payload.startsWith(`${QR_PAYLOAD_PREFIX}attend:`)) return null;
  const parts = payload.split(":");
  if (parts.length !== 4) return null;
  return { sessionId: parts[2], nonce: parts[3] };
}

export function makeReceiptToken(scoops: StackedScoop[]) {
  const ids = scoops.map((s) => s.sessionId).join("-");
  return `${QR_PAYLOAD_PREFIX}receipt:${ids}:${Date.now().toString(36)}`;
}

export function parseReceiptToken(payload: string) {
  if (!payload.startsWith(`${QR_PAYLOAD_PREFIX}receipt:`)) return null;
  return payload;
}

interface ConfestaState {
  enrolledSessionIds: string[];
  scoops: StackedScoop[];
  toppings: Topping[];
  presenterNonces: Record<string, string>; // sessionId -> current nonce
  receiptToken: string | null;
  receiptRedeemed: { at: number } | null;
  redemptionLog: RedemptionLog[];
  attendanceCounts: Record<string, number>; // sessionId -> attendance count
  slideIndex: number;
  slideTotal: number;
  slidePaused: boolean;

  toggleEnroll: (sessionId: string) => void;
  addScoopFromQR: (payload: string) => { ok: boolean; reason?: string; flavor?: string };
  resetScoops: () => void;
  generateReceipt: () => string | null;
  addTopping: (sessionId: string, text: string) => void;
  togglePinTopping: (id: string) => void;
  toggleAddressedTopping: (id: string) => void;
  rotatePresenterNonce: (sessionId: string) => string;
  redeemReceipt: (token: string) => RedemptionLog;
  bumpAttendance: (sessionId: string, delta?: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  toggleSlidePause: () => void;
  resetSlides: () => void;
  setSlideTotal: (n: number) => void;
}

const initialToppings: Topping[] = SAMPLE_TOPPINGS.map((t, i) => ({
  id: `seed-${i}`,
  sessionId: t.sessionId,
  text: t.text,
  createdAt: Date.now() - (i + 1) * 60_000,
}));

export const useConfestaStore = create<ConfestaState>()(
  persist(
    (set, get) => ({
      enrolledSessionIds: [],
      scoops: [],
      toppings: initialToppings,
      presenterNonces: {},
      receiptToken: null,
      receiptRedeemed: null,
      redemptionLog: [],

      toggleEnroll: (sessionId) =>
        set((s) => ({
          enrolledSessionIds: s.enrolledSessionIds.includes(sessionId)
            ? s.enrolledSessionIds.filter((id) => id !== sessionId)
            : [...s.enrolledSessionIds, sessionId],
        })),

      addScoopFromQR: (payload) => {
        const parsed = parseAttendanceQR(payload);
        if (!parsed) return { ok: false, reason: "유효하지 않은 QR입니다" };
        const state = get();
        if (state.scoops.length >= MAX_SCOOPS) {
          return { ok: false, reason: "콘이 가득 찼습니다 (최대 3스쿱)" };
        }
        if (state.scoops.some((s) => s.sessionId === parsed.sessionId)) {
          return { ok: false, reason: "이미 출석한 세션입니다" };
        }
        const session = SESSIONS.find((s) => s.id === parsed.sessionId);
        if (!session) return { ok: false, reason: "알 수 없는 세션입니다" };
        const cat = getCategory(session.category);
        const scoop: StackedScoop = {
          id: `scoop-${Date.now()}`,
          sessionId: session.id,
          flavor: cat.flavor,
          stackedAt: Date.now(),
        };
        set({ scoops: [...state.scoops, scoop] });
        return { ok: true, flavor: cat.flavor };
      },

      resetScoops: () =>
        set({ scoops: [], receiptToken: null, receiptRedeemed: null }),

      generateReceipt: () => {
        const state = get();
        if (state.scoops.length < MAX_SCOOPS) return null;
        if (state.receiptToken) return state.receiptToken;
        const token = makeReceiptToken(state.scoops);
        set({ receiptToken: token });
        return token;
      },

      addTopping: (sessionId, text) =>
        set((s) => ({
          toppings: [
            {
              id: `t-${Date.now()}`,
              sessionId,
              text,
              createdAt: Date.now(),
            },
            ...s.toppings,
          ],
        })),

      togglePinTopping: (id) =>
        set((s) => ({
          toppings: s.toppings.map((t) =>
            t.id === id ? { ...t, pinned: !t.pinned } : t,
          ),
        })),

      toggleAddressedTopping: (id) =>
        set((s) => ({
          toppings: s.toppings.map((t) =>
            t.id === id ? { ...t, addressed: !t.addressed } : t,
          ),
        })),

      rotatePresenterNonce: (sessionId) => {
        const nonce = Math.random().toString(36).slice(2, 10);
        set((s) => ({
          presenterNonces: { ...s.presenterNonces, [sessionId]: nonce },
        }));
        return nonce;
      },

      redeemReceipt: (token) => {
        const state = get();
        const log: RedemptionLog = (() => {
          if (!parseReceiptToken(token)) {
            return { token, redeemedAt: Date.now(), status: "invalid" };
          }
          const already = state.redemptionLog.find(
            (l) => l.token === token && l.status === "success",
          );
          if (already) {
            return { token, redeemedAt: Date.now(), status: "duplicate" };
          }
          return { token, redeemedAt: Date.now(), status: "success" };
        })();
        const updates: Partial<ConfestaState> = {
          redemptionLog: [log, ...state.redemptionLog].slice(0, 100),
        };
        if (
          log.status === "success" &&
          state.receiptToken === token
        ) {
          updates.receiptRedeemed = { at: log.redeemedAt };
        }
        set(updates as ConfestaState);
        return log;
      },
    }),
    {
      name: "confesta-state-v1",
    },
  ),
);

export const MAX_SCOOPS_CONST = MAX_SCOOPS;
