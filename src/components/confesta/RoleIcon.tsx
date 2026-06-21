import { Briefcase, Home, IceCream, School, type LucideIcon } from "lucide-react";
import type { AudienceRole } from "@/lib/confesta/audienceRole";

const ICON_MAP: Record<AudienceRole, LucideIcon> = {
  teacher: School,
  specialist: Briefcase,
  parent: Home,
  other: IceCream,
};

interface Props {
  role: AudienceRole | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function RoleIcon({ role, size = 24, strokeWidth = 2, className }: Props) {
  const Icon = ICON_MAP[(role ?? "other") as AudienceRole] ?? IceCream;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
