/* Pure-logic tests for youyou-work-hours. Loads client.js exactly the way the
   Harness client does (window.__ModuleLoader__.load), with a stub React that is
   never rendered, then checks the statistics/config layer the UI relies on. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'client.js'), 'utf8');

const store = new Map();
const listeners = new Map();
const fakeReact = { createElement: () => null, useState: value => [value, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useLayoutEffect: () => {} };
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  Number,
  String,
  Object,
  Array,
  Boolean,
  Intl,
  Blob: class {},
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
  FileReader: class {},
  MutationObserver: class { observe() {} disconnect() {} },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  Event: class { constructor(type) { this.type = type; } },
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  localStorage: {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
  },
  window: {
    addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener: (type, fn) => { listeners.get(type)?.delete(fn); },
    dispatchEvent: event => { for (const fn of listeners.get(event.type) || []) fn(event); return true; },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  },
  document: {
    querySelector: () => null,
    head: { appendChild: () => {} },
    createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, remove() {}, click() {} }),
    body: { appendChild: () => {} },
  },
};
sandbox.globalThis = sandbox;
sandbox.window.__ModuleLoader__ = { load: ({ factory }) => { sandbox.__api = factory(name => (name === 'react' ? fakeReact : {})); } };
sandbox.__WORK_HOURS_TEST__ = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'client.js' });

const { helpers } = sandbox.__WORK_HOURS_TEST__;
assert.ok(helpers, 'test hook must expose helpers');
const { load, save, monthStats, yearStats, weekStats, dayStats, normSettings, planOutFor, importData, DEFAULT_SETTINGS } = helpers;

const DAY = '2026-10-01';
const at = (day, hhmm) => new Date(`${day}T${hhmm}:00`).toISOString();
const iso = (day, hhmm) => at(day, hhmm);

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; };

check('reminder defaults are on and use the {time} slot', () => {
  const settings = normSettings({});
  assert.equal(settings.remindEnabled, true);
  assert.ok(settings.remindMessage.includes('{time}'), 'default reminder text keeps the elapsed slot');
  assert.equal(normSettings({ remindEnabled: false }).remindEnabled, false);
  assert.equal(normSettings({ remindEnabled: 'false' }).remindEnabled, false);
  assert.equal(normSettings({ remindEnabled: true }).remindEnabled, true);
  assert.equal(normSettings({ remindMessage: '  该下班了  ' }).remindMessage, '该下班了');
  assert.equal(normSettings({ remindMessage: '' }).remindMessage, settings.remindMessage);
  assert.equal(normSettings({ remindMessage: 'x'.repeat(200) }).remindMessage.length, 120);
});

check('defaults are complete and valid', () => {
  const settings = normSettings({});
  assert.equal(JSON.stringify(Object.keys(settings).sort()), JSON.stringify(Object.keys(DEFAULT_SETTINGS).sort()));
  assert.equal(settings.planIn, '09:00');
  assert.equal(settings.planOut, '18:00');
  assert.equal(settings.overtimeAfter, '19:30');
  assert.equal(settings.remindAfter, '20:00');
  assert.equal(settings.flashInterval, 5);
});

check('bad values fall back, interval is clamped', () => {
  assert.equal(normSettings({ planIn: '25:00' }).planIn, '09:00');
  assert.equal(normSettings({ lateAfter: '9:00' }).lateAfter, '10:00');
  assert.equal(normSettings({ flashInterval: 999 }).flashInterval, 60);
  assert.equal(normSettings({ flashInterval: 0 }).flashInterval, 1);
  assert.equal(normSettings({ flashMessage: '   ' }).flashMessage, DEFAULT_SETTINGS.flashMessage);
});

check('legacy top-level settings survive load()', () => {
  store.clear();
  store.set('work-hours:data:v1', JSON.stringify({ days: { [DAY]: { in: iso(DAY, '09:05') } }, lateAfter: '10:30', flashInterval: 12 }));
  const data = load();
  assert.equal(data.lateAfter, '10:30');
  assert.equal(data.flashInterval, 12);
  assert.equal(data.planIn, '09:00');
  assert.equal(data.overtimeAfter, '19:30');
  assert.ok(data.days[DAY]);
});

check('save persists settings and days', () => {
  store.clear();
  save({ days: { [DAY]: { in: iso(DAY, '09:00'), out: iso(DAY, '18:00') } }, planIn: '08:30', planOut: '17:30', flashMessage: '该下班了' });
  const raw = JSON.parse(store.get('work-hours:data:v1'));
  assert.equal(raw.planIn, '08:30');
  assert.equal(raw.planOut, '17:30');
  assert.equal(raw.flashMessage, '该下班了');
  assert.equal(raw.days[DAY].out, iso(DAY, '18:00'));
});

/* Seed: 3 days 09:00-18:00 + 2 late days 10:30-19:30 = 5 days, 45h, 2 late. */
const seedDays = {
  '2026-10-08': { in: iso('2026-10-08', '09:00'), out: iso('2026-10-08', '18:00') },
  '2026-10-09': { in: iso('2026-10-09', '09:00'), out: iso('2026-10-09', '18:00') },
  '2026-10-12': { in: iso('2026-10-12', '09:00'), out: iso('2026-10-12', '18:00') },
  '2026-10-13': { in: iso('2026-10-13', '10:30'), out: iso('2026-10-13', '19:30') },
  '2026-10-14': { in: iso('2026-10-14', '10:30'), out: iso('2026-10-14', '19:30') },
};
const seed = { days: seedDays, ...normSettings({}) };
const NOV = new Date('2026-11-20T12:00:00').getTime();

