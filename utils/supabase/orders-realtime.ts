import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel, type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";
import type { Order } from "@/types/custom";

type Listener = {
  onChange: (payload: RealtimePostgresChangesPayload<Order>) => void;
  onStatus: (status: REALTIME_SUBSCRIBE_STATES, error?: Error) => void;
};

const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;
let currentStatus: REALTIME_SUBSCRIBE_STATES | null = null;
let currentError: Error | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnecting: Promise<void> | undefined;

function connect() {
  if (!channel && !reconnecting && listeners.size > 0) {
    const nextChannel = getBrowserClient().channel("orders_shared");
    channel = nextChannel;
    nextChannel
      .on<Order>("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (channel !== nextChannel) return;
        listeners.forEach((subscriber) => subscriber.onChange(payload));
      })
      .subscribe((status, error) => {
        if (channel !== nextChannel) return;
        currentStatus = status;
        currentError = error;
        listeners.forEach((subscriber) => subscriber.onStatus(status, error));
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

// Recover the shared channel itself, even while navigation is still listening.
// Keep healthy channels and let Supabase handle its normal automatic retries.
export function reconnectOrders(): Promise<void> {
  if (reconnecting) return reconnecting;
  const client = getBrowserClient();
  if (listeners.size === 0 || (currentStatus === "SUBSCRIBED" && client.realtime.isConnected())) {
    return Promise.resolve();
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  const previousChannel = channel;
  channel = null;
  currentStatus = REALTIME_SUBSCRIBE_STATES.CLOSED;
  currentError = undefined;
  listeners.forEach((subscriber) => subscriber.onStatus(REALTIME_SUBSCRIBE_STATES.CLOSED));
  reconnecting = Promise.resolve(previousChannel ? client.removeChannel(previousChannel) : undefined)
    .then(() => {}, (error) => console.error("Failed to remove realtime channel:", error))
    .finally(() => {
      reconnecting = undefined;
      connect();
    });
  return reconnecting;
}

// One delivery per tab, shared by navigation and the current page. Keep status
// transitions in the stream so a row moving out of a queue can be removed.
export function subscribeToOrders(onChange: Listener["onChange"], onStatus: Listener["onStatus"]) {
  const listener = { onChange, onStatus };
  listeners.add(listener);
  if (currentStatus) onStatus(currentStatus, currentError);
  if (reconnectTimer === undefined) connect();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      const previousChannel = channel;
      channel = null;
      currentStatus = null;
      currentError = undefined;
      if (previousChannel) void getBrowserClient().removeChannel(previousChannel);
    }
  };
}
