/**
 * The Friday-to-Sunday window, and the cup you can only win.
 *
 * Both of these are the kind of rule that is right on the day it is written and
 * wrong on some other day nobody tried. So nothing here asks the real clock:
 * every check walks whole weeks, midnights and year boundaries by handing the
 * functions a date.
 *
 * The three that actually matter:
 *
 *   1. **Open exactly three days.** Not "roughly the weekend" — Monday to
 *      Thursday it is shut, and a mode called Weekend League that can be played
 *      on a Tuesday is a name that means nothing.
 *   2. **A run dies with its weekend.** The reachable hole is a run started at
 *      23:50 on Sunday: if it stayed countable past midnight it could be walked
 *      to a perfect ten on a Monday, which would hand out the one cup design in
 *      the app that is supposed to be unbuyable.
 *   3. **The perfect cup is unbuyable, by every route.** Not in the coin
 *      rotation, not in the money catalogue, no price on it at all.
 *
 * Run with: node tools/test_weekend.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'weekend-'));
const load = (name) => {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/from ['"]\.\/(\w+)['"]/g, "from './$1.mjs'");
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return file;
};
for (const name of [
  'i18n',
  'languages',
  'opponentAi',
  'cupSkins',
  'catalogue',
  'entitlement',
  'licence',
  'cupShop',
]) {
  try {
    load(name);
  } catch {
    // Only what competition.ts imports has to resolve.
  }
}
const c = await import(load('competition'));
const cups = await import(load('cupSkins'));
const shop = await import(load('cupShop'));

/** A local date at noon, so nothing here is an accidental midnight test. */
const at = (y, m, d, hour = 12, minute = 0) => new Date(y, m - 1, d, hour, minute);

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('the window');

check('open on Friday, Saturday and Sunday — and only those', () => {
  // A real week: Monday 2026-09-14 through Sunday 2026-09-20.
  const week = [
    ['Monday', at(2026, 9, 14), false],
    ['Tuesday', at(2026, 9, 15), false],
    ['Wednesday', at(2026, 9, 16), false],
    ['Thursday', at(2026, 9, 17), false],
    ['Friday', at(2026, 9, 18), true],
    ['Saturday', at(2026, 9, 19), true],
    ['Sunday', at(2026, 9, 20), true],
  ];
  for (const [name, date, open] of week) {
    assert.equal(date.getDay(), [1, 2, 3, 4, 5, 6, 0][week.findIndex((w) => w[0] === name)]);
    assert.equal(c.isWeekendOpen(date), open, `${name} came out ${c.isWeekendOpen(date)}`);
  }
});

check('it is open three days out of every seven, all year', () => {
  // Walks a whole year rather than one week, because the day-of-week arithmetic
  // is the sort that survives one example and fails at a month boundary.
  let open = 0;
  for (let day = 0; day < 364; day++) {
    if (c.isWeekendOpen(new Date(2026, 0, 1 + day, 12))) open += 1;
  }
  assert.equal(open, (364 / 7) * 3);
});

check('the countdown counts down', () => {
  assert.equal(c.daysUntilWeekend(at(2026, 9, 18)), 0, 'Friday is not zero');
  assert.equal(c.daysUntilWeekend(at(2026, 9, 19)), 0, 'Saturday is not zero');
  assert.equal(c.daysUntilWeekend(at(2026, 9, 20)), 0, 'Sunday is not zero');
  assert.equal(c.daysUntilWeekend(at(2026, 9, 21)), 4, 'Monday is not four days out');
  assert.equal(c.daysUntilWeekend(at(2026, 9, 22)), 3);
  assert.equal(c.daysUntilWeekend(at(2026, 9, 23)), 2);
  assert.equal(c.daysUntilWeekend(at(2026, 9, 24)), 1, 'Thursday is not one day out');
});

console.log('\nwhich weekend a run belongs to');

check('Friday, Saturday and Sunday of one weekend share a key', () => {
  const friday = c.weekendKeyOf(at(2026, 9, 18, 20));
  assert.equal(c.weekendKeyOf(at(2026, 9, 19, 2)), friday, 'Saturday small hours drifted');
  assert.equal(c.weekendKeyOf(at(2026, 9, 19, 23, 59)), friday);
  assert.equal(c.weekendKeyOf(at(2026, 9, 20, 12)), friday, 'Sunday drifted');
});

check('and the next weekend has a different one', () => {
  assert.notEqual(c.weekendKeyOf(at(2026, 9, 18)), c.weekendKeyOf(at(2026, 9, 25)));
});

check('it survives a month and a year boundary', () => {
  // Fri 2026-10-30, Sat 10-31, Sun 11-01 — the key has to hold across the
  // month, which is exactly what a date-based key would get wrong.
  const friday = c.weekendKeyOf(at(2026, 10, 30));
  assert.equal(c.weekendKeyOf(at(2026, 10, 31)), friday);
  assert.equal(c.weekendKeyOf(at(2026, 11, 1)), friday, 'the key broke over the month end');
  // Fri 2027-12-31, Sat 2028-01-01, Sun 01-02.
  const newYear = c.weekendKeyOf(at(2027, 12, 31));
  assert.equal(c.weekendKeyOf(at(2028, 1, 1)), newYear, 'the key broke over new year');
  assert.equal(c.weekendKeyOf(at(2028, 1, 2)), newYear);
});