check('weekend lateness never enters the late count or its rate', () => {
  const now = new Date('2026-10-10T12:00:00').getTime();
  const data = { ...seed, days: {
    ...seedDays,
    '2026-10-17': { in: iso('2026-10-17', '11:00'), out: iso('2026-10-17', '20:00') },
  } };
  const stats = monthStats(data, 2026, 9, now);
  const saturday = stats.rows.find(row => row.key === '2026-10-17');
  assert.equal(saturday.late, false, 'Saturday is not a workday');
  assert.equal(stats.late, 2, 'only the two workday lates count');
  assert.equal(stats.lateRate, 2 / 5);
  assert.equal(stats.workdayComplete, 5);
  assert.equal(stats.complete, 6, 'hours still count as a completed day');
});

check('week stats use workdays for the rate too', () => {
  const now = new Date('2026-10-15T11:00:00').getTime();
  const stats = weekStats({ days: {
    '2026-10-12': { in: iso('2026-10-12', '09:00'), out: iso('2026-10-12', '18:00') },
    '2026-10-13': { in: iso('2026-10-13', '10:30'), out: iso('2026-10-13', '19:30') },
    '2026-10-17': { in: iso('2026-10-17', '11:00'), out: iso('2026-10-17', '20:00') },
  } }, now);
  assert.equal(stats.late, 1);
  assert.equal(stats.workdayComplete, 2);
  assert.equal(stats.lateRate, 0.5);
});


check('statutory holidays are days off and makeup days are workdays', () => {
  const now = new Date('2026-10-20T12:00:00').getTime();
  const data = { days: {
    '2026-10-01': { in: iso('2026-10-01', '10:30'), out: iso('2026-10-01', '19:30') },
    '2026-10-10': { in: iso('2026-10-10', '10:30'), out: iso('2026-10-10', '19:30') },
    '2026-10-13': { in: iso('2026-10-13', '10:30'), out: iso('2026-10-13', '19:30') },
  } };
  const stats = monthStats(data, 2026, 9, now);
  assert.equal(stats.rows[0].late, false, '国庆 10/01 is not a workday');
  assert.equal(stats.rows[9].late, true, '10/10 is a 调休 workday (Saturday)');
  assert.equal(stats.late, 2, '10/10 和 10/13 计迟到');
  assert.equal(stats.workdayComplete, 2, 'holiday day excluded from the workday denominator');
});

