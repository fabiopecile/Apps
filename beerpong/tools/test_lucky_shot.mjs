/**
 * The daily shot: one a day, a streak that has to be earned, and a golden cup
 * that cannot be re-rolled.
 *
 * Every one of these is a way the feature could quietly become free money —
 * paying twice, a streak that survives a missed day, a gold cup that moves when
 * you close the app. Worth pinning down rather than trusting.
 *
 * Run with: node tools/test_lucky_shot.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'lucky-'));
const source = readFileSync(new URL('../lib/luckyShot.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'luckyShot.mjs');
writeFileSync(file, js);
const {
  EMPTY_LUCKY,
  LUCKY_CUP_COINS,
  LUCKY_GOLDEN_COINS,
  LUCKY_MAX_STREAK,
  LUCKY_STREAK_BONUS,
  canPlayLucky,
  dayKeyOf,
  goldenCupFor,
  goldenPrizeFor,
  hoursUntilNextShot,
  playLucky,
  streakAfter,
} = await import(file);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

const at = (y, m, d, h = 20) => new Date(y, m - 1, d, h);

console.log('lucky shot');

check('one shot a day', () => {
  const now = at(2026, 9, 14);
  let state = EMPTY_LUCKY;
  assert.ok(canPlayLucky(state, now));
  ({ state } = playLucky(state, 'golden', now));
  assert.equal(canPlayLucky(state, now), false, 'the day is used up');
  assert.ok(canPlayLucky(state, at(2026, 9, 15)), 'and comes back tomorrow');
});

check('a second tap the same day pays nothing', () => {
  const now = at(2026, 9, 14);
  let result = playLucky(EMPTY_LUCKY, 'golden', now);
  const afterFirst = result.state;
  result = playLucky(afterFirst, 'golden', now);
  assert.equal(result.coins, 0);
  assert.equal(result.state, afterFirst, 'and the state is not even touched');
});

check('a miss still costs the day', () => {
  // Otherwise there is no shot to take, only a shot to keep taking.
  const now = at(2026, 9, 14);
  const { state, coins } = playLucky(EMPTY_LUCKY, 'miss', now);
  assert.equal(coins, 0);
  assert.equal(canPlayLucky(state, now), false);
});

check('any cup pays a little, the golden one pays properly', () => {
  const now = at(2026, 9, 14);
  assert.equal(playLucky(EMPTY_LUCKY, 'cup', now).coins, LUCKY_CUP_COINS);
  assert.equal(playLucky(EMPTY_LUCKY, 'golden', now).coins, LUCKY_GOLDEN_COINS);
  assert.ok(LUCKY_GOLDEN_COINS > LUCKY_CUP_COINS * 4, 'the gold cup has to be worth aiming at');
});

check('a streak has to be days in a row', () => {
  let state = EMPTY_LUCKY;
  ({ state } = playLucky(state, 'miss', at(2026, 9, 14)));
  assert.equal(state.streak, 1);
  ({ state } = playLucky(state, 'miss', at(2026, 9, 15)));
  assert.equal(state.streak, 2);
  // Skipping the 16th breaks it.
  ({ state } = playLucky(state, 'miss', at(2026, 9, 17)));
  assert.equal(state.streak, 1, 'a missed day starts again at one');
});

check('the streak pays, up to a cap', () => {
  assert.equal(goldenPrizeFor(1), LUCKY_GOLDEN_COINS);
  assert.equal(goldenPrizeFor(2), LUCKY_GOLDEN_COINS + LUCKY_STREAK_BONUS);
  const capped = LUCKY_GOLDEN_COINS + (LUCKY_MAX_STREAK - 1) * LUCKY_STREAK_BONUS;
  assert.equal(goldenPrizeFor(LUCKY_MAX_STREAK), capped);
  assert.equal(goldenPrizeFor(50), capped, 'and it stops there');
  assert.equal(goldenPrizeFor(0), LUCKY_GOLDEN_COINS, 'never below the base');
});

check('the paid prize matches the streak that shot earned', () => {
  let state = EMPTY_LUCKY;
  ({ state } = playLucky(state, 'miss', at(2026, 9, 14)));
  const second = playLucky(state, 'golden', at(2026, 9, 15));
  assert.equal(second.streak, 2);
  assert.equal(second.coins, goldenPrizeFor(2));
  assert.equal(second.state.lastPrize, second.coins);
});

check('the golden cup is fixed for the day, not for the session', () => {
  // The whole point: closing the app must not move it.
  const day = dayKeyOf(at(2026, 9, 14));
  const first = goldenCupFor(day, 10);
  for (let i = 0; i < 50; i++) assert.equal(goldenCupFor(day, 10), first);
  assert.ok(first >= 0 && first < 10);
});

check('and it does move from day to day', () => {
  const seen = new Set();
  for (let d = 1; d <= 28; d++) seen.add(goldenCupFor(dayKeyOf(at(2026, 9, d)), 10));
  // Not asking for all ten in a month, but a single fixed cup would be a bug.
  assert.ok(seen.size >= 5, `only ${seen.size} different cups in a month`);
});

check('the countdown runs to midnight', () => {
  assert.deepEqual(hoursUntilNextShot(at(2026, 9, 14, 22)), { hours: 2, minutes: 0 });
  assert.deepEqual(hoursUntilNextShot(new Date(2026, 8, 14, 22, 30)), { hours: 1, minutes: 30 });
  assert.deepEqual(hoursUntilNextShot(new Date(2026, 8, 14, 23, 59)), { hours: 0, minutes: 1 });
  assert.equal(hoursUntilNextShot(at(2026, 9, 14, 0)).hours, 24);
});

check('streakAfter agrees with what playLucky records', () => {
  // Two ways to the same number; the screen uses the first to show the prize
  // before the throw, so they had better not drift apart.
  let state = EMPTY_LUCKY;
  for (const day of [14, 15, 16, 17]) {
    const now = at(2026, 9, day);
    const predicted = streakAfter(state, now);
    const result = playLucky(state, 'cup', now);
    assert.equal(result.streak, predicted, `day ${day}`);
    state = result.state;
  }
});

console.log(`\n${passed} checks passed`);
