import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { DeviceFrame } from "@/components/confesta/DeviceFrame";
import { PillTabs } from "@/components/confesta/PillTabs";
import { OrderCard } from "@/components/confesta/OrderCard";
import { OrderSkeletonCard } from "@/components/confesta/OrderSkeletonCard";
import { IceCreamCone } from "@/components/confesta/IceCreamCone";
import { CameraScanner } from "@/components/confesta/CameraScanner";
import { ToppingInput } from "@/components/confesta/ToppingInput";
import { ReceiptCard } from "@/components/confesta/ReceiptCard";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { AnswerPromptCard } from "@/components/confesta/AnswerPromptCard";
import { SampleAnswerPromptCard } from "@/components/confesta/SampleAnswerPromptCard";
import { SESSIONS } from "@/lib/confesta/mockData";
import { MAX_SCOOPS_CONST } from "@/lib/confesta/store";
import { parseSessionQR } from "@/lib/confesta/shared";
import { useAudience } from "@/hooks/use-audience";
import { useSessionToppings } from "@/hooks/use-toppings";
import { useAnswerPrompts } from "@/hooks/use-answer-prompts";
import type { ToppingKind } from "@/lib/confesta/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectTriggerCls,
  selectContentCls,
  selectItemCls,
} from "@/lib/confesta/selectStyles";
import {
  Camera,
  Plus,
  Receipt,
  Sparkles,
  ShoppingBag,
  IceCreamCone as IceCreamConeIcon,
} from "lucide-react";

export const Route = createFileRoute("/audience")({
  head: () => ({
    meta: [
      { title: "청중 뷰 — Confesta" },
      {
        name: "description",
        content:
          "세션 장소에서 주문 QR을 찍어 주문하고, 종료 직전 수령 QR로 스쿱을 적립하세요.",
      },
      { property: "og:title", content: "청중 뷰 — Confesta" },
      {
        property: "og:description",
        content: "주문 · 수령 · 토핑 · 영수증을 한 곳에서.",
      },
    ],
  }),
  component: AudienceView,
});

type Section = "orders" | "live" | "topping" | "receipt";