check('month total / average / lateness', () => {
  const stats = monthStats(seed, 2026, 9, NOV);
  assert.equal(stats.attendance, 5, 'attendance');
  assert.equal(stats.complete, 5, 'complete');
  assert.equal(stats.late, 2, 'late days');
  assert.equal(stats.totalMs, 45 * 3600 * 1000, 'total 45h');
  assert.equal(stats.avgMs, 9 * 3600 * 1000, 'average 9h per day');
  assert.equal(stats.rows.length, 31, 'october has 31 rows');
});

check('late line is configurable', () => {
  const stats = monthStats({ ...seed, lateAfter: '11:00' }, 2026, 9, NOV);
  assert.equal(stats.late, 0);
});

check('month with no data is empty, not NaN', () => {
  const stats = monthStats(seed, 2026, 10, NOV);
  assert.equal(stats.attendance, 0);
  assert.equal(stats.totalMs, 0);
  assert.equal(stats.avgMs, 0);
});

check('running day adds to the total but not to the average', () => {
  const now = new Date('2026-10-15T11:00:00').getTime();
  const data = { ...seed, days: { ...seedDays, '2026-10-15': { in: iso('2026-10-15', '09:00'), out: null } } };
  const stats = monthStats(data, 2026, 9, now);
  assert.equal(stats.attendance, 6);
  assert.equal(stats.complete, 5);
  assert.equal(stats.running, 1);
  assert.equal(stats.totalMs, 47 * 3600 * 1000, '45h + 2h running');
  assert.equal(stats.completedMs, 45 * 3600 * 1000, 'finished days only');
  assert.equal(stats.avgMs, 9 * 3600 * 1000, 'average stays at 9h until today closes');
});

check('past day without clock-out stays at zero', () => {
  const stats = dayStats('2026-10-09', { in: iso('2026-10-09', '09:00'), out: null }, seed, NOV);
  assert.equal(stats.workMs, 0);
  assert.equal(stats.running, false);
});

check('out before in is not complete', () => {
  const stats = dayStats('2026-10-09', { in: iso('2026-10-09', '18:00'), out: iso('2026-10-09', '09:00') }, seed, NOV);
  assert.equal(stats.complete, false);
  assert.equal(stats.workMs, 0);
});

check('year stats aggregate every month', () => {
  const stats = yearStats(seed, 2026, NOV);
  assert.equal(stats.months.length, 12);
  assert.equal(stats.totalMs, 45 * 3600 * 1000);
  assert.equal(stats.completedMs, 45 * 3600 * 1000);
  assert.equal(stats.complete, 5);
  assert.equal(stats.attendance, 5);
  assert.equal(stats.late, 2);
  assert.equal(stats.avgMs, 9 * 3600 * 1000);
  assert.equal(stats.months[9].totalMs, 45 * 3600 * 1000);
});

check('per-day plan override beats the global planned off-work time', () => {
  assert.equal(planOutFor({ plan: '20:00' }, seed), '20:00');
  assert.equal(planOutFor({}, seed), '18:00');
  assert.equal(planOutFor({ plan: 'bad' }, seed), '18:00');
});

check('import sanitises and keeps valid days', () => {
  store.clear();
  const count = importData(JSON.stringify({ days: { '2026-10-01': { in: iso('2026-10-01', '09:00'), out: iso('2026-10-01', '18:00'), plan: '19:00' }, 'nonsense': { in: 'x' } }, planOut: '17:00' }));
  assert.equal(count, 1);
  const raw = JSON.parse(store.get('work-hours:data:v1'));
  assert.equal(raw.planOut, '17:00');
  assert.equal(JSON.stringify(Object.keys(raw.days)), JSON.stringify(['2026-10-01']));
  assert.equal(raw.days['2026-10-01'].plan, '19:00');
});

check('import rejects a file without days', () => {
  assert.throws(() => importData(JSON.stringify({ nope: true })));
});

check('storage cache is invalidated by save()', () => {
  store.clear();
  save({ days: { [DAY]: { in: iso(DAY, '09:00') } } });
  const first = load();
  assert.ok(first.days[DAY]);
  save({ days: {} });
  assert.equal(JSON.stringify(load().days), '{}', 'second read must not reuse the cached day');
});

console.log(`ok — ${passed} logic checks passed`);
