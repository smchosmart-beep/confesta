import { roleDef } from "@/lib/confesta/audienceRole";
import type { AudienceRole } from "@/lib/confesta/audienceRole";

interface Props {
  role: AudienceRole | null | undefined;
  size?: "xs" | "sm";
  showLabel?: boolean;
  className?: string;
}

/** 토핑·응답 카드 좌상단 등에서 사용하는 작은 역할 배지 */
export function RoleBadge({ role, size = "xs", showLabel = true, className = "" }: Props) {
  const def = roleDef(role);
  const padding =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold text-white shadow-cream ${def.bg} ${padding} ${className}`}
      title={`청중 역할: ${def.ko}`}
    >
      <span aria-hidden>{def.emoji}</span>
      {showLabel && <span>{def.ko}</span>}
    </span>
  );
}
