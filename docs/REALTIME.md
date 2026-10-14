# Realtime architecture and troubleshooting

Source reviewed: 2026-10-14. Keep this file current when changing channels, recovery, or the connection indicator.

## How an update reaches the page

1. A UI action calls a server action in `utils/actions.ts`, which writes to Supabase using `utils/supabase/server.ts`. Some actions also trigger external production/Zendesk work.
2. Supabase Postgres Changes delivers authorized changes over the browser's WebSocket connection.
3. `utils/supabase/client.ts` provides one browser client per tab. Multiple channels use the same transport. Different tabs/devices have their own connections.
4. Listeners patch local React state or request a database snapshot. The mutation's HTTP response and the WebSocket event are separate: a disconnect warning does not, by itself, mean the write failed. Check the action response and saved row before repeating a change.

Ordinary order changes do not explicitly disconnect the shared channel. The production subscription effect depends on the client, queue type, and an explicit recovery token, rather than the orders array or row selection.

## Channels and consumers

| Channel | Table | Consumers | Update behavior |
| --- | --- | --- | --- |
| `orders_shared` | `public.orders`, all events | Navigation counts, production queues, Timeline line items | One subscription shared through `utils/supabase/orders-realtime.ts`; each consumer handles the same event locally. |
| `tracking_timeline_realtime` | `public.tracking_orders`, all events | Timeline | Patches eligible tracking rows; reconciles initial load, reconnects, incomplete deletes, and Recently Shipped's latest 100 rows. |
| `order_viewers_rt` | `public.order_viewers`, all events | Production page viewer indicators | Batches incoming selection changes after a 200 ms quiet period. Status is logged separately; viewer health does not drive the main orders indicator. |

The orders and tracking subscriptions intentionally listen across their tables. Filtering only on a queue's new status or `active=true` can miss transitions that remove rows from the current view.

Navigation refreshes the small `name_id, production_status` projection, paginated in batches of 1,000. Membership changes schedule a coalesced refresh after 2 seconds; notes-only updates do not normally query counts again. Production snapshots also paginate by 1,000. Timeline tracking reconciliation coalesces bursts over 250 ms.

Viewer selection writes use `updateOrderViewer()` in `utils/actions.ts`: delete the current user's previous viewer rows, then upsert the selected rows. Selecting many rows can therefore generate several database events; these are Postgres Changes events, not Supabase Presence messages.

## Connection lifecycle and recovery

- The browser client already enables `realtime.worker: true` to run heartbeat timers in a Web Worker. This helps with background timer throttling, but cannot prevent a browser/OS suspension or a network/service interruption.
- The SDK retries transport/channel errors and timeouts. The application allows those retries to run without restarting a healthy socket on every error.
- `orders_shared` is recreated after 1 second when it reports `CLOSED`. Removing the last subscriber releases it; callbacks from obsolete channels are ignored.
- `reconnectOrders()` replaces an unhealthy shared channel, waits for its removal, coalesces simultaneous recovery requests, and leaves healthy channels alone.
- Production pages request recovery and a new snapshot on browser `online` events. Returning to a visible tab also does so after initial data has loaded, throttled to once per 15 minutes.
- Timeline recreates a closed tracking channel after 1 second and cancels that retry when leaving/changing the view. Successful subscription requests reconciliation of missed tracking updates.
- `utils/coalesced-refresh.ts` prevents an older in-flight snapshot from overwriting a newer event. Production initial/reconnect snapshots use this helper as well as navigation/tracking snapshots. Every successful production subscription requests a snapshot, closing the initial fetch/subscription gap.

The client does not replay all missed Postgres Changes after reconnecting; snapshot queries repair the current state. The main indicator represents subscription status, not proof that every query succeeded or every row is fresh. Failed snapshot queries log `Background refresh failed:` and retry on a later refresh trigger; they do not currently have an independent retry loop. Timeline line-item snapshots and viewer state have separate synchronization paths.

The production page also queries the special `order_id=0` row every 30 minutes and compares its notes timestamp with the page's saved value. Its “page might be out of sync” message is a separate freshness signal, not a WebSocket diagnosis. That row also controls version/maintenance banners, which can take priority over the displayed connection warning.

## What the indicator means

`utils/supabase/realtime-status.ts` maps SDK statuses to the UI:

| UI state | Meaning |
| --- | --- |
| Amber `CONNECTING` / `connecting` | Subscription has not yet been confirmed. |
| Green `ACTIVE` / `live` | Orders channel subscribed; Timeline requires both its orders and tracking channels. |
| Amber `RECONNECTING` / `reconnecting` | An error, timeout, or closure occurred less than 5 seconds ago. Live updates may be delayed. |
| Red `DISCONNECTED` / `disconnected` | The interruption has continued for at least 5 seconds. Automatic recovery still runs; refresh if it persists. |

