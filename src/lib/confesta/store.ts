import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Order,
  RedemptionLog,
  SessionQRKind,
  StackedScoop,
  Topping,
  ToppingKind,
} from "./types";
import { SESSIONS, getCategory, SAMPLE_TOPPINGS } from "./mockData";

const MAX_SCOOPS = 3;
const QR_PAYLOAD_PREFIX = "confesta:";

// ── QR helpers ────────────────────────────────────────────
export function makeOrderQR(sessionId: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}order:${sessionId}:${nonce}`;
}
export function makePickupQR(sessionId: string, nonce: string) {
  return `${QR_PAYLOAD_PREFIX}pickup:${sessionId}:${nonce}`;
}

export function parseSessionQR(
  payload: string,
): { kind: SessionQRKind; sessionId: string; nonce: string } | null {
  if (!payload.startsWith(QR_PAYLOAD_PREFIX)) return null;
  const parts = payload.split(":");
  if (parts.length !== 4) return null;
  const kind = parts[1];
  if (kind !== "order" && kind !== "pickup") return null;
  return { kind, sessionId: parts[2], nonce: parts[3] };
}

export function makeReceiptToken(scoops: StackedScoop[]) {
  const ids = scoops.map((s) => s.sessionId).join("-");
  return `${QR_PAYLOAD_PREFIX}receipt:${ids}:${Date.now().toString(36)}`;
}

export function parseReceiptToken(payload: string) {
  if (!payload.startsWith(`${QR_PAYLOAD_PREFIX}receipt:`)) return null;
  return payload;
}

type ScanResult =
  | { ok: true; flavor?: string; sessionId: string }
  | { ok: false; reason: string };

interface NoncePair {
  order: string;
  pickup: string;
}

interface ConfestaState {
  enrolledSessionIds: string[];
  orders: Order[];
  scoops: StackedScoop[];
  toppings: Topping[];
  likedToppingIds: string[];
  presenterNonces: Record<string, NoncePair>; // sessionId -> {order, pickup}
  receiptToken: string | null;
  receiptRedeemed: { at: number } | null;
  redemptionLog: RedemptionLog[];
  attendanceCounts: Record<string, number>;
  slideIndex: number;
  slideTotal: number;
  slidePaused: boolean;

  toggleEnroll: (sessionId: string) => void;
  placeOrderFromQR: (payload: string) => ScanResult;
  pickupFromQR: (payload: string) => ScanResult;
  resetScoops: () => void;
  generateReceipt: () => string | null;
  addTopping: (sessionId: string, text: string) => void;
  togglePinTopping: (id: string) => void;
  toggleAddressedTopping: (id: string) => void;
  toggleLikeTopping: (id: string) => void;
  rotatePresenterNonce: (sessionId: string, kind: SessionQRKind) => string;
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
  createdAt: Date.now() - (t.ageMin ?? i + 1) * 60_000,
  pinned: t.pinned,
  addressed: t.addressed,
}));

const initialOrders: Order[] = [
  {
    id: "seed-order-1",
    sessionId: "s1",
    orderedAt: Date.now() - 25 * 60_000,
    pickedUpAt: Date.now() - 5 * 60_000,
  },
  {
    id: "seed-order-2",
    sessionId: "s2",
    orderedAt: Date.now() - 12 * 60_000,
    pickedUpAt: null,
  },
];

function makeNonce() {
  return Math.random().toString(36).slice(2, 10);
}

export const useConfestaStore = create<ConfestaState>()(
  persist(
    (set, get) => ({
      enrolledSessionIds: [],
      orders: initialOrders,
      scoops: [],
      toppings: initialToppings,
      likedToppingIds: [],
      presenterNonces: {},
      receiptToken: null,
      receiptRedeemed: null,
      redemptionLog: [],
      attendanceCounts: {},
      slideIndex: 0,
      slideTotal: 30,
      slidePaused: false,

      toggleEnroll: (sessionId) =>
        set((s) => ({
          enrolledSessionIds: s.enrolledSessionIds.includes(sessionId)
            ? s.enrolledSessionIds.filter((id) => id !== sessionId)
            : [...s.enrolledSessionIds, sessionId],
        })),

      placeOrderFromQR: (payload) => {
        const parsed = parseSessionQR(payload);
        if (!parsed) return { ok: false, reason: "유효하지 않은 QR입니다" };
        if (parsed.kind !== "order") {
          return {
            ok: false,
            reason: "주문 QR이 아닙니다 (수령 QR은 주문 카드에서 스캔하세요)",
          };
        }
        const session = SESSIONS.find((s) => s.id === parsed.sessionId);
        if (!session) return { ok: false, reason: "알 수 없는 세션입니다" };
        const state = get();
        if (state.orders.length >= 3) {
          return { ok: false, reason: "주문은 최대 3개까지 가능해요" };
        }
        if (state.orders.some((o) => o.sessionId === parsed.sessionId)) {
          return { ok: false, reason: "이미 주문한 세션입니다" };
        }
        const order: Order = {
          id: `order-${parsed.sessionId}-${Date.now()}`,
          sessionId: parsed.sessionId,
          orderedAt: Date.now(),
          pickedUpAt: null,
        };
        set({ orders: [order, ...state.orders] });
        return { ok: true, sessionId: parsed.sessionId };
      },

      pickupFromQR: (payload) => {
        const parsed = parseSessionQR(payload);
        if (!parsed) return { ok: false, reason: "유효하지 않은 QR입니다" };
        if (parsed.kind !== "pickup") {
          return { ok: false, reason: "수령 QR이 아닙니다" };
        }
        const state = get();
        const session = SESSIONS.find((s) => s.id === parsed.sessionId);
        if (!session) return { ok: false, reason: "알 수 없는 세션입니다" };
        const order = state.orders.find((o) => o.sessionId === parsed.sessionId);
        if (!order) {
          return {
            ok: false,
            reason: "주문 내역이 없습니다 — 먼저 주문 QR을 스캔하세요",
          };
        }
        if (order.pickedUpAt) {
          return { ok: false, reason: "이미 수령 완료된 세션입니다" };
        }
        if (state.scoops.length >= MAX_SCOOPS) {
          return { ok: false, reason: "콘이 가득 찼습니다 (최대 3스쿱)" };
        }
        const cat = getCategory(session.category);
        const now = Date.now();
        const scoop: StackedScoop = {
          id: `scoop-${now}`,
          sessionId: session.id,
          flavor: cat.flavor,
          stackedAt: now,
        };
        set({
          orders: state.orders.map((o) =>
            o.sessionId === parsed.sessionId ? { ...o, pickedUpAt: now } : o,
          ),
          scoops: [...state.scoops, scoop],
          attendanceCounts: {
            ...state.attendanceCounts,
            [session.id]: (state.attendanceCounts[session.id] ?? 0) + 1,
          },
        });
        return { ok: true, flavor: cat.flavor, sessionId: session.id };
      },

      bumpAttendance: (sessionId, delta = 1) =>
        set((s) => ({
          attendanceCounts: {
            ...s.attendanceCounts,
            [sessionId]: Math.max(0, (s.attendanceCounts[sessionId] ?? 0) + delta),
          },
        })),

      nextSlide: () =>
        set((s) => ({ slideIndex: Math.min(s.slideTotal - 1, s.slideIndex + 1) })),
      prevSlide: () =>
        set((s) => ({ slideIndex: Math.max(0, s.slideIndex - 1) })),
      toggleSlidePause: () => set((s) => ({ slidePaused: !s.slidePaused })),
      resetSlides: () => set({ slideIndex: 0, slidePaused: false }),
      setSlideTotal: (n) =>
        set((s) => ({
          slideTotal: Math.max(1, n),
          slideIndex: Math.min(s.slideIndex, Math.max(0, n - 1)),
        })),

      resetScoops: () =>
        set({
          scoops: [],
          orders: [],
          receiptToken: null,
          receiptRedeemed: null,
        }),

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

      toggleLikeTopping: (id) =>
        set((s) => {
          const liked = s.likedToppingIds.includes(id);
          return {
            likedToppingIds: liked
              ? s.likedToppingIds.filter((x) => x !== id)
              : [...s.likedToppingIds, id],
            toppings: s.toppings.map((t) =>
              t.id === id
                ? { ...t, likes: Math.max(0, (t.likes ?? 0) + (liked ? -1 : 1)) }
                : t,
            ),
          };
        }),

      rotatePresenterNonce: (sessionId, kind) => {
        const nonce = makeNonce();
        set((s) => {
          const prev: NoncePair = s.presenterNonces[sessionId] ?? {
            order: makeNonce(),
            pickup: makeNonce(),
          };
          return {
            presenterNonces: {
              ...s.presenterNonces,
              [sessionId]: { ...prev, [kind]: nonce },
            },
          };
        });
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
        if (log.status === "success" && state.receiptToken === token) {
          updates.receiptRedeemed = { at: log.redeemedAt };
        }
        set(updates as ConfestaState);
        return log;
      },
    }),
    {
      name: "confesta-state-v4",
    },
  ),
);

export const MAX_SCOOPS_CONST = MAX_SCOOPS;
