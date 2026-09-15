import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";
import type { Order } from "@/types/custom";

type Listener = {
  onChange: (payload: RealtimePostgresChangesPayload<Order>) => void;
  onStatus: (status: REALTIME_SUBSCRIBE_STATES) => void;
};

const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;
let currentStatus: REALTIME_SUBSCRIBE_STATES | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

function connect() {
  if (!channel && listeners.size > 0) {
    const nextChannel = getBrowserClient().channel("orders_shared");
    channel = nextChannel;
    nextChannel
      .on<Order>("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (channel !== nextChannel) return;
        listeners.forEach((subscriber) => subscriber.onChange(payload));
      })
      .subscribe((status) => {
        if (channel !== nextChannel) return;
        currentStatus = status;
        listeners.forEach((subscriber) => subscriber.onStatus(status));
        // Supabase retries errors/timeouts itself, but removes a closed channel.
        if (status === "CLOSED" && channel === nextChannel) {
          channel = null;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined;
            connect();
          }, 1000);
        }
      });
  }
}

// One delivery per tab, shared by navigation and the current page. Keep status
// transitions in the stream so a row moving out of a queue can be removed.
export function subscribeToOrders(onChange: Listener["onChange"], onStatus: Listener["onStatus"]) {
  const listener = { onChange, onStatus };
  listeners.add(listener);
  if (currentStatus) onStatus(currentStatus);
  if (reconnectTimer === undefined) connect();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      const previousChannel = channel;
      channel = null;
      currentStatus = null;
      if (previousChannel) void getBrowserClient().removeChannel(previousChannel);
    }
  };
}