console.log('\na run and its weekend');

const run = (weekendKey, active = true) => ({ active, weekendKey });

check('a run started on Friday is live all weekend', () => {
  const key = c.weekendKeyOf(at(2026, 9, 18));
  for (const when of [at(2026, 9, 18, 21), at(2026, 9, 19, 3), at(2026, 9, 20, 23)]) {
    const state = c.weekendAvailability(run(key), when);
    assert.ok(state.runLive, `not live at ${when.toISOString()}`);
    assert.ok(!state.runExpired);
  }
});

check('and is dead one minute after Sunday midnight', () => {
  // The hole worth closing: 23:50 on Sunday, still tapping at 00:05 on Monday.
  const key = c.weekendKeyOf(at(2026, 9, 20, 23, 50));
  const state = c.weekendAvailability(run(key), at(2026, 9, 21, 0, 5));
  assert.ok(!state.runLive, 'a Sunday run stayed countable into Monday');
  assert.ok(state.runExpired);
  assert.ok(!state.open);
});

check('a run from last weekend does not come back to life on the next one', () => {
  const lastWeek = c.weekendKeyOf(at(2026, 9, 18));
  const state = c.weekendAvailability(run(lastWeek), at(2026, 9, 25, 20));
  assert.ok(state.open, 'the league should be open on a Friday');
  assert.ok(!state.runLive, 'last weekend’s run resumed on this one');
  assert.ok(state.runExpired);
});

check('no run at all is neither live nor expired', () => {
  const state = c.weekendAvailability(run('', false), at(2026, 9, 18));
  assert.ok(!state.runLive);
  assert.ok(!state.runExpired, 'an absent run was reported as expired');
});

check('a save from before the window existed reads as no run', () => {
  // Those runs were started in a world where any day counted. Treating them as
  // live would let one be finished on a Tuesday; treating them as expired shows
  // somebody a scary message about a run they may not have had.
  const state = c.weekendAvailability(run('', true), at(2026, 9, 18));
  assert.ok(!state.runLive);
  assert.ok(state.runExpired, 'an old run should be retired, not resumed');
});

console.log('\nthe cup nobody can buy');

check('the perfect design exists and is the one the store hands over', () => {
  const design = cups.cupDesign(cups.PERFECT_WEEKEND_CUP);
  assert.equal(design.id, cups.PERFECT_WEEKEND_CUP, 'the id does not resolve to a real design');
  assert.ok(design.name.trim().length > 0);
  assert.ok(design.flag.trim().length > 0);
});

check('it has no price, in coins or otherwise', () => {
  for (const design of cups.EARNED_CUP_DESIGNS) {
    assert.equal(design.coins, undefined, `${design.id} has a coin price on it`);
  }
});

check('it is not in the weekly coin rotation', () => {
  const ids = cups.COIN_CUP_DESIGNS.map((d) => d.id);
  assert.ok(!ids.includes(cups.PERFECT_WEEKEND_CUP), 'the earned cup leaked into the coin shop');
  // And not by way of the rotation either, walked over a full cycle.
  for (let week = 0; week < 20; week++) {
    const offer = shop.weeklyOffer(new Date(2026, 0, 5 + week * 7, 12));
    for (const design of offer) {
      assert.notEqual(design.id, cups.PERFECT_WEEKEND_CUP, `it came up in week ${week}`);
    }
  }
});

check('and not in the money catalogue', () => {
  const ids = cups.PAID_CUP_DESIGNS.map((d) => d.id);
  assert.ok(!ids.includes(cups.PERFECT_WEEKEND_CUP), 'the earned cup leaked into the paid shop');
});

check('the three shelves do not overlap at all', () => {
  // The general form of the two checks above, so a fourth category added later
  // cannot quietly land in two places.
  const coin = new Set(cups.COIN_CUP_DESIGNS.map((d) => d.id));
  const paid = new Set(cups.PAID_CUP_DESIGNS.map((d) => d.id));
  const earned = new Set(cups.EARNED_CUP_DESIGNS.map((d) => d.id));
  for (const id of earned) {
    assert.ok(!coin.has(id) && !paid.has(id), `${id} is on more than one shelf`);
  }
  for (const id of coin) assert.ok(!paid.has(id), `${id} is both earned and sold`);
});

check('it is visibly different from the gold design that costs 3200 coins', () => {
  // A reward that looks like something buyable is not a reward.
  const champion = cups.COIN_CUP_DESIGNS.find((d) => d.id === 'cup-champion');
  assert.ok(champion, 'the champion design is gone — this check needs rewriting');
  const perfect = cups.cupDesign(cups.PERFECT_WEEKEND_CUP);
  assert.notEqual(perfect.pattern.kind, champion.pattern.kind, 'both are the same kind of pattern');
});

console.log(`\n${passed} checks passed`);
