import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyToppings, type ToppingDTO } from "@/lib/confesta/toppings.functions";
import { useDeviceId } from "./use-device-id";

/** Returns all toppings authored by this device, across sessions.
 *  Used by ReceiptCard to list "my toppings" on the digital receipt.
 *  Realtime은 사용하지 않음 — 본인 mutation onSuccess (use-toppings.ts의
 *  addTopping/deleteOwnMut)에서 ["my-toppings", deviceId]를 invalidate함. */
export function useMyToppings(): { toppings: ToppingDTO[]; isLoading: boolean } {
  const deviceId = useDeviceId();
  const listFn = useServerFn(listMyToppings);

  const { data, isLoading } = useQuery({
    queryKey: ["my-toppings", deviceId] as const,
    queryFn: () => listFn({ data: { deviceId: deviceId! } }),
    enabled: !!deviceId,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  return { toppings: data?.toppings ?? [], isLoading };
}
