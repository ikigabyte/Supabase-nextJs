const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function clock() {
  const pending = new Map();
  let id = 0;
  return {
    setTimeout(fn, delay) { pending.set(++id, { fn, delay }); return id; },
    clearTimeout(key) { pending.delete(key); },
    get size() { return pending.size; },
    run(delay) {
      const [key, { fn }] = [...pending.entries()].find(([, entry]) => delay === undefined || entry.delay === delay);
      pending.delete(key);
      return fn();
    },
  };
}

function evaluate(source, globals = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {}, console, setTimeout, clearTimeout, ...globals };
  vm.runInNewContext(output, context);
  return context.exports;
}

function load(file, globals) {
  return evaluate(fs.readFileSync(file, 'utf8'), globals);
}

// Execute the actual component effect without mounting unrelated UI or writing
// to Supabase. Locate it by AST, so formatting changes do not affect the test.
function effect(file, marker, globals) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let body;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
        node.arguments[0]?.getText(source).includes(marker)) body = node.arguments[0].body.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(body, `Missing effect: ${marker}`);
  return evaluate(`export function setup() ${body}`, globals).setup();
}

function refreshFactory(timer) {
  return load('utils/coalesced-refresh.ts', timer).createCoalescedRefresh;
}

function statusFactory(timer) {
  return load('utils/supabase/realtime-status.ts', timer).createRealtimeStatusMonitor;
}

test('brief interruptions stay amber; sustained errors turn red without extending the grace period', () => {
  const timer = clock();
  const states = [];
  const monitor = statusFactory(timer)((status) => states.push(status));
  monitor.update('SUBSCRIBED');
  monitor.update('CHANNEL_ERROR');
  monitor.update('SUBSCRIBED');
  assert.equal(timer.size, 0, 'recovery cancels the warning');
  assert.deepEqual(states, ['OPEN', 'RECONNECTING', 'OPEN']);
  monitor.update('TIMED_OUT');
  monitor.update('CHANNEL_ERROR');
  monitor.update('CLOSED');
  assert.equal(timer.size, 1);
  timer.run(5000);
  assert.equal(states.at(-1), 'ERROR');
  monitor.update('CHANNEL_ERROR');
  assert.equal(states.at(-1), 'ERROR');
  monitor.update('SUBSCRIBED');
  assert.equal(states.at(-1), 'OPEN');
  monitor.update('CLOSED');
  monitor.cancel();
  assert.equal(timer.size, 0, 'unmount cancels the warning');
});

test('connection diagnostics retain a bounded history with browser context', () => {
  const browser = {};
  const warnings = [];
  const { recordRealtimeDiagnostic } = load('utils/supabase/realtime-diagnostics.ts', {
    window: browser, document: { visibilityState: 'hidden' }, navigator: { onLine: false },
    console: { warn: (...args) => warnings.push(args) },
  });
  for (let i = 0; i < 105; i++) recordRealtimeDiagnostic('heartbeat', 'ok');
  recordRealtimeDiagnostic('orders_shared', 'CHANNEL_ERROR', { message: 'connection lost' });
  const entries = browser.stickerbeatRealtimeDiagnostics;
  assert.equal(entries.length, 100);
  assert.equal(entries.at(-1).visibility, 'hidden');
  assert.equal(entries.at(-1).online, false);
  assert.equal(entries.at(-1).message, 'connection lost');
  assert.ok(Number.isFinite(Date.parse(entries.at(-1).at)));
  assert.equal(warnings.length, 1, 'healthy heartbeats do not flood the console');
});

function database(rows) {
  const queries = [];
  return {
    queries,
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      const builder = {
        then(resolve, reject) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
      };
      for (const method of ['select', 'in', 'order', 'range', 'eq', 'not', 'limit']) {
        builder[method] = (...args) => { query.filters.push([method, ...args]); return builder; };
      }
      return builder;
    },
  };
}

