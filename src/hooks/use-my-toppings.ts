import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyToppings, type ToppingDTO } from "@/lib/confesta/toppings.functions";
import { useDeviceId } from "./use-device-id";
import { subscribeMyToppings } from "@/lib/confesta/realtime-channel";

/** Returns all toppings authored by this device, across sessions.
 *  Used by ReceiptCard to list "my toppings" on the digital receipt. */
export function useMyToppings(): { toppings: ToppingDTO[]; isLoading: boolean } {
  const deviceId = useDeviceId();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyToppings);

  const queryKey = ["my-toppings", deviceId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { deviceId: deviceId! } }),
    enabled: !!deviceId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!deviceId) return;
    return subscribeMyToppings(deviceId, () =>
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] }),
    );
  }, [deviceId, qc]);

  return { toppings: data?.toppings ?? [], isLoading };
}
