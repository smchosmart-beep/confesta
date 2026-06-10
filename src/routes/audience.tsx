import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { DeviceFrame } from "@/components/confesta/DeviceFrame";
import { PillTabs } from "@/components/confesta/PillTabs";
import { OrderCard } from "@/components/confesta/OrderCard";
import { IceCreamCone } from "@/components/confesta/IceCreamCone";
import { CameraScanner } from "@/components/confesta/CameraScanner";
import { ToppingInput } from "@/components/confesta/ToppingInput";
import { ReceiptCard } from "@/components/confesta/ReceiptCard";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { SESSIONS } from "@/lib/confesta/mockData";
import {
  useConfestaStore,
  MAX_SCOOPS_CONST,
  parseSessionQR,
} from "@/lib/confesta/store";
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

  // Orders tab state
  const orders = useConfestaStore((s) => s.orders);
  const toppings = useConfestaStore((s) => s.toppings);
  const placeOrder = useConfestaStore((s) => s.placeOrderFromQR);
  const [orderScanOpen, setOrderScanOpen] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // My cone tab state
  const scoops = useConfestaStore((s) => s.scoops);
  const pickup = useConfestaStore((s) => s.pickupFromQR);
  const [coneScanOpen, setConeScanOpen] = useState(false);
  const [coneFeedback, setConeFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.orderedAt - a.orderedAt),
    [orders],
  );
  const activeSessionId =
    scoops[scoops.length - 1]?.sessionId ??
    orders[0]?.sessionId ??
    SESSIONS[0].id;

  const handleOrderScan = (text: string) => {
    const parsed = parseSessionQR(text);
    if (parsed?.kind === "pickup") {
      setOrderFeedback({
        ok: false,
        msg: "수령 QR은 해당 주문 카드의 '수령 QR 스캔' 버튼에서 찍어주세요",
      });
      return;
    }
    const result = placeOrder(text);
    if (result.ok) {
      setOrderFeedback({ ok: true, msg: "주문이 접수됐어요 🍨" });
      setOrderScanOpen(false);
    } else {
      setOrderFeedback({ ok: false, msg: result.reason });
    }
  };

  const handleConeScan = (text: string) => {
    const parsed = parseSessionQR(text);
    if (parsed?.kind === "order") {
      setConeFeedback({
        ok: false,
        msg: "주문 QR은 '주문' 탭에서 먼저 스캔하세요",
      });
      return;
    }
    const result = pickup(text);
    if (result.ok) {
      setConeFeedback({ ok: true, msg: "수령 완료! 스쿱이 쌓였어요 🍦" });
      setConeScanOpen(false);
    } else {
      setConeFeedback({ ok: false, msg: result.reason });
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
              {sortedOrders.length === 0 ? (
                <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                  <div className="absolute inset-0 bg-grad-sunset-soft opacity-50" />
                  <ToppingScatter density="med" seed="orders-empty" />
                  <div className="relative">
                    <h3 className="font-bold text-lg mb-1">아직 주문이 없어요</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      세션 장소에 도착하면 발표자 화면의{" "}
                      <strong>주문 QR</strong>을 스캔해 주문 카드를 만들어요.
                      세션 종료 직전 <strong>수령 QR</strong>을 찍으면 스쿱이
                      쌓입니다.
                    </p>
                    {!orderScanOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderScanOpen(true);
                          setOrderFeedback(null);
                        }}
                        className="bounce-press w-full bg-grad-strawberry text-white rounded-3xl p-6 shadow-pink font-bold text-base flex flex-col items-center gap-2"
                      >
                        <Camera className="w-7 h-7" />
                        주문 QR 스캔하기
                      </button>
                    ) : (
                      <CameraScanner
                        onScan={handleOrderScan}
                        onClose={() => setOrderScanOpen(false)}
                        hintLine="세션 장소의 주문 QR을 비추세요"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {!orderScanOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderScanOpen(true);
                        setOrderFeedback(null);
                      }}
                      className="bounce-press w-full inline-flex items-center justify-center gap-2 bg-grad-blueberry text-white rounded-full px-5 py-3 text-sm font-bold shadow-blue"
                    >
                      <Plus className="w-4 h-4" />
                      주문 QR 스캔 (새 주문 추가)
                    </button>
                  ) : (
                    <CameraScanner
                      onScan={handleOrderScan}
                      onClose={() => setOrderScanOpen(false)}
                      hintLine="세션 장소의 주문 QR을 비추세요"
                    />
                  )}

                  {sortedOrders.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </>
              )}

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
            <div className="mx-auto flex flex-col gap-4">
              <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
                <ToppingScatter density="med" seed="audience-topping" />
                <div className="relative">
                  <h3 className="font-bold text-lg mb-1">토핑 보내기</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    현재 세션:{" "}
                    <strong>
                      {SESSIONS.find((s) => s.id === activeSessionId)?.title ?? "—"}
                    </strong>
                  </p>
                  <ToppingInput sessionId={activeSessionId} />
                  <p className="text-xs text-muted-foreground mt-4">
                    전송한 토핑은 발표자 뷰의 질문 그리드에서 확인할 수 있어요.
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                <div className="absolute inset-0 bg-grad-sunset-soft opacity-40" />
                <ToppingScatter density="low" seed="audience-topping-feed" />
                <div className="relative">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-bold text-lg">다른 사람들의 토핑</h3>
                    <span className="text-xs text-muted-foreground">
                      {toppings.filter((t) => t.sessionId === activeSessionId).length}개
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    같은 세션에 전달된 질문들을 확인해보세요.
                  </p>
                  {(() => {
                    const list = toppings
                      .filter((t) => t.sessionId === activeSessionId)
                      .sort((a, b) => b.createdAt - a.createdAt);
                    if (list.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground text-center py-6">
                          아직 도착한 토핑이 없어요 🍒
                        </div>
                      );
                    }
                    return (
                      <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                        {list.map((t) => (
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
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            </div>
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
