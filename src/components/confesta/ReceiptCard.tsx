import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Download, Ticket } from "lucide-react";
import { IceCreamCone } from "./IceCreamCone";
import { useMyToppings } from "@/hooks/use-my-toppings";
import { useAudience } from "@/hooks/use-audience";
// Note: floating background toppings are intentionally NOT used on the receipt tab.
import { SESSIONS } from "@/lib/confesta/mockData";
import { derivePersona, type Persona } from "@/lib/confesta/persona";
import type { StackedScoop } from "@/lib/confesta/types";
import { MIN_SCOOPS_FOR_RECEIPT } from "@/lib/confesta/shared";

const sessionTitle = (sessionId: string) =>
  SESSIONS.find((s) => s.id === sessionId)?.title ?? sessionId;

const SAMPLE_SCOOPS: StackedScoop[] = [
  { id: "sample-1", sessionId: "s1", flavor: "mint", stackedAt: 0 },
  { id: "sample-2", sessionId: "s2", flavor: "strawberry", stackedAt: 0 },
  { id: "sample-3", sessionId: "s3", flavor: "mango", stackedAt: 0 },
];

const SAMPLE_TOPPING_ENTRIES: { kind: "question" | "answer"; promptText?: string; text: string }[] = [
  { kind: "question", text: "배수판별법을 초3 수업에 어떻게 녹이나요?" },
  { kind: "answer", promptText: "선호하는 LLM은?", text: "gemini" },
  { kind: "question", text: "AI 모델이 틀린 배수를 줄 때 대처법은?" },
];