function AudienceView() {
  const [section, setSection] = useState<Section>("orders");

  // Server-backed audience state (orders, scoops, receipt)
  const { orders, scoops, placeOrder, pickup } = useAudience();

  // Topping/answerPrompt state still on Zustand (migrates in next steps)
  const toppings = useConfestaStore((s) => s.toppings);
  const answerPrompts = useConfestaStore((s) => s.answerPrompts);
  const likedToppingIds = useConfestaStore((s) => s.likedToppingIds);
  const toggleLikeTopping = useConfestaStore((s) => s.toggleLikeTopping);

  const [orderScanOpen, setOrderScanOpen] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // My cone tab state
  const [coneScanOpen, setConeScanOpen] = useState(false);
  const [coneFeedback, setConeFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.orderedAt - a.orderedAt),
    [orders],
  );

  // 청중이 실제로 스캔(주문/수령)한 세션들. 최신 활동순.
  const mySessionIds = useMemo(() => {
    const ids: string[] = [];
    for (let i = scoops.length - 1; i >= 0; i--) {
      const id = scoops[i].sessionId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    for (const o of sortedOrders) {
      if (o.sessionId && !ids.includes(o.sessionId)) ids.push(o.sessionId);
    }
    return ids;
  }, [scoops, sortedOrders]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (mySessionIds.length === 0) {
      if (selectedSessionId !== null) setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId || !mySessionIds.includes(selectedSessionId)) {
      setSelectedSessionId(mySessionIds[0]);
    }
  }, [mySessionIds, selectedSessionId]);

  const activeSessionId = selectedSessionId;

  const [toppingKind, setToppingKind] = useState<ToppingKind>("question");

  const handleOrderScan = async (text: string) => {
    const parsed = parseSessionQR(text);
    if (parsed?.kind === "pickup") {
      setOrderFeedback({
        ok: false,
        msg: "수령 QR은 해당 주문 카드의 '수령 QR 스캔' 버튼에서 찍어주세요",
      });
      return;
    }
    try {
      const result = await placeOrder(text);
      if (result.ok) {
        setOrderFeedback({ ok: true, msg: result.message });
        setOrderScanOpen(false);
      } else {
        setOrderFeedback({ ok: false, msg: result.message });
      }
    } catch (e) {
      setOrderFeedback({ ok: false, msg: "오류가 발생했어요" });
      console.error(e);
    }
  };

  const handleConeScan = async (text: string) => {
    const parsed = parseSessionQR(text);
    if (parsed?.kind === "order") {
      setConeFeedback({
        ok: false,
        msg: "주문 QR은 '주문' 탭에서 먼저 스캔하세요",
      });
      return;
    }
    try {
      const result = await pickup(text);
      if (result.ok) {
        setConeFeedback({ ok: true, msg: result.message });
        setConeScanOpen(false);
      } else {
        setConeFeedback({ ok: false, msg: result.message });
      }
    } catch (e) {
      setConeFeedback({ ok: false, msg: "오류가 발생했어요" });
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen pb-32">
      <RoleHeader
        role="청중 (Audience)"
        description="세션 장소에서 주문 QR → 종료 직전 수령 QR — 콘에 스쿱을 차곡차곡"
        color="pink"
      />

      <DeviceFrame device="mobile">
        <div className="px-4 flex justify-center">
          <div className="w-full overflow-x-auto">
            <div className="flex justify-center min-w-max">
              <PillTabs<Section>
                value={section}
                onChange={setSection}
                tabs={[
                  { value: "orders", label: "주문", icon: <ShoppingBag className="w-4 h-4" /> },
                  { value: "live", label: "My 콘", icon: <IceCreamConeIcon className="w-4 h-4" /> },
                  { value: "topping", label: "토핑 추가", icon: <Sparkles className="w-4 h-4" /> },
                  { value: "receipt", label: "영수증", icon: <Receipt className="w-4 h-4" /> },
                ]}
              />
            </div>
          </div>
        </div>

        <section className="px-4 mt-6">
          {section === "orders" && (
            <div className="flex flex-col gap-4">
              {sortedOrders.length < 3 && (
                !orderScanOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderScanOpen(true);
                      setOrderFeedback(null);
                    }}
                    className="bounce-press w-full inline-flex items-center justify-center gap-2 bg-grad-blueberry text-white rounded-full px-5 py-3 text-sm font-bold shadow-blue"
                  >
                    {sortedOrders.length === 0 ? (
                      <>
                        <Camera className="w-4 h-4" />
                        주문 QR 스캔하기
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        주문 QR 스캔 (새 주문 추가)
                      </>
                    )}
                  </button>
                ) : (
                  <CameraScanner
                    onScan={handleOrderScan}
                    onClose={() => setOrderScanOpen(false)}
                    hintLine="세션 장소의 주문 QR을 비추세요"
                  />
                )
              )}

              {Array.from({ length: 3 }).map((_, i) => {
                const order = sortedOrders[i];
                if (order) return <OrderCard key={order.id} order={order} />;
                return (
                  <OrderSkeletonCard
                    key={`skeleton-${i}`}
                    slotNumber={i + 1}
                  />
                );
              })}

              <p className="text-xs text-muted-foreground text-center">
                최대 3개까지 주문할 수 있어요 ({sortedOrders.length}/3)
              </p>

              {orderFeedback && (
                <div
                  className={`p-3 rounded-2xl text-sm font-semibold text-center text-white shadow-cream ${
                    orderFeedback.ok ? "bg-grad-success" : "bg-grad-danger"
                  }`}
                >
                  {orderFeedback.msg}
                </div>
              )}
            </div>
          )}

          {section === "live" && (
            <div className="grid grid-cols-1 gap-6 items-start pb-8">
              <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                <div className="absolute inset-0 bg-grad-sunset-soft opacity-50" />
                <ToppingScatter density="med" seed="audience-cone" />
                <div className="relative">
                  <h3 className="font-bold text-lg mb-2">나의 콘</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {scoops.length} / {MAX_SCOOPS_CONST} 스쿱 적립
                  </p>
                  <div className="flex justify-center">
                    <IceCreamCone scoops={scoops} size={220} />
                  </div>
                </div>
              </div>

              <div>
                {!coneScanOpen ? (
                  <button
                    onClick={() => {
                      setConeScanOpen(true);
                      setConeFeedback(null);
                    }}
                    className="relative overflow-hidden bounce-press w-full bg-grad-strawberry text-white rounded-3xl p-8 shadow-pink font-bold text-lg flex flex-col items-center gap-2"
                  >
                    <ToppingScatter density="med" seed="audience-scan-cta" />
                    <Camera className="w-8 h-8 relative" />
                    <span className="relative">수령 QR 스캔하기</span>
                  </button>
                ) : (
                  <CameraScanner
                    onScan={handleConeScan}
                    onClose={() => setConeScanOpen(false)}
                    hintLine="세션 종료 직전 발표자 화면의 수령 QR을 비추세요"
                  />
                )}

                {coneFeedback && (
                  <div
                    className={`mt-4 p-4 rounded-2xl text-sm font-semibold text-center text-white shadow-cream ${
                      coneFeedback.ok ? "bg-grad-success" : "bg-grad-danger"
                    }`}
                  >
                    {coneFeedback.msg}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === "topping" && (
            activeSessionId === null ? (
              <div className="relative overflow-hidden bg-card rounded-3xl p-8 shadow-cream border border-white/60 text-center">
                <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
                <ToppingScatter density="low" seed="audience-topping-locked" />
                <div className="relative flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center shadow-cream">
                    <Camera className="w-7 h-7 text-pink-600" />
                  </div>
                  <h3 className="font-bold text-lg">아직 참여 중인 세션이 없어요</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    주문 QR을 먼저 스캔하면 해당 세션에 토핑을 보낼 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection("orders")}
                    className="bounce-press mt-2 inline-flex items-center gap-2 bg-grad-blueberry text-white rounded-full px-5 py-3 text-sm font-bold shadow-blue"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    주문 탭으로 이동
                  </button>
                </div>
              </div>
            ) : (
            <div className="mx-auto flex flex-col gap-4">
              <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
                <ToppingScatter density="med" seed="audience-topping" />
                <div className="relative">
                  <h3 className="font-bold text-lg mb-3">토핑 보내기</h3>
                  <div className="mb-4 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground px-1">
                      세션 선택
                    </span>
                    <Select
                      value={activeSessionId ?? undefined}
                      onValueChange={(v) => setSelectedSessionId(v)}
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue placeholder="세션을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {mySessionIds.map((id) => {
                          const s = SESSIONS.find((x) => x.id === id);
                          if (!s) return null;
                          return (
                            <SelectItem key={id} value={id} className={selectItemCls}>
                              {s.title}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <ToppingInput sessionId={activeSessionId} kind={toppingKind} onKindChange={setToppingKind} disableAnswerSubmit />
                  <p className="text-xs text-muted-foreground mt-4">
                    전송한 토핑은 발표자 뷰의 질문 그리드에서 확인할 수 있어요.
                  </p>
                </div>
              </div>

              {toppingKind === "question" ? (
                <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                  <div className="absolute inset-0 bg-grad-sunset-soft opacity-40" />
                  <ToppingScatter density="low" seed="audience-topping-feed" />
                  <div className="relative">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-bold text-lg">궁금해요</h3>
                      <span className="text-xs text-muted-foreground">
                        {toppings.filter((t) => t.sessionId === activeSessionId && t.kind !== "answer").length}개
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      같은 세션에 전달된 질문들을 확인해보세요.
                    </p>
                    {(() => {
                      const list = toppings
                        .filter((t) => t.sessionId === activeSessionId && t.kind !== "answer")
                        .sort((a, b) => b.createdAt - a.createdAt);
                      if (list.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground text-center py-6">
                            아직 도착한 질문이 없어요 🍒
                          </div>
                        );
                      }
                      return (
                        <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                          {list.map((t) => {
                            const liked = likedToppingIds.includes(t.id);
                            const likeCount = t.likes ?? 0;
                            return (
                              <li
                                key={t.id}
                                className={`rounded-2xl px-4 py-3 text-sm border ${
                                  t.addressed
                                    ? "bg-muted/40 border-white/60 text-muted-foreground line-through"
                                    : "bg-white/70 border-white/80 text-foreground"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {t.pinned && (
                                    <span className="text-xs font-bold text-pink-600 shrink-0 mt-0.5">
                                      📌
                                    </span>
                                  )}
                                  <span className="flex-1 break-words">{t.text}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleLikeTopping(t.id)}
                                    aria-pressed={liked}
                                    aria-label={liked ? "좋아요 취소" : "좋아요"}
                                    className={`bounce-press shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors ${
                                      liked
                                        ? "bg-grad-strawberry text-white border-transparent shadow-pink"
                                        : "bg-white/80 text-muted-foreground border-white hover:text-pink-600"
                                    }`}
                                  >
                                    <span aria-hidden>{liked ? "❤️" : "🤍"}</span>
                                    <span>{likeCount}</span>
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(() => {
                    const sessionPrompts = answerPrompts
                      .filter((p) => p.sessionId === activeSessionId)
                      .sort((a, b) => {
                        const aActive = a.closedAt == null ? 1 : 0;
                        const bActive = b.closedAt == null ? 1 : 0;
                        if (aActive !== bActive) return bActive - aActive;
                        return b.createdAt - a.createdAt;
                      });
                    if (sessionPrompts.length === 0) {
                      return (
                        <>
                          <div className="relative overflow-hidden bg-card rounded-3xl p-8 shadow-cream border border-white/60 text-center">
                            <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
                            <ToppingScatter density="low" seed="audience-topping-empty-prompts" />
                            <div className="relative flex flex-col items-center gap-2">
                              <h3 className="font-bold text-base">아직 키워드 질문이 없어요</h3>
                              <p className="text-sm text-muted-foreground max-w-xs">
                                발표자가 질문을 열어드리면 여기에 카드로 표시돼요.
                              </p>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-grad-mango/20 text-grad-mango text-xs font-bold">
                              🍒 미리보기 — 응답이 들어오면 이렇게 보여요
                            </span>
                          </div>
                          <SampleAnswerPromptCard />
                        </>
                      );
                    }
                    return sessionPrompts.map((p) => (
                      <AnswerPromptCard key={p.id} prompt={p} />
                    ));
                  })()}
                </div>
              )}
            </div>
            )
          )}

          {section === "receipt" && (
            <div className="py-4">
              <ReceiptCard />
            </div>
          )}
        </section>
      </DeviceFrame>
    </main>
  );
}
