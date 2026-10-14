import type { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

export type RealtimeStatus = "UNKNOWN" | "OPEN" | "RECONNECTING" | "ERROR";

// Report interruptions immediately, but allow normal SDK retries before asking
// the user to refresh. Repeated errors must not restart the grace period.
export function createRealtimeStatusMonitor(onStatus: (status: RealtimeStatus) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failed = false;
  return {
    update(status: REALTIME_SUBSCRIBE_STATES) {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        timer = undefined;
        failed = false;
        onStatus("OPEN");
      } else if (!failed) {
        failed = true;
        onStatus("RECONNECTING");
        timer = setTimeout(() => {
          timer = undefined;
          onStatus("ERROR");
        }, 5000);
      }
    },
    cancel() {
      clearTimeout(timer);
    },
  };
}
