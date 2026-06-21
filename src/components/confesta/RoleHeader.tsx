import { Link } from "@tanstack/react-router";
import { ArrowLeft, IceCream } from "lucide-react";
import { ToppingScatter } from "./ToppingDecor";

interface Props {
  role: string;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  color: "pink" | "blue" | "mint" | "mango";
  right?: React.ReactNode;
}

const ICON_GRAD: Record<Props["color"], string> = {
  pink: "bg-grad-strawberry",
  blue: "bg-grad-blueberry",
  mint: "bg-grad-mint",
  mango: "bg-grad-mango",
};

export function RoleHeader({ role, description, subtitle, color, right }: Props) {
  return (
    <header className="relative px-4 sm:px-6 pt-5 pb-4 overflow-hidden">
      <ToppingScatter density="low" seed={`hdr-${color}`} />
      <Link
        to="/"
        className="relative inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> 홈으로
      </Link>
      <div className="relative mt-3 flex items-center gap-3">
        <span
          className={`${ICON_GRAD[color]} text-white w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-pink ring-2 ring-white/60`}
        >
          <IceCream className="w-6 h-6 drop-shadow" />
        </span>
        <div className={`min-w-0 ${right ? "" : "flex-1"}`}>
          <h1 className="text-2xl font-extrabold truncate text-grad-sunset">
            {role}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex-1 min-w-0 relative">{right}</div>}
      </div>
    </header>
  );
}