Repeated failures do not extend the 5-second grace period. Recovery cancels the pending warning immediately. Production checkbox clicks during recovery still show a brief warning about delayed updates; they are not blocked. This grace period reduces alarm flicker; it does not make an interrupted connection healthy.

## Capture the next occurrence

After running a build containing these changes:

1. Open browser Developer Tools on the affected page. Enable **Preserve log** in Console and Network.
2. In Network, select **WS**, then the Supabase `/realtime/v1/websocket` request. Keep its Messages view open. Note the time, page, action, and whether the tab had been idle/backgrounded.
3. Perform the usual action. Inspect its HTTP/server-action response separately from the WebSocket. Avoid changing real orders solely as a test; use a designated test order if one is available.
4. In Console, inspect the diagnostic history:

   ```js
   console.table(window.stickerbeatRealtimeDiagnostics ?? [])
   ```

   To copy the history using Chrome/Arc DevTools:

   ```js
   copy(JSON.stringify(window.stickerbeatRealtimeDiagnostics ?? [], null, 2))
   ```

5. Match that UTC timestamp against the project's Supabase **Realtime logs** and **Realtime Reports**. Compare connection errors, channel joins, connected clients, and event volume at the time of the interruption.

Diagnostics keep the last 100 events in this tab's memory, including UTC timestamps, channel/heartbeat/transport/auth status, document visibility, `navigator.onLine`, subscription error messages, and available WebSocket close code/reason. They reset on a full reload. `navigator.onLine=true` does not prove the Supabase endpoint is reachable.

Healthy heartbeat entries are recorded without console warnings. Failures emit `[realtime]` warnings. Raw SDK payloads, row data, session objects, and connection URLs are not logged by this diagnostic code. WebSocket messages/HAR exports can contain credentials and private order data; use the compact diagnostic history for sharing instead.

`orders_shared: RECONNECT_REQUESTED` marks an application-initiated recovery of an unhealthy channel. Distinguish it from a server/SDK `CLOSED` record when reviewing the sequence.

## Interpret the evidence before changing settings

| Evidence | Likely direction | Next step |
| --- | --- | --- |
| `heartbeat: timeout`, then transport close and multiple channel errors | Transport heartbeat was not acknowledged. | Compare idle/visibility timing, Wi-Fi/VPN/proxy behavior, worker errors, and Supabase incidents/logs. Compare another network/device. |
| All channels fail at the same time | Shared WebSocket/network/service issue is more likely than one row handler. | Inspect transport close and server logs first. |
| One channel fails, others/heartbeats continue | Channel-specific authorization, publication, or server subscription problem. | Read the channel error and Realtime system messages; inspect publication and SELECT/RLS permissions. |
| `TOKEN_REFRESHED` or sign-in events coincide with failures | Auth refresh might be involved; timing alone is not proof. | Check auth request outcomes and channel authorization errors without logging JWTs. |
| Rate/connection/join limit errors in WS messages or Supabase logs | Project limit was reached. | Confirm measured peaks; reduce duplicate tabs/subscriptions or burst traffic before changing limits. |
| WebSocket close `1006` | Abnormal closure; the code does not identify the cause. | Correlate heartbeat, network, and server records. |
| Action HTTP request fails while heartbeats/channels remain healthy | Mutation/server-action failure. | Diagnose the action response and server logs separately. |
| `Background refresh failed:` after reconnection | Socket may be restored while reconciliation failed. | Inspect query/auth errors and refresh; consider bounded query retries if failures recur. |

