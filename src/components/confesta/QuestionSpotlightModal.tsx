import { X } from "lucide-react";
import type { Topping } from "@/lib/confesta/types";

interface Props {
  topping: Topping | null;
  onClose: () => void;
}

export function QuestionSpotlightModal({ topping, onClose }: Props) {
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
        className="absolute top-4 right-4 bg-card rounded-full p-2 shadow-cream"
        aria-label="닫기"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="max-w-4xl w-full bg-card rounded-[2rem] p-10 sm:p-16 shadow-pink animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-4">
          청중 질문 스포트라이트
        </p>
        <p className="text-3xl sm:text-5xl font-extrabold leading-tight text-foreground">
          “{topping.text}”
        </p>
        <p className="mt-6 text-sm text-muted-foreground font-mono">
          {new Date(topping.createdAt).toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}
