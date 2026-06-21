import { Link } from "@tanstack/react-router";
import { ArrowLeft, IceCream } from "lucide-react";
import { AUDIENCE_ROLES, type AudienceRole } from "@/lib/confesta/audienceRole";
import { RoleIcon } from "./RoleIcon";
import { ToppingScatter } from "./ToppingDecor";

interface Props {
  onPick: (role: AudienceRole) => void;
  /** "변경" 시에 호출되는 모드일 때 닫기 버튼 표시 */
  onCancel?: () => void;
}

export function AudienceRoleGate({ onPick, onCancel }: Props) {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <ToppingScatter density="med" seed="role-gate" />

      <header className="relative px-4 sm:px-6 pt-5 pb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </Link>
      </header>

      <section className="relative px-5 pb-12 max-w-md mx-auto text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-grad-strawberry text-white shadow-pink ring-2 ring-white/60 mb-4">
          <IceCream className="w-7 h-7" />
        </span>
        <h1 className="text-2xl font-extrabold text-grad-sunset bg-grad-sunset-anim bg-clip-text">
          어떤 청중이신가요?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          질문·키워드 응답을 역할별로 구분해서
          <br />
          발표자에게 더 의미 있게 전달돼요.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          {AUDIENCE_ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onPick(r.key)}
              className={`bounce-press relative overflow-hidden ${r.bg} ${r.text} rounded-3xl px-4 py-5 shadow-cream border border-white/60 flex flex-col items-center gap-2 font-extrabold`}
            >
              <RoleIcon role={r.key} size={32} strokeWidth={2.25} />
              <span className="text-base">{r.ko}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          언제든 청중 화면 상단에서 역할을 바꿀 수 있어요.
        </p>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 inline-flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground bg-white/70 border border-white/80 rounded-full px-4 py-2"
          >
            취소
          </button>
        )}
      </section>
    </main>
  );
}
