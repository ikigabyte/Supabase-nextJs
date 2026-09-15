// Fetches return a commit callback so an event arriving during a request can
// invalidate its snapshot before it replaces newer state.
export function createCoalescedRefresh(fetchSnapshot: () => Promise<() => void>, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let cancelled = false;
  let revision = 0;

  const run = async () => {
    timer = undefined;
    if (cancelled) return;
    running = true;
    const startedAt = revision;
    try {
      const commit = await fetchSnapshot();
      if (!cancelled && revision === startedAt) commit();
    } catch (error) {
      if (!cancelled) console.error("Background refresh failed:", error);
    } finally {
      running = false;
      if (!cancelled && revision !== startedAt) timer = setTimeout(run, delay);
    }
  };

  return {
    request(immediate = false) {
      if (cancelled) return;
      revision += 1;
      if (running || timer !== undefined) return;
      timer = setTimeout(run, immediate ? 0 : delay);
    },
    invalidate() {
      revision += 1;
    },
    cancel() {
      cancelled = true;
      clearTimeout(timer);
    },
  };
}
