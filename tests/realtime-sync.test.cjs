const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function clock() {
  const pending = new Map();
  let id = 0;
  return {
    setTimeout(fn) { pending.set(++id, fn); return id; },
    clearTimeout(key) { pending.delete(key); },
    get size() { return pending.size; },
    run() {
      const [key, fn] = pending.entries().next().value;
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
    require: () => ({ getBrowserClient: () => client }),
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
  let rows = [initial], state = [], change, status;
  const db = database(() => rows);
  db.channel = () => ({
    on(_type, _filter, callback) { change = callback; return this; },
    subscribe(callback) { status = callback; return this; },
  });
  db.removeChannel = () => {};
  const stop = effect('components/timeline-display.tsx', 'tracking_timeline_realtime', {
    supabase: db, timelineView: view, isSearching: searching,
    createCoalescedRefresh: refreshFactory(timer), TIMELINE_FETCH_STATUSES: ['print', 'cut'],
    toTimelineTime: (value) => value ? Date.parse(value) : null, shippingMethodOrder: () => 0,
    shouldParseTrackingOrder: (row) => Boolean(row.ship_date), setTrackingRealtimeStatus: () => {},
    setCombinedOrders(next) { state = typeof next === 'function' ? next(state) : next; },
  });
  return { timer, db, initial, change, status, stop, get state() { return state; }, setRows(next) { rows = next; } };
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
