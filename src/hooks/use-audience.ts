import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo } from "react";
import {
  getAudienceState,
  placeOrderFromQR,
  pickupFromQR,
  generateReceipt,
  resetMyCone,
  type AudienceStateDTO,
  type AudienceMutationResult,
} from "@/lib/confesta/audience.functions";
import type { Order, StackedScoop, ScoopFlavor } from "@/lib/confesta/types";
import { useDeviceId } from "./use-device-id";

const EMPTY_STATE: AudienceStateDTO = { orders: [], scoops: [], receipt: null };

export function useAudience() {
  const deviceId = useDeviceId();
  const qc = useQueryClient();
  const getState = useServerFn(getAudienceState);
  const placeFn = useServerFn(placeOrderFromQR);
  const pickupFn = useServerFn(pickupFromQR);
  const receiptFn = useServerFn(generateReceipt);
  const resetFn = useServerFn(resetMyCone);

  const queryKey = ["audience-state", deviceId] as const;

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => getState({ data: { deviceId: deviceId! } }),
    enabled: !!deviceId,
    staleTime: 10_000,
  });

  const applyResult = useCallback(
    (r: AudienceMutationResult) => {
      if (r.state) qc.setQueryData(queryKey, r.state);
      else void refetch();
      return r;
    },
    [qc, queryKey, refetch],
  );

  const placeOrder = useMutation({
    mutationFn: (payload: string) => placeFn({ data: { deviceId: deviceId!, payload } }),
    onSuccess: applyResult,
  });

  const pickup = useMutation({
    mutationFn: (payload: string) => pickupFn({ data: { deviceId: deviceId!, payload } }),
    onSuccess: applyResult,
  });

  const issueReceipt = useMutation({
    mutationFn: () => receiptFn({ data: { deviceId: deviceId! } }),
    onSuccess: applyResult,
  });

  const reset = useMutation({
    mutationFn: () => resetFn({ data: { deviceId: deviceId! } }),
    onSuccess: applyResult,
  });

  const state = data ?? EMPTY_STATE;

  const orders: Order[] = useMemo(
    () =>
      state.orders.map((o) => ({
        id: o.id,
        sessionId: o.sessionId,
        orderedAt: o.orderedAt,
        pickedUpAt: o.pickedUpAt,
      })),
    [state.orders],
  );

  const scoops: StackedScoop[] = useMemo(
    () =>
      state.scoops.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        flavor: s.flavor as ScoopFlavor,
        stackedAt: s.stackedAt,
      })),
    [state.scoops],
  );

  return {
    deviceId,
    isLoading: isLoading || !deviceId,
    orders,
    scoops,
    receipt: state.receipt,
    placeOrder: placeOrder.mutateAsync,
    pickup: pickup.mutateAsync,
    issueReceipt: issueReceipt.mutateAsync,
    reset: reset.mutateAsync,
    issuingReceipt: issueReceipt.isPending,
  };
}
