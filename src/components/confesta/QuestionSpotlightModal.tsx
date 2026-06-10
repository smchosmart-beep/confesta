import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Topping } from "@/lib/confesta/types";


interface Props {
  topping: Topping | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function QuestionSpotlightModal({ topping, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, onClose]);

  if (!topping) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 bg-grad-strawberry text-white rounded-full p-2 shadow-pink z-10"
        aria-label="닫기"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 이전 질문 */}
      {onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-10 bounce-press bg-white/90 hover:bg-white rounded-full p-3 shadow-pink"
          aria-label="이전 질문"
        >
          <ChevronLeft className="w-8 h-8 text-foreground" />
        </button>
      )}

      {/* 다음 질문 */}
      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-10 bounce-press bg-white/90 hover:bg-white rounded-full p-3 shadow-pink"
          aria-label="다음 질문"
        >
          <ChevronRight className="w-8 h-8 text-foreground" />
        </button>
      )}

      <div
        className="relative overflow-hidden max-w-4xl w-full rounded-[2rem] p-10 sm:p-16 shadow-pink animate-scale-in border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-grad-cream" />
        <div className="absolute inset-0 bg-grad-sunset-soft opacity-60" />
        <ToppingScatter density="high" seed={`spot-${topping.id}`} />
        <p className="relative text-xs uppercase tracking-widest font-bold mb-4 bg-clip-text text-transparent bg-grad-strawberry">
          청중 질문 스포트라이트
        </p>
        <p className="relative text-3xl sm:text-5xl font-extrabold leading-tight text-foreground">
          “{topping.text}”
        </p>
        <p className="relative mt-6 text-sm text-muted-foreground font-mono">
          {new Date(topping.createdAt).toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}
