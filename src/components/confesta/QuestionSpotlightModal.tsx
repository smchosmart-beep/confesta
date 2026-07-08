import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { PresenterCommentBlock } from "./PresenterCommentBlock";

interface SpotlightTopping {
  id: string;
  text: string;
  createdAt?: number;
}

interface Props {
  topping: SpotlightTopping | null;
  sessionId: string;
  commentCount: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function QuestionSpotlightModal({ topping, sessionId, commentCount, onClose, onPrev, onNext }: Props) {
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
      className="fixed inset-0 z-[200] bg-foreground/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 bg-grad-strawberry text-white rounded-full p-2 shadow-pink z-[210]"
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
          className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[210] bounce-press bg-white/90 hover:bg-white rounded-full p-3 shadow-pink"
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
          className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[210] bounce-press bg-white/90 hover:bg-white rounded-full p-3 shadow-pink"
          aria-label="다음 질문"
        >
          <ChevronRight className="w-8 h-8 text-foreground" />
        </button>
      )}

      <div
        className="relative overflow-hidden max-w-4xl w-full max-h-[85vh] overflow-y-auto rounded-[2rem] p-8 sm:p-12 shadow-pink animate-scale-in border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-grad-cream pointer-events-none" />
        <div className="absolute inset-0 bg-grad-sunset-soft opacity-60 pointer-events-none" />

        <p className="relative text-xs uppercase tracking-widest font-bold mb-4 bg-clip-text text-transparent bg-grad-strawberry">
          청중 질문 스포트라이트
        </p>
        <p className="relative text-2xl sm:text-4xl font-extrabold leading-tight text-foreground">
          “{topping.text}”
        </p>
        {topping.createdAt && (
          <p className="relative mt-4 text-sm text-muted-foreground font-mono">
            {new Date(topping.createdAt).toLocaleString("ko-KR")}
          </p>
        )}
        <div className="relative mt-6 pt-6 border-t border-white/70">
          <PresenterCommentBlock
            sessionId={sessionId}
            toppingId={topping.id}
            count={commentCount}
            size="lg"
            defaultOpen
          />
        </div>
      </div>
    </div>
  );
}
