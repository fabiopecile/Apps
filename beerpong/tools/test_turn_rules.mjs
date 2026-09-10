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

check('clearing their rack in redemption pulls it back', () => {
  const { outcome } = afterThrow(startTurn(true), true, 0);
  assert.equal(outcome, 'redeemed');
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
  assert.equal(afterThrow(state, true, 0).outcome, 'redeemed');
});

check('missing the last redemption throw still loses', () => {
  let state = startTurn(true);
  ({ next: state } = afterThrow(state, true, 1));
  assert.equal(afterThrow(state, false, 1).outcome, 'eliminated');
});

console.log(`\n${passed} checks passed`);
