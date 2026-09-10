/**
 * Checks the rules that give a match its shape: two balls a turn, balls back on
 * a double, and a redemption run when your last cup falls.
 *
 * These are worth testing on their own because they are the difference between
 * a game with runs and comebacks and a game of strict alternation, and because
 * every one of them is a branch that is awkward to reach by hand in the app.
 *
 * Run with: node tools/test_turn_rules.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'turn-'));
const source = readFileSync(new URL('../lib/turnRules.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'turnRules.mjs');
writeFileSync(file, js);
const { BALLS_PER_TURN, startTurn, afterThrow, keepsThrowing } = await import(file);

// The rack sizes belong to the same fix as the overtime rule, so they are
// checked here rather than in a file of their own.
const layoutFile = join(dir, 'arcadeLayout.mjs');
writeFileSync(
  layoutFile,
  ts.transpileModule(readFileSync(new URL('../lib/arcadeLayout.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
);
const layout = await import(layoutFile);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

console.log('turn rules');

check('a turn is two balls', () => {
  assert.equal(BALLS_PER_TURN, 2);
  assert.equal(startTurn().ballsLeft, 2);
});

check('the first ball never ends a turn', () => {
  for (const hit of [true, false]) {
    const { outcome } = afterThrow(startTurn(), hit, 9);
    assert.equal(outcome, 'throwAgain', `a ${hit ? 'hit' : 'miss'} ended the turn early`);
  }
});

check('both in gets the balls back', () => {
  let state = startTurn();
  ({ next: state } = afterThrow(state, true, 9));
  const { next, outcome } = afterThrow(state, true, 8);
  assert.equal(outcome, 'ballsBack');
  assert.equal(next.ballsLeft, 2, 'and the set starts over');
  assert.equal(next.hitsThisSet, 0);
  assert.ok(keepsThrowing(outcome));
});

check('one of two is not enough — the turn goes over', () => {
  for (const [first, second] of [
    [true, false],
    [false, true],
    [false, false],
  ]) {
    let state = startTurn();
    ({ next: state } = afterThrow(state, first, 9));
    const { outcome } = afterThrow(state, second, 9);
    assert.equal(outcome, 'pass', `${first}/${second} should hand over`);
    assert.ok(!keepsThrowing(outcome));
  }
});

check('a run can go on as long as it keeps landing', () => {
  // Four doubles in a row is eight cups, which is most of a rack: the point is
  // that nothing in the rules caps it, because that is what a run is.
  let state = startTurn();
  let cups = 10;
  let sets = 0;
  for (let i = 0; i < 8; i++) {
    cups -= 1;
    const step = afterThrow(state, true, cups);
    state = step.next;
    if (step.outcome === 'ballsBack') sets += 1;
    assert.ok(keepsThrowing(step.outcome));
  }
  assert.equal(sets, 4);
});

check('redemption is throw-until-you-miss, not a two-ball set', () => {
  const state = startTurn(true);
  assert.equal(state.redemption, true);
  const { outcome } = afterThrow(state, true, 5);
  assert.equal(outcome, 'throwAgain', 'a hit keeps you alive');
});

check('one miss in redemption ends it', () => {
  const { outcome } = afterThrow(startTurn(true), false, 5);
  assert.equal(outcome, 'eliminated');
});

check('clearing their rack in redemption levels it, it does not win it', () => {
  // The bug this replaces: a successful redemption used to end the match in
  // favour of the side that had just been one miss from losing — so the player
  // who cleared the table first lost the game. Redemption gets you level.
  const { outcome } = afterThrow(startTurn(true), true, 0);
  assert.equal(outcome, 'overtime');
  assert.notEqual(outcome, 'eliminated', 'and it is certainly not a defeat');
});

check('a redemption run has to clear everything, not just one', () => {
  // Five cups left means five throws, and the fifth is the one that saves you.
  let state = startTurn(true);
  let cups = 5;
  for (let i = 0; i < 4; i++) {
    cups -= 1;
    const step = afterThrow(state, true, cups);
    state = step.next;
    assert.equal(step.outcome, 'throwAgain', `throw ${i + 1} should not have ended it`);
  }
  assert.equal(afterThrow(state, true, 0).outcome, 'overtime');
});

check('missing the last redemption throw still loses', () => {
  let state = startTurn(true);
  ({ next: state } = afterThrow(state, true, 1));
  assert.equal(afterThrow(state, false, 1).outcome, 'eliminated');
});

check('only a missed redemption ever ends a match', () => {
  // Sweeping the whole space rather than trusting the four cases above: the
  // only outcome that finishes a game is a redemption throw that misses.
  const finishing = [];
  for (const redemption of [false, true]) {
    for (const hit of [true, false]) {
      for (const cupsLeft of [0, 1, 5]) {
        for (const firstBall of [false, true]) {
          let state = startTurn(redemption);
          if (firstBall && !redemption) ({ next: state } = afterThrow(state, true, cupsLeft));
          const { outcome } = afterThrow(state, hit, cupsLeft);
          if (outcome === 'eliminated') finishing.push({ redemption, hit });
        }
      }
    }
  }
  assert.ok(finishing.length > 0, 'something has to be able to end a game');
  for (const case_ of finishing) {
    assert.ok(case_.redemption && !case_.hit, `${JSON.stringify(case_)} should not end a match`);
  }
});

check('an overtime rack is three cups, racked as a triangle', () => {
  // The rack itself is the other half of the fix: three cups standing in a
  // ten-cup triangle is a rack somebody knocked over, not a fresh one.
  assert.equal(layout.OVERTIME_CUP_COUNT, 3);
  const rack = layout.generateOpponentRack(342, layout.OVERTIME_CUP_COUNT);
  assert.equal(rack.length, 3);
  const rows = new Set(rack.map((cup) => Math.round(cup.y)));
  assert.equal(rows.size, 2, 'two rows: one behind two');
  assert.deepEqual(
    rack.map((cup) => cup.index),
    [0, 1, 2],
    'indices stay contiguous, because the alive flags are keyed by them'
  );
  // Still the full rack by default, so nothing else changed underneath.
  assert.equal(layout.generateOpponentRack(342).length, 10);
});

console.log(`\n${passed} checks passed`);
