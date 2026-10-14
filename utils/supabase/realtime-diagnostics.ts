type DiagnosticDetails = {
  message?: string;
  code?: number;
  reason?: string;
  wasClean?: boolean;
};

type RealtimeDiagnostic = DiagnosticDetails & {
  at: string;
  scope: string;
  status: string;
  visibility: string;
  online: boolean;
};

declare global {
  interface Window {
    stickerbeatRealtimeDiagnostics?: RealtimeDiagnostic[];
  }
}

// A bounded, tab-local history. Never store database rows, auth tokens or raw
// SDK logger data: those may contain order details and access credentials.
export function recordRealtimeDiagnostic(scope: string, status: string, details: DiagnosticDetails = {}) {
  if (typeof window === "undefined") return;
  const entry: RealtimeDiagnostic = {
    ...details,
    at: new Date().toISOString(),
    scope,
    status,
    visibility: document.visibilityState,
    online: navigator.onLine,
  };
  const history = window.stickerbeatRealtimeDiagnostics ??= [];
  history.push(entry);
  if (history.length > 100) history.splice(0, history.length - 100);
  if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED", "error", "timeout", "disconnected", "close", "worker error"].includes(status)) {
    console.warn("[realtime]", entry);
  }
}