export function ReceiptCard() {
  const { scoops, receipt, issueReceipt, reset, issuingReceipt } = useAudience();
  const token = receipt?.token ?? null;
  const redeemed = receipt?.redeemedAt ? { at: receipt.redeemedAt } : null;
  const { toppings: myToppingsAll } = useMyToppings();
  // sort by createdAt asc for chronological receipt order
  const myToppings = myToppingsAll
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);

  const receiptRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [savingSample, setSavingSample] = useState(false);

  const captureToPng = async (
    node: HTMLElement,
    filenamePrefix: string,
  ) => {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    link.download = `${filenamePrefix}-${stamp}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSaveImage = async () => {
    if (!receiptRef.current || saving) return;
    setSaving(true);
    try {
      await captureToPng(receiptRef.current, "confesta-receipt");
      toast.success("영수증 이미지를 저장했어요");
    } catch (err) {
      console.error(err);
      toast.error("이미지 저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSampleImage = async () => {
    if (!sampleRef.current || savingSample) return;
    setSavingSample(true);
    try {
      await captureToPng(sampleRef.current, "confesta-receipt-sample");
      toast.success("샘플 영수증 이미지를 저장했어요");
    } catch (err) {
      console.error(err);
      toast.error("이미지 저장에 실패했어요");
    } finally {
      setSavingSample(false);
    }
  };

  const ready = scoops.length >= MIN_SCOOPS_FOR_RECEIPT;

  // Auto-issue receipt as soon as the minimum scoop threshold is met and no token exists.
  useEffect(() => {
    if (ready && !token && !issuingReceipt) {
      void issueReceipt().catch((e) => console.error(e));
    }
  }, [ready, token, issuingReceipt, issueReceipt]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden bg-card rounded-3xl p-8 shadow-cream border border-white/60 text-center">
          <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
          <div className="relative">
            <Ticket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-bold text-lg">아직 영수증을 받을 수 없어요</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {MIN_SCOOPS_FOR_RECEIPT}스쿱 이상 모으면 디지털 보상 영수증이 자동으로 발급됩니다.
            </p>
            <p className="text-sm font-semibold mt-3">현재 {scoops.length} / 3 스쿱</p>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-grad-mango/20 text-grad-mango text-xs font-bold">
            🎟 미리보기 — {MIN_SCOOPS_FOR_RECEIPT}스쿱 이상 모으면 이렇게 발급돼요
          </span>
        </div>

        <div ref={sampleRef}>
          <SampleReceipt scoops={SAMPLE_SCOOPS} />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSaveSampleImage}
            disabled={savingSample}
            className="bounce-press inline-flex items-center gap-2 rounded-full bg-grad-strawberry text-white px-5 py-2.5 text-sm font-bold shadow-pink disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {savingSample ? "저장 중..." : "샘플 이미지로 저장"}
          </button>
        </div>
      </div>
    );
  }


  const activeToken = token;

  return (
    <div className="relative mx-auto max-w-sm">
      <div ref={receiptRef} className="relative overflow-hidden bg-white text-foreground rounded-t-3xl zigzag-bottom pb-8 px-6 pt-8 shadow-pink">
        <div className="absolute inset-x-0 top-0 h-2 bg-grad-sunset" />
        <div className="relative text-center border-b border-dashed border-foreground/20 pb-4 mb-4">
          <h2 className="font-extrabold text-xl tracking-tight text-grad-sunset">
            CONFESTA · Sweet Reward
          </h2>
          <p className="text-xs text-muted-foreground mt-1">디지털 보상 영수증</p>
        </div>

        <div className="relative flex justify-center my-4">
          <IceCreamCone scoops={scoops} size={150} toppingCount={Math.min(myToppings.length, 3)} />
        </div>

        <div className="relative text-xs space-y-1 mb-4 font-mono">
          {scoops.map((s, i) => (
            <div key={s.id} className="flex justify-between gap-3">
              <span className="shrink-0">스쿱 #{i + 1}</span>
              <span className="text-right truncate">{sessionTitle(s.sessionId)}</span>
            </div>
          ))}

          {myToppings.length > 0 && (
            <div className="pt-2 mt-2 border-t border-dashed border-foreground/20 space-y-1">
              {myToppings.map((t, i) => (
                <div key={t.id} className="flex justify-between gap-3 items-start">
                  <span className="shrink-0">토핑 #{i + 1}</span>
                  <span className="text-right break-keep leading-snug">
                    {t.kind === "answer" && t.promptText
                      ? `${t.promptText} - ${t.text}`
                      : t.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-foreground/20">
            <span>발급</span>
            <span suppressHydrationWarning>{new Date().toLocaleString("ko-KR")}</span>
          </div>
        </div>

        <div className="relative bg-white p-3 rounded-2xl border border-foreground/10 flex justify-center">
          {activeToken && (
            <QRCode value={activeToken} size={140} level="M" />
          )}
        </div>

        <div className="relative mt-4 flex justify-center">
          {redeemed ? (
            <span className="px-4 py-1.5 rounded-full bg-grad-muted text-foreground/70 text-xs font-bold">
              [USED / GOODS COLLECTED]
            </span>
          ) : (
            <span className="px-4 py-1.5 rounded-full bg-grad-blueberry text-white text-xs font-bold shadow-blue">
              [READY FOR REDEMPTION]
            </span>
          )}
        </div>

        <PersonaBadge persona={derivePersona(scoops)} />
      </div>

      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={saving}
          className="bounce-press inline-flex items-center gap-2 rounded-full bg-grad-strawberry text-white px-5 py-2.5 text-sm font-bold shadow-pink disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          {saving ? "저장 중..." : "이미지로 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("스쿱 기록을 초기화하시겠어요?")) reset();
          }}
          className="text-xs text-muted-foreground underline"
        >
          데모 초기화
        </button>
      </div>
    </div>
  );
}

function SampleReceipt({ scoops }: { scoops: StackedScoop[] }) {
  return (
    <div className="relative mx-auto max-w-sm opacity-90">
      <div className="relative overflow-hidden bg-white text-foreground rounded-t-3xl zigzag-bottom pb-8 px-6 pt-8 shadow-cream border border-dashed border-grad-mango/40">
        <div className="absolute inset-x-0 top-0 h-2 bg-grad-sunset" />
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-grad-mango/20 text-grad-mango text-[10px] font-extrabold tracking-wide">
          SAMPLE
        </div>
        <div className="relative text-center border-b border-dashed border-foreground/20 pb-4 mb-4">
          <h2 className="font-extrabold text-xl tracking-tight text-grad-sunset">
            CONFESTA · Sweet Reward
          </h2>
          <p className="text-xs text-muted-foreground mt-1">디지털 보상 영수증</p>
        </div>

        <div className="relative flex justify-center my-4">
          <IceCreamCone scoops={scoops} size={150} toppingCount={3} />
        </div>

        <div className="relative text-xs space-y-1 mb-4 font-mono">
          {scoops.map((s, i) => (
            <div key={s.id} className="flex justify-between gap-3">
              <span className="shrink-0">스쿱 #{i + 1}</span>
              <span className="text-right truncate">{sessionTitle(s.sessionId)}</span>
            </div>
          ))}

          <div className="pt-2 mt-2 border-t border-dashed border-foreground/20 space-y-1">
            {SAMPLE_TOPPING_ENTRIES.map((entry, i) => (
              <div key={i} className="flex justify-between gap-3 items-start">
                <span className="shrink-0">토핑 #{i + 1}</span>
                <span className="text-right break-keep leading-snug">
                  {entry.kind === "answer" && entry.promptText
                    ? `${entry.promptText} - ${entry.text}`
                    : entry.text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-foreground/20">
            <span>발급</span>
            <span>2026-06-10 14:00</span>
          </div>
        </div>


        <PersonaBadge persona={derivePersona(scoops)} />
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-3">
        ※ 실제 영수증은 내가 모은 스쿱과 발급 시각으로 자동 생성됩니다.
      </p>
    </div>
  );
}

function PersonaBadge({ persona }: { persona: Persona }) {
  return (
    <div className="relative mt-5 pt-4 border-t border-dashed border-foreground/20">
      <p className="text-center text-[11px] tracking-wider font-bold text-muted-foreground">
        오늘 당신의 AI 교육자 유형
      </p>
      <div
        className={`mt-2 mx-auto max-w-[260px] rounded-2xl px-4 py-3 text-white text-center shadow-pink ${persona.accent}`}
      >
        <div className="text-2xl leading-none">{persona.emoji}</div>
        <div className="mt-1 font-extrabold text-base leading-tight">
          [{persona.title}]
        </div>
        <p className="mt-1 text-[11px] opacity-95 leading-snug">
          {persona.tagline}
        </p>
      </div>
    </div>
  );
}

