import { ShoppingBag } from "lucide-react";

interface Props {
  slotNumber: number;
}

export function OrderSkeletonCard({ slotNumber }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col gap-3 min-h-[180px]">
      <div className="flex items-start justify-between gap-2">
        <span className="h-6 w-16 rounded-full bg-muted-foreground/15 animate-pulse" />
        <span className="text-xs font-bold text-muted-foreground/70 px-3 py-1 rounded-full bg-muted-foreground/10">
          빈 슬롯 {slotNumber}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-5 w-3/4 rounded-md bg-muted-foreground/15 animate-pulse" />
        <div className="h-4 w-1/2 rounded-md bg-muted-foreground/10 animate-pulse" />
      </div>

      <div className="mt-auto flex items-center gap-2 text-muted-foreground/70 text-sm">
        <ShoppingBag className="w-4 h-4" />
        <span>주문 QR을 스캔해 채워보세요</span>
      </div>
    </div>
  );
}
