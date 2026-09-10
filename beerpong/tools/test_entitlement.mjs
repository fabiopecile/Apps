/**
 * Checks the free tier: three tracked games a week, a week that rolls over on
 * Monday, and no limit once it is paid for.
 *
 * Worth its own file because every one of these is a case that would otherwise
 * only show up by waiting for a Monday.
 *
 * Run with: node tools/test_entitlement.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'ent-'));
const source = readFileSync(new URL('../lib/entitlement.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'entitlement.mjs');
writeFileSync(file, js);
const {
  FREE_TRACKED_GAMES_PER_WEEK,
  EMPTY_TRACKER_USE,
  weekStartOf,
  trackedGamesLeft,
  canTrackGame,
  registerTrackedGame,
} = await import(file);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

/** Local time, so the tests read the same way the phone does. */
const at = (y, m, d, h = 20) => new Date(y, m - 1, d, h);

console.log('free tier');

check('a week starts on Monday', () => {
  // 2026-09-14 is a Monday.
  assert.equal(weekStartOf(at(2026, 9, 14)), '2026-09-14');
  assert.equal(weekStartOf(at(2026, 9, 17)), '2026-09-14', 'Thursday belongs to it');
  assert.equal(weekStartOf(at(2026, 9, 20)), '2026-09-14', 'and so does Sunday');
  assert.equal(weekStartOf(at(2026, 9, 21)), '2026-09-21', 'Monday starts the next');
});

check('half past midnight on Sunday is still the weekend', () => {
  // The point of counting in local time: a game at 00:30 on Sunday belongs to
  // the week the player thinks they are in.
  assert.equal(weekStartOf(at(2026, 9, 20, 0)), '2026-09-14');
});

check('three tracked games are free, the fourth is not', () => {
  const now = at(2026, 9, 16);
  let use = EMPTY_TRACKER_USE;
  for (let i = 0; i < FREE_TRACKED_GAMES_PER_WEEK; i++) {
    assert.ok(canTrackGame(use, now, false), `game ${i + 1} should be free`);
    use = registerTrackedGame(use, now, false);
  }
  assert.equal(trackedGamesLeft(use, now, false), 0);
  assert.equal(canTrackGame(use, now, false), false);
});

check('the count starts again on Monday', () => {
  let use = EMPTY_TRACKER_USE;
  const thisWeek = at(2026, 9, 16);
  for (let i = 0; i < FREE_TRACKED_GAMES_PER_WEEK; i++) use = registerTrackedGame(use, thisWeek, false);
  assert.equal(canTrackGame(use, thisWeek, false), false);

  const nextWeek = at(2026, 9, 21);
  assert.equal(trackedGamesLeft(use, nextWeek, false), FREE_TRACKED_GAMES_PER_WEEK);
  assert.ok(canTrackGame(use, nextWeek, false));
  // ...and the first game of the new week counts as one, not four.
  use = registerTrackedGame(use, nextWeek, false);
  assert.equal(trackedGamesLeft(use, nextWeek, false), FREE_TRACKED_GAMES_PER_WEEK - 1);
});

check('paying takes the limit away entirely', () => {
  const now = at(2026, 9, 16);
  let use = EMPTY_TRACKER_USE;
  for (let i = 0; i < 20; i++) use = registerTrackedGame(use, now, true);
  assert.equal(trackedGamesLeft(use, now, true), null, 'null means no limit');
  assert.ok(canTrackGame(use, now, true));
  // Nothing was counted, so cancelling would leave the free games intact.
  assert.equal(trackedGamesLeft(use, now, false), FREE_TRACKED_GAMES_PER_WEEK);
});

check('a stored week from long ago does not lock anyone out', () => {
  const stale = { weekStart: '2020-01-06', used: 99 };
  assert.equal(trackedGamesLeft(stale, at(2026, 9, 16), false), FREE_TRACKED_GAMES_PER_WEEK);
});

console.log(`\n${passed} checks passed`);