test('one orders channel serves page and navigation; cleanup and reconnect status are shared', () => {
  const timer = clock();
  const channels = [];
  const removed = [];
  const client = {
    channel(name) {
      const channel = {
        name,
        on(type, filter, cb) { this.change = cb; this.filter = filter; return this; },
        subscribe(cb) { this.status = cb; return this; },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel) { removed.push(channel); },
  };
  const { subscribeToOrders } = load('utils/supabase/orders-realtime.ts', {
    ...timer,
    require: () => ({ getBrowserClient: () => client, REALTIME_SUBSCRIBE_STATES: { CLOSED: 'CLOSED' }, recordRealtimeDiagnostic() {} }),
  });
  const page = [], nav = [], states = [];
  const stopPage = subscribeToOrders((event) => page.push(event), (status) => states.push(status));
  channels[0].status('SUBSCRIBED');
  const stopNav = subscribeToOrders((event) => nav.push(event), (status) => states.push(status));
  assert.equal(channels.length, 1);
  assert.equal(channels[0].filter.event, '*');
  const moved = { eventType: 'UPDATE', old: { production_status: 'print' }, new: { production_status: 'cut' } };
  channels[0].change(moved);
  assert.equal(page[0], moved);
  assert.equal(nav[0], moved);
  stopPage();
  assert.equal(removed.length, 0);
  channels[0].status('CHANNEL_ERROR');
  channels[0].status('SUBSCRIBED');
  assert.deepEqual(states, ['SUBSCRIBED', 'SUBSCRIBED', 'CHANNEL_ERROR', 'SUBSCRIBED']);
  channels[0].status('CLOSED');
  assert.equal(timer.size, 1);
  timer.run();
  assert.equal(channels.length, 2);
  channels[1].status('SUBSCRIBED');
  channels[1].change(moved);
  assert.equal(nav.length, 2);
  stopNav();
  assert.equal(removed.length, 1);
  const stopNext = subscribeToOrders(() => {}, () => {});
  channels[0].change(moved);
  assert.equal(nav.length, 2);
  stopNext();
});

function ordersConnection() {
  const timer = clock();
  const channels = [], removed = [];
  let finishRemoval;
  const client = {
    realtime: { isConnected: () => true },
    channel() {
      const channel = {
        on(_type, _filter, callback) { this.change = callback; return this; },
        subscribe(callback) { this.status = callback; return this; },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel) {
      removed.push(channel);
      return new Promise((resolve) => { finishRemoval = resolve; });
    },
  };
  const api = load('utils/supabase/orders-realtime.ts', {
    ...timer, require: () => ({ getBrowserClient: () => client, REALTIME_SUBSCRIBE_STATES: { CLOSED: 'CLOSED' }, recordRealtimeDiagnostic() {} }),
  });
  return { ...api, timer, channels, removed, client, finishRemoval: () => finishRemoval('ok') };
}

test('recovery replaces a failed shared channel while navigation remains subscribed', async () => {
  const c = ordersConnection();
  const page = [], nav = [], statuses = [];
  const stopNav = c.subscribeToOrders((row) => nav.push(row), () => {});
  const stopPage = c.subscribeToOrders((row) => page.push(row), (status) => statuses.push(status));
  c.channels[0].status('SUBSCRIBED');
  await c.reconnectOrders();
  assert.equal(c.removed.length, 0, 'healthy channels stay connected');
  c.channels[0].status('CHANNEL_ERROR');
  const recovery = c.reconnectOrders();
  const duplicate = c.reconnectOrders();
  const stopNewListener = c.subscribeToOrders(() => {}, () => {});
  assert.equal(c.removed.length, 1);
  assert.equal(c.channels.length, 1, 'wait for the old channel to leave');
  c.finishRemoval();
  await Promise.all([recovery, duplicate]);
  assert.equal(c.channels.length, 2);
  c.channels[0].status('SUBSCRIBED');
  c.channels[0].change('stale');
  c.channels[1].status('SUBSCRIBED');
  c.channels[1].change('fresh');
  assert.deepEqual(page, ['fresh']);
  assert.deepEqual(nav, ['fresh']);
  assert.deepEqual(statuses, ['SUBSCRIBED', 'CHANNEL_ERROR', 'CLOSED', 'SUBSCRIBED']);
  stopNewListener(); stopPage(); stopNav();
});

test('recovery detects transport loss and does not reconnect after all listeners leave', async () => {
  const c = ordersConnection();
  const stop = c.subscribeToOrders(() => {}, () => {});
  c.channels[0].status('SUBSCRIBED');
  c.client.realtime.isConnected = () => false;
  const recovery = c.reconnectOrders();
  assert.equal(c.removed.length, 1);
  stop();
  c.finishRemoval();
  await recovery;
  assert.equal(c.channels.length, 1);
  assert.equal(c.timer.size, 0);
});

test('shared subscriptions forward and replay the original connection error', () => {
  const c = ordersConnection();
  const received = [];
  const stop = c.subscribeToOrders(() => {}, (status, error) => received.push({ status, error }));
  const error = new Error('heartbeat failed', { cause: { reason: 'timeout' } });
  c.channels[0].status('CHANNEL_ERROR', error);
  const stopNext = c.subscribeToOrders(() => {}, (status, error) => received.push({ status, error }));
  assert.equal(received.length, 2);
  for (const entry of received) {
    assert.equal(entry.status, 'CHANNEL_ERROR');
    assert.equal(entry.error, error);
  }
  stopNext(); stop();
});

test('production page handles cached CLOSED status and reconciles after reconnect', async () => {
  const timer = clock();
  let status, socket = 'UNKNOWN', fetches = 0;
  const stop = effect('components/order-organizer.tsx', 'createRealtimeStatusMonitor(setSocketState)', {
    createCoalescedRefresh: refreshFactory(timer), createRealtimeStatusMonitor: statusFactory(timer),
    console: { log() {}, error() {} },
    setLoading() {}, fetchAllOrders: async () => { fetches++; return []; },
    hasLoadedOnce: { current: false }, setOrders() {}, fetchOrderZero: async () => null,
    setLastUpdatedOrderTime() {}, document: { getElementById: () => null },
    subscribeToOrders(_change, callback) { status = callback; callback('CLOSED'); return () => {}; },
    setSocketState(value) { socket = value; },
  });
  assert.equal(socket, 'RECONNECTING');
  status('SUBSCRIBED');
  assert.equal(socket, 'OPEN');
  await timer.run();
  status('CHANNEL_ERROR');
  assert.equal(socket, 'RECONNECTING');
  timer.run(5000);
  assert.equal(socket, 'ERROR');
  status('SUBSCRIBED');
  await timer.run();
  assert.equal(socket, 'OPEN');
  assert.equal(fetches, 2, 'reconnection refreshes missed order changes');
  stop();
});

test('production indicator shows ACTIVE only after a confirmed subscription', () => {
  const file = 'components/order-organizer.tsx';
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  function visit(node) {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some((decl) =>
      ['isRealtimeDisconnected', 'realtimeIndicatorColor', 'realtimeStatusText'].includes(decl.name.getText(source)))) {
      declarations.push(node.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [socketState, expected] of [['UNKNOWN', 'CONNECTING'], ['OPEN', 'ACTIVE'], ['RECONNECTING', 'RECONNECTING'], ['ERROR', 'DISCONNECTED']]) {
    const result = evaluate(`export function indicator() { ${declarations.join('\n')} return realtimeStatusText; }`, {
      socketState, displayWarning: '', REALTIME_DISCONNECTED_WARNING: 'disconnected',
    }).indicator();
    assert.equal(result, expected);
  }
});

test('production reconciliation does not restore a deleted row from an older in-flight snapshot', async () => {
  const timer = clock();
  let onChange, resolve, fetches = 0, rows = [{ name_id: 'A' }];
  const stop = effect('components/order-organizer.tsx', 'createRealtimeStatusMonitor(setSocketState)', {
    createCoalescedRefresh: refreshFactory(timer), createRealtimeStatusMonitor: statusFactory(timer),
    setLoading() {}, fetchAllOrders: async () => {
      fetches++;
      if (fetches === 1) return new Promise((done) => { resolve = done; });
      return [];
    },
    hasLoadedOnce: { current: true },
    setOrders(next) { rows = typeof next === 'function' ? next(rows) : next; },
    fetchOrderZero: async () => null, setLastUpdatedOrderTime() {},
    document: { getElementById: () => null }, console: { log() {}, error() {} },
    subscribeToOrders(change) { onChange = change; return () => {}; }, setSocketState() {},
    multiSelectedRows: new Map(), ignoreUpdateIds: { current: new Set() }, pendingRemovalIds: { current: new Set() },
    currentRowClicked: null, isRowHovered: false,
  });
  const running = timer.run();
  onChange({ eventType: 'DELETE', old: { name_id: 'A' }, new: {} });
  assert.equal(rows.length, 0);
  resolve([{ name_id: 'A' }]);
  await running;
  assert.equal(rows.length, 0, 'stale snapshot must not undo the event');
  await timer.run();
  assert.equal(fetches, 2, 'an invalidated snapshot schedules reconciliation');
  stop();
});

test('first return to a visible production page attempts recovery', () => {
  let visibility, recoveries = 0;
  const stop = effect('components/order-organizer.tsx', 'const onVisibility =', {
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'visible', addEventListener(_event, callback) { visibility = callback; }, removeEventListener() {} },
    hasLoadedOnce: { current: true },
    lastVisibilityRefreshAtRef: { current: 0 }, VISIBILITY_REFRESH_MIN_MS: 60000,
    forceResubscribe() { recoveries++; },
  });
  visibility();
  assert.equal(recoveries, 1);
  stop();
});

test('browser client enables worker heartbeats', () => {
  let options;
  const events = [];
  const { getBrowserClient } = load('utils/supabase/client.ts', {
    process: { env: {} },
    require: () => ({ createBrowserClient(_url, _key, config) { options = config; return { auth: { onAuthStateChange() {} } }; }, recordRealtimeDiagnostic: (...args) => events.push(args) }),
  });
  getBrowserClient();
  assert.equal(options?.realtime?.worker, true);
  assert.equal(typeof options?.realtime?.logger, 'function');
  options.realtime.logger('transport', 'heartbeat timeout. Attempting to re-establish connection');
  options.realtime.logger('transport', 'close', { code: 1006, reason: 'lost', wasClean: false, access_token: 'secret' });
  options.realtime.logger('receive', 'postgres_changes', { notes: 'private' });
  assert.equal(events.length, 2);
  assert.equal(events[0][0], 'heartbeat');
  assert.equal(events[0][1], 'timeout');
  assert.equal(events[1][2].code, 1006);
  options.realtime.logger('push', 'phoenix heartbeat (1)', {});
  options.realtime.logger('receive', 'ok phoenix phx_reply (1)', { status: 'ok' });
  options.realtime.logger('transport', 'connected to wss://example.com?apikey=secret');
  options.realtime.logger('transport', undefined);
  assert.deepEqual(events.slice(2).map((entry) => entry[1]), ['sent', 'ok', 'OPEN', 'error']);
  assert.ok(!JSON.stringify(events).includes('secret'));
  assert.ok(!JSON.stringify(events).includes('private'));
});

test('burst refreshes coalesce; overlapping requests never commit stale snapshots', async () => {
  const timer = clock();
  const create = refreshFactory(timer);
  let resolve;
  let calls = 0;
  const commits = [];
  const refresh = create(async () => {
    calls++;
    if (calls === 1) await new Promise((done) => { resolve = done; });
    const value = calls;
    return () => commits.push(value);
  }, 250);
  for (let i = 0; i < 100; i++) refresh.request();
  assert.equal(timer.size, 1);
  const running = timer.run();
  for (let i = 0; i < 100; i++) refresh.request();
  assert.equal(calls, 1);
  assert.equal(timer.size, 0);
  resolve();
  await running;
  assert.deepEqual(commits, []);
  await timer.run();
  assert.equal(calls, 2);
  assert.deepEqual(commits, [2]);
});

test('direct row patches invalidate an in-flight snapshot; cancellation prevents late commits', async () => {
  const timer = clock();
  let resolve;
  let commits = 0;
  const refresh = refreshFactory(timer)(async () => {
    await new Promise((done) => { resolve = done; });
    return () => commits++;
  }, 250);
  refresh.invalidate();
  assert.equal(timer.size, 0);
  refresh.request();
  const running = timer.run();
  refresh.invalidate();
  resolve();
  await running;
  assert.equal(commits, 0);
  assert.equal(timer.size, 1);
  const next = timer.run();
  refresh.cancel();
  resolve();
  await next;
  assert.equal(commits, 0);
  assert.equal(timer.size, 0);
});

test('navigation skips notes-only updates and combines queue transitions into one count query', async () => {
  const timer = clock();
  let rows = [{ name_id: 'A', production_status: 'print' }];
  const db = database(() => rows);
  let onChange, onStatus, counts;
  const stop = effect('components/navbar-element.tsx', 'statusByNameId', {
    supabase: db, session: { user: { id: 'user' } }, DELAY_BETWEEN_UPDATES: 2000,
    createCoalescedRefresh: refreshFactory(timer), setCounts: (next) => { counts = next; },
    subscribeToOrders(change, status) { onChange = change; onStatus = status; return () => {}; },
  });
  onStatus('SUBSCRIBED');
  await timer.run();
  assert.equal(counts.print, 1);
  onChange({ eventType: 'UPDATE', old: { name_id: 'A' }, new: { name_id: 'A', production_status: 'print', notes: 'new' } });
  assert.equal(timer.size, 0);
  rows = [{ name_id: 'A', production_status: 'cut' }, { name_id: 'B', production_status: 'pack' }];
  onChange({ eventType: 'UPDATE', old: { name_id: 'A' }, new: rows[0] });
  onChange({ eventType: 'INSERT', old: {}, new: rows[1] });
  assert.equal(db.queries.length, 1);
  assert.equal(timer.size, 1);
  await timer.run();
  assert.equal(counts.print, 0);
  assert.equal(counts.cut, 1);
  assert.equal(counts.pack, 1);
  rows = [rows[1]];
  onChange({ eventType: 'DELETE', old: { name_id: 'A' }, new: {} });
  await timer.run();
  assert.equal(counts.cut, 0);
  stop();
});

function tracking(view = 'active', searching = false) {
  const timer = clock();
  const initial = { order_id: 1, active: true, current_status: 'print', ship_date: '2026-09-14', shipped_stamp: '2026-09-14' };
  let rows = [initial], state = [], change, status, connectionStatus;
  const channels = [], removed = [];
  const db = database(() => rows);
  db.channel = () => {
    const channel = {
      on(_type, _filter, callback) { this.change = change = callback; return this; },
      subscribe(callback) { this.status = status = callback; return this; },
    };
    channels.push(channel);
    return channel;
  };
  db.removeChannel = (channel) => removed.push(channel);
  const stop = effect('components/timeline-display.tsx', 'tracking_timeline_realtime', {
    ...timer, supabase: db, timelineView: view, isSearching: searching,
    createRealtimeStatusMonitor: statusFactory(timer), recordRealtimeDiagnostic() {},
    createCoalescedRefresh: refreshFactory(timer), TIMELINE_FETCH_STATUSES: ['print', 'cut'],
    toTimelineTime: (value) => value ? Date.parse(value) : null, shippingMethodOrder: () => 0,
    shouldParseTrackingOrder: (row) => Boolean(row.ship_date), setTrackingRealtimeStatus: (next) => { connectionStatus = next; },
    setCombinedOrders(next) { state = typeof next === 'function' ? next(state) : next; },
  });
  return { timer, db, initial, change, status, stop, channels, removed, get connectionStatus() { return connectionStatus; }, get state() { return state; }, setRows(next) { rows = next; } };
}

test('tracking patches notes, inserts, active exits, status exits and deletes without full refetches', async () => {
  const t = tracking();
  t.status('SUBSCRIBED');
  await t.timer.run();
  const changed = { ...t.initial, notes: 'new' };
  t.change({ eventType: 'UPDATE', new: changed, old: { order_id: 1 } });
  assert.equal(t.state[0].notes, 'new');
  t.change({ eventType: 'INSERT', new: { ...changed, order_id: 2 }, old: {} });
  assert.equal(t.state.length, 2);
  t.change({ eventType: 'UPDATE', new: { ...changed, active: false }, old: {} });
  assert.equal(t.state.length, 1);
  t.change({ eventType: 'UPDATE', new: { ...changed, order_id: 2, current_status: 'closed' }, old: {} });
  assert.equal(t.state.length, 0);
  t.change({ eventType: 'UPDATE', new: changed, old: {} });
  t.change({ eventType: 'DELETE', old: { order_id: 1 }, new: {} });
  assert.equal(t.state.length, 0);
  assert.equal(t.timer.size, 0);
  assert.equal(t.db.queries.length, 1);
  t.status('SUBSCRIBED');
  assert.equal(t.timer.size, 1);
  t.stop();
});

test('Timeline recreates CLOSED tracking channels and ignores their late callbacks', async () => {
  const t = tracking();
  t.status('SUBSCRIBED');
  await t.timer.run();
  t.status('CLOSED');
  assert.equal(t.connectionStatus, 'RECONNECTING');
  t.timer.run(1000);
  assert.equal(t.channels.length, 2);
  t.channels[0].status('SUBSCRIBED');
  t.channels[0].change({ eventType: 'DELETE', old: { order_id: 1 }, new: {} });
  assert.equal(t.connectionStatus, 'RECONNECTING');
  assert.equal(t.state.length, 1);
  t.channels[1].status('SUBSCRIBED');
  assert.equal(t.connectionStatus, 'OPEN');
  await t.timer.run();
  assert.equal(t.db.queries.length, 2, 'reconnect reconciles events missed while offline');
  t.stop();
  assert.equal(t.removed[0], t.channels[1]);
  assert.equal(t.timer.size, 0);
});

test('leaving Timeline cancels a pending CLOSED-channel reconnect', async () => {
  const t = tracking();
  await t.timer.run();
  t.status('CLOSED');
  t.stop();
  assert.equal(t.timer.size, 0);
  assert.equal(t.channels.length, 1);
});

test('Recently Shipped coalesces changes and refills the latest-100 query', async () => {
  const t = tracking('shipped');
  await t.timer.run();
  for (let i = 0; i < 100; i++) t.change({ eventType: 'DELETE', old: { order_id: i }, new: {} });
  assert.equal(t.timer.size, 1);
  t.setRows([{ ...t.initial, order_id: 101 }]);
  await t.timer.run();
  assert.equal(t.state[0].order_id, 101);
  assert.equal(t.db.queries.length, 2);
  assert.ok(t.db.queries[1].filters.some(([method, value]) => method === 'limit' && value === 100));
  t.stop();
});

test('search retains inactive tracking rows; incomplete delete payloads schedule reconciliation', async () => {
  const t = tracking('active', true);
  await t.timer.run();
  t.change({ eventType: 'UPDATE', old: {}, new: { ...t.initial, active: false, current_status: 'closed' } });
  assert.equal(t.state.length, 1);
  assert.equal(t.state[0].active, false);
  t.change({ eventType: 'DELETE', old: {}, new: {} });
  assert.equal(t.timer.size, 1);
  t.stop();
});
