import { Link } from "@tanstack/react-router";
import { ArrowLeft, IceCream } from "lucide-react";

interface Props {
  role: string;
  description: string;
  color: "pink" | "blue" | "mint" | "mango";
}

const COLOR_CLASS: Record<Props["color"], string> = {
  pink: "bg-primary text-primary-foreground",
  blue: "bg-secondary text-secondary-foreground",
  mint: "bg-scoop-mint text-foreground",
  mango: "bg-scoop-mango text-foreground",
};

export function RoleHeader({ role, description, color }: Props) {
  return (
    <header className="px-4 sm:px-6 pt-5 pb-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> 홈으로
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <span
          className={`${COLOR_CLASS[color]} w-12 h-12 rounded-2xl flex items-center justify-center shadow-cream`}
        >
          <IceCream className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">{role}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </header>
  );
}
