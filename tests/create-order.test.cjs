const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadFunction(file, name, globals) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `Missing function: ${name}`);
  const output = ts.transpileModule(`${fn.getText(source)}\nexports.subject = ${name};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const context = { exports: {}, console: { log() {}, error() {} }, ...globals };
  vm.runInNewContext(output, context);
  return context.exports.subject;
}

function formHarness() {
  const state = [];
  const effects = [];
  const timers = new Map();
  let timerId = 0;
  let effectCursor = 0;
  let cursor = 0;
  const React = {
    useEffect(setup, dependencies) {
      const index = effectCursor++;
      const previous = effects[index];
      if (previous && dependencies.every((value, i) => value === previous.dependencies[i])) return;
      previous?.cleanup?.();
      effects[index] = { dependencies, cleanup: setup() };
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    createElement(type, props, ...children) { return { type, props: props ?? {}, children: children.flat(Infinity) }; },
  };
  const components = Object.fromEntries(['Input', 'Button', 'Label', 'Table', 'TableBody', 'TableRow', 'TableCell',
    'TableHeader', 'TableHead', 'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map((name) => [name, name]));
  const form = loadFunction('components/order-inputter.tsx', 'ProfileForm', {
    React, cn: (...values) => values.join(' '), ...components,
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  let submitted;
  const render = () => { cursor = 0; effectCursor = 0; return form({ onSubmit: (data) => { submitted = data; } }); };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.children ?? []) {
      const result = find(child, predicate);
      if (result) return result;
    }
  }
  return { render, find, timers, get submitted() { return submitted; } };
}

test('ticket link waits two seconds after blur and cancels stale updates on focus', () => {
  const h = formHarness();
  const ticket = () => h.find(h.render(), (n) => n.props.id === 'orderId');
  const link = () => h.find(h.render(), (n) => n.type === 'a');
  ticket().props.onFocus();
  ticket().props.onChange({ target: { value: '12345' } });
  assert.equal(link(), undefined);
  assert.equal(h.timers.size, 0);
  ticket().props.onBlur();
  assert.equal(link(), undefined);
  assert.equal(h.timers.size, 1);
  const runTimer = () => {
    const [id, timer] = h.timers.entries().next().value;
    assert.equal(timer.delay, 2000);
    h.timers.delete(id);
    timer.callback();
  };
  runTimer();
  assert.equal(link().props.href, 'https://stickerbeat.zendesk.com/agent/tickets/12345');
  ticket().props.onFocus();
  ticket().props.onChange({ target: { value: '67890' } });
  ticket().props.onBlur();
  h.render();
  ticket().props.onFocus();
  h.render();
  assert.equal(h.timers.size, 0);
  assert.equal(link().props.href, 'https://stickerbeat.zendesk.com/agent/tickets/12345');
  ticket().props.onChange({ target: { value: '' } });
  ticket().props.onBlur();
  h.render();
  runTimer();
  assert.equal(link(), undefined);
});

test('affix toggle prefixes existing and copied rows, follows ticket changes, and submits without duplicate prefixes', () => {
  const h = formHarness();
  const ticket = () => h.find(h.render(), (n) => n.props.id === 'orderId');
  const name = (i) => h.find(h.render(), (n) => n.props['aria-label'] === `Name ID for entry ${i}`);
  const toggle = () => h.find(h.render(), (n) => n.props.id === 'affix-order-id');
  ticket().props.onChange({ target: { value: '12345' } });
  assert.equal(toggle().props.checked, true);
  assert.equal(name(1).props.value, '12345-');
  name(1).props.onChange({ target: { value: '12345-artwork' } });
  h.find(h.render(), (n) => n.type === 'Button' && n.children.includes('Add another entry')).props.onClick();
  assert.equal(name(2).props.value, '12345-artwork');
  ticket().props.onChange({ target: { value: '67890' } });
  assert.equal(name(1).props.value, '67890-artwork');
  assert.equal(name(2).props.value, '67890-artwork');
  h.render().props.onSubmit({ preventDefault() {} });
  assert.equal(h.submitted.entries[0].name_id, '67890-artwork');
  toggle().props.onChange({ target: { checked: false } });
  assert.equal(name(1).props.value, 'artwork');
  h.render().props.onSubmit({ preventDefault() {} });
  assert.equal(h.submitted.entries[0].name_id, 'artwork');
  toggle().props.onChange({ target: { checked: true } });
  assert.equal(name(1).props.value, '67890-artwork');
  name(1).props.onChange({ target: { value: '67890-' } });
  h.render().props.onSubmit({ preventDefault() {} });
  assert.equal(h.submitted.entries[0].name_id, '', 'a prefix alone must not pass existing blank-name validation');
});

test('new entries copy every field from the immediately preceding entry and remain independent', () => {
  const h = formHarness();
  const change = (label, value) => h.find(h.render(), (n) => n.props['aria-label'] === label).props.onChange({ target: { value } });
  change('Name ID for entry 1', 'TEST-1');
  change('Lamination for entry 1', 'Matte');
  change('Material for entry 1', 'White');
  change('Quantity for entry 1', '25');
  h.find(h.render(), (n) => n.type === 'Select').props.onValueChange('3');
  const add = () => h.find(h.render(), (n) => n.type === 'Button' && n.children.includes('Add another entry')).props.onClick();
  add();
  change('Name ID for entry 2', 'TEST-2');
  change('Quantity for entry 2', '50');
  add();
  h.render().props.onSubmit({ preventDefault() {} });
  const rows = JSON.parse(JSON.stringify(h.submitted.entries));
  assert.deepEqual(rows, [
    { name_id: 'TEST-1', lamination: 'Matte', material: 'White', quantity: 25, orderType: 3 },
    { name_id: 'TEST-2', lamination: 'Matte', material: 'White', quantity: 50, orderType: 3 },
    { name_id: 'TEST-2', lamination: 'Matte', material: 'White', quantity: 50, orderType: 3 },
  ]);
});

test('custom-order insertion preserves each selected section and defaults older callers to Doublesided', async () => {
  let inserted;
  const create = loadFunction('utils/actions.ts', 'createCustomOrder', {
    getServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
      from: () => ({
        select: () => ({ in: async () => ({ data: [], error: null }) }),
        insert: async (orders) => { inserted = orders; return { error: null }; },
      }),
    }),
  });
  const entries = [2, 3, 4, undefined].map((orderType, i) => ({ name_id: `TEST-${i}`, lamination: 'Matte', material: 'White', quantity: 25, orderType }));
  assert.equal((await create(entries, 123, '2026-10-21', '2026-10-22')).result, true);
  assert.deepEqual(Array.from(inserted, (row) => row.orderType), [2, 3, 4, 2]);
  inserted = undefined;
  assert.equal((await create([{ ...entries[0], orderType: 99 }], 123, '2026-10-21', '')).result, false);
  assert.equal(inserted, undefined);
});
