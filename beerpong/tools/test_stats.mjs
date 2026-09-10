/**
 * The numbers behind the stats screen.
 *
 * Most of these are about the empty case. A stats screen with no data is the
 * one everybody sees first, and the tempting shortcuts there — an even tenth
 * per cup, a zero where there is nothing — draw a confident picture of nothing,
 * which is worse than an empty one.
 *
 * Run with: node tools/test_stats.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'stats-'));
const source = readFileSync(new URL('../lib/stats.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'stats.mjs');
writeFileSync(file, js);
const {
  EMPTY_STATS,
  FORM_LENGTH,
  MATCH_HISTORY,
  RACK_POSITIONS,
  bestRun,
  divisionTrail,
  form,
  hitRate,
  hitShares,
  netForm,
  recentMatches,
  recordCup,
  recordMatch,
  secondsPerCup,
  totalCupsRecorded,
} = await import(file);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

const match = (over) => ({
  at: 1_700_000_000_000,
  mode: 'offline',
  won: true,
  cupsHit: 10,
  throws: 20,
  seconds: 120,
  ...over,
});

console.log('stats');

check('an empty heatmap is empty, not evenly spread', () => {
  const shares = hitShares(EMPTY_STATS);
  assert.equal(shares.length, RACK_POSITIONS);
  assert.ok(
    shares.every((share) => share === 0),
    'a tenth per cup would draw a confident picture of nothing'
  );
});

check('shares add up to one once there is anything', () => {
  let stats = EMPTY_STATS;
  for (const index of [0, 0, 3, 9, 9, 9]) stats = recordCup(stats, index);
  const shares = hitShares(stats);
  assert.equal(totalCupsRecorded(stats), 6);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(Math.abs(shares[9] - 0.5) < 1e-9, 'half of them fell on the last cup');
  assert.equal(shares[1], 0);
});

check('a cup index outside the rack is ignored, not recorded', () => {
  for (const bad of [-1, 10, 1.5, NaN]) {
    assert.equal(recordCup(EMPTY_STATS, bad), EMPTY_STATS, `${bad} should change nothing`);
  }
});

check('a short stored array from an older version still works', () => {
  // Persisted state outlives the code that wrote it.
  const old = { cupHits: [3, 1], matches: [] };
  const grown = recordCup(old, 7);
  assert.equal(grown.cupHits.length, RACK_POSITIONS);
  assert.equal(grown.cupHits[7], 1);
  assert.equal(grown.cupHits[0], 3, 'and what was there is kept');
  assert.equal(hitShares(old).length, RACK_POSITIONS, 'reading one is safe too');
});

check('history is capped and keeps the newest', () => {
  let stats = EMPTY_STATS;
  for (let i = 0; i < MATCH_HISTORY + 15; i++) stats = recordMatch(stats, match({ at: i }));
  assert.equal(stats.matches.length, MATCH_HISTORY);
  assert.equal(stats.matches[stats.matches.length - 1].at, MATCH_HISTORY + 14, 'newest kept');
  assert.equal(stats.matches[0].at, 15, 'oldest dropped');
});

check('form reads newest first', () => {
  let stats = EMPTY_STATS;
  for (const won of [true, false, false, true]) stats = recordMatch(stats, match({ won }));
  assert.deepEqual(form(stats, 3), [true, false, false]);
  assert.equal(netForm(stats), 0, 'two and two');
  assert.equal(netForm(stats, 1), 1, 'and the last one was a win');
});

check('form is only as long as there is history', () => {
  const stats = recordMatch(EMPTY_STATS, match({ won: false }));
  assert.deepEqual(form(stats), [false]);
  assert.equal(form(EMPTY_STATS).length, 0);
  assert.equal(netForm(EMPTY_STATS), 0);
  assert.equal(FORM_LENGTH, 10);
});

check('time per cup is per mode, and null where nothing was sunk', () => {
  let stats = EMPTY_STATS;
  stats = recordMatch(stats, match({ mode: 'offline', cupsHit: 10, seconds: 120 }));
  stats = recordMatch(stats, match({ mode: 'passplay', cupsHit: 4, seconds: 200 }));
  assert.equal(secondsPerCup(stats, 'offline'), 12);
  assert.equal(secondsPerCup(stats, 'passplay'), 50);
  assert.equal(secondsPerCup(stats, 'weekend'), null, 'never played, so no number');
  assert.equal(secondsPerCup(EMPTY_STATS), null);
  // Across everything: 320 seconds for 14 cups.
  assert.ok(Math.abs(secondsPerCup(stats) - 320 / 14) < 1e-9);
});

check('a match with no cups in it does not divide by zero', () => {
  const stats = recordMatch(EMPTY_STATS, match({ cupsHit: 0, throws: 0, seconds: 90 }));
  assert.equal(secondsPerCup(stats), null);
  assert.equal(hitRate(stats), null);
});

check('hit rate is cups over throws', () => {
  let stats = recordMatch(EMPTY_STATS, match({ cupsHit: 6, throws: 20 }));
  stats = recordMatch(stats, match({ cupsHit: 4, throws: 20 }));
  assert.equal(hitRate(stats), 0.25);
});

check('the division trail only follows ranked matches', () => {
  let stats = EMPTY_STATS;
  stats = recordMatch(stats, match({ mode: 'rivals', division: 9 }));
  stats = recordMatch(stats, match({ mode: 'offline' }));
  stats = recordMatch(stats, match({ mode: 'rivals', division: 8 }));
  assert.deepEqual(divisionTrail(stats), [9, 8], 'oldest first, so it reads left to right');
});

check('the best run is the longest one anywhere, not the current one', () => {
  let stats = EMPTY_STATS;
  for (const won of [true, true, true, false, true]) stats = recordMatch(stats, match({ won }));
  assert.equal(bestRun(stats), 3);
  assert.equal(bestRun(EMPTY_STATS), 0);
});

check('recent matches can be filtered by mode', () => {
  let stats = EMPTY_STATS;
  stats = recordMatch(stats, match({ mode: 'offline', at: 1 }));
  stats = recordMatch(stats, match({ mode: 'rivals', at: 2 }));
  stats = recordMatch(stats, match({ mode: 'offline', at: 3 }));
  assert.deepEqual(
    recentMatches(stats, 5, 'offline').map((m) => m.at),
    [3, 1]
  );
});

console.log(`\n${passed} checks passed`);