For read-only publication inspection in Supabase SQL Editor:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('orders', 'tracking_orders', 'order_viewers');
```

An absent table needs investigation before any publication change. Existing SELECT/RLS rules also govern delivered changes. No database, publication, policy, or service-limit changes are part of this source patch.

## SDK version caveat

The reviewed installation resolves `@supabase/supabase-js` **2.49.4** and `@supabase/ssr` **0.6.1** to Realtime **2.11.2** through pnpm's nested dependencies. A separate top-level Realtime **2.107.0** exists, but is not the implementation used by the browser client. Resolve from the importing package to verify:

```sh
node -e 'const p=require("path"); const r=require.resolve("@supabase/realtime-js/package.json",{paths:[p.dirname(require.resolve("@supabase/supabase-js/package.json"))]}); console.log(r,require(r).version)'
```

This older SDK uses a 30-second default heartbeat and retry delays of 1/2/5/10 seconds. The diagnostics parse its logger's heartbeat messages; they do not assume the newer `onHeartbeat`/`heartbeatCallback` APIs exist. Recheck this adapter after an SDK upgrade.

Its native WebSocket error handler can call the logger with an undefined message. The logger now handles that safely; the previous string operations could throw inside the error callback and interrupt connection-error handling.

A controlled Supabase SDK upgrade is a follow-up option if diagnostics show recurring client/worker problems. Test auth refresh, background tabs, network loss, and all three subscriptions with the dependency graph actually used by the deployment. Do not assume the top-level version describes that graph.

## Validation and remaining boundaries

Local checks:

```sh
node --test tests/realtime-sync.test.cjs
npx tsc --noEmit
npm run build
git diff --check
```

Verified locally on 2026-10-14: all 19 regression tests passed, TypeScript passed, the production build passed, and `git diff --check` passed.

Regression tests exercise the source connection handlers with simulated statuses/timers/queries, including brief recovery, persistent failure, warning cleanup, shared subscription recovery, closed Timeline recovery, stale snapshot protection, count coalescing, and tracking row transitions. These checks do not reproduce the production network fault.

Before treating the incident as resolved, verify a deployed build with two authorized browser sessions and a designated test order: changes propagate to both; temporary offline/online recovery resynchronizes the view; a sustained outage becomes red; returning from an idle tab recovers; navigation and Timeline counts/rows agree. Viewer subscriptions currently log failures and use SDK retries, but do not independently recreate a terminally closed channel or refetch viewer state after a gap. No live reproduction or production deployment was performed during this investigation.

## Pre-deployment browser checklist

Use a local/preview build containing the patch, two independent authorized browser sessions, and designated test data. A local frontend can still point to the production database and invoke production webhooks; verify the test environment before moving or deleting orders.

| Test | Expected result |
| --- | --- |
| Normal changes | Change notes, assignee, and queue status in session A. Session B updates without reload. A moved order leaves the old queue and enters the new one; navbar counts settle after their existing 2-second delay. |
| Missed updates during an outage | Interrupt session A's connection, change the test order in B, then restore A. A catches up automatically, including removals and changes that happened while disconnected. |
| Brief and sustained interruptions | After a channel failure is detected, amber appears immediately; recovery within 5 seconds avoids a red banner. A longer failure becomes red, and recovery clears the banner and checkbox warning toast. The 5-second timer starts at failure detection, not when connectivity was physically lost. |
| Overlapping changes and queries | Slow snapshot queries while B updates or removes a test row. A must not restore the removed row or revert newer data when an older request finishes. A full initial/reconnect refresh must eventually finish under realistic event traffic. |
| Timeline and navigation | Repeat recovery in Active, Recently Shipped, and Sync Conflicts views. Switch views/routes during recovery; verify correct rows and no accumulating channels or repeated late warnings from the previous page. |
| Idle tab and auth refresh | Background A for at least 16 minutes, make changes in B, then return. Repeat across an auth token refresh and confirm subsequent changes still arrive. |
| Viewer indicators | Change selected rows in B and verify A's viewer names still update after recovery. Investigate viewer-only staleness separately from the orders indicator. |

Capture `window.stickerbeatRealtimeDiagnostics` before reloading if anything fails. A saved mutation must not be repeated merely because its realtime delivery was delayed.

## Tradeoffs and remaining risks

- The red banner is delayed by 5 seconds after detection. Amber still signals delayed updates, and checkbox actions remain allowed while reconnecting; the grace period does not guarantee current data.
- Successful subscriptions request complete queue snapshots. Initial connection and unstable/repeated reconnects can increase database reads and briefly delay rendering large queues.
- Snapshot invalidation favors newer events. Sustained table activity can repeatedly discard an in-flight snapshot and postpone completion of initial/catch-up loading, even when the events concern another queue.
- Repeated terminal tracking-channel closures schedule repeated 1-second joins. Monitor channel-join/error volume if a persistent authorization or service problem causes a reconnect loop.
- Existing gaps remain: subscription success can turn the indicator green before reconciliation succeeds; failed snapshot queries lack an independent retry loop; viewer channels lack terminal-close recreation and catch-up queries.
- Diagnostics are lightweight and limited to 100 in-memory events, but reloads erase them and prolonged failure loops can produce many console warnings. Heartbeat parsing is coupled to the resolved SDK logger format.

Deployment gate: both sessions must agree on saved order state after reconnection without a manual reload, and realistic event traffic must not leave initial/catch-up loading stalled. Automated checks alone do not establish those properties in a real browser.

Official references: [heartbeat monitoring](https://supabase.com/docs/guides/troubleshooting/realtime-heartbeat-messages), [background disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794), [Realtime limits](https://supabase.com/docs/guides/realtime/limits), and [Realtime reports](https://supabase.com/docs/guides/observability/reports). Current documentation can describe APIs newer than this project's resolved SDK.
