/**
 * Checks the detection engine's decisions without a camera.
 *
 * Run with: node tools/test_cup_vision.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

// The engine is plain TypeScript with no imports, so the project's own
// compiler can hand it to node directly — no test runner needed.
const source = readFileSync(new URL('../lib/cupVision.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const dir = mkdtempSync(join(tmpdir(), 'cupvision-'));
const file = join(dir, 'cupVision.mjs');
writeFileSync(file, js);
const vision = await import(file);

const { createDetector, calibrate, step, acceptCup, rejectCup, rackLayout, rowsFor } = vision;

/** A cup that is standing: mid green, high rim contrast. */
const CUP = { r: 60, g: 170, b: 70, contrast: 42 };
/** Bare table where a cup used to be: darker and flat. */
const EMPTY = { r: 38, g: 46, b: 40, contrast: 9 };
/** A hand passing over: pale and soft. */
const HAND = { r: 190, g: 150, b: 130, contrast: 14 };

const full = (n) => Array.from({ length: n }, () => ({ ...CUP }));

function run(state, frames) {
  const events = [];
  for (const samples of frames) {
    const result = step(state, samples);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log('rack layout');
check('10 cups form a 4-3-2-1 rack', () => {
  assert.deepEqual(rowsFor(10), [4, 3, 2, 1]);
  assert.equal(rackLayout(10).length, 10);
});
check('6 cups form a 3-2-1 rack', () => assert.deepEqual(rowsFor(6), [3, 2, 1]));
check('an odd count still places every cup', () => {
  for (let n = 1; n <= 12; n++) {
    assert.equal(rackLayout(n).length, n, `count ${n}`);
  }
});
check('layout stays inside its box', () => {
  for (const p of rackLayout(10)) {
    assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  }
});

console.log('detection');
check('a steady rack reports nothing', () => {
  let state = calibrate(createDetector(10), full(10));
  const { events } = run(state, Array.from({ length: 30 }, () => full(10)));
  assert.deepEqual(events, []);
});

check('a removed cup is reported once, not every frame', () => {
  let state = calibrate(createDetector(10), full(10));
  const frames = Array.from({ length: 20 }, () => {
    const f = full(10);
    f[3] = { ...EMPTY };
    return f;
  });
  const { events } = run(state, frames);
  const gone = events.filter((e) => e.type === 'cupGone');
  assert.equal(gone.length, 1, 'exactly one proposal');
  assert.equal(gone[0].index, 3, 'the right cup');
});

check('a brief flicker never reports', () => {
  let state = calibrate(createDetector(10), full(10));
  // Changed for two frames — below the four-frame confirmation.
  const frames = [full(10), full(10)].concat(
    [0, 1].map(() => {
      const f = full(10);
      f[5] = { ...EMPTY };
      return f;
    }),
    [full(10), full(10), full(10)]
  );
  const { events } = run(state, frames);
  assert.deepEqual(events, []);
});

check('a hand over the whole rack is called a disturbance, not ten hits', () => {
  let state = calibrate(createDetector(10), full(10));
  const frames = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ ...HAND })));
  const { events } = run(state, frames);
  assert.ok(events.every((e) => e.type === 'disturbed'), 'only disturbance events');
  assert.equal(events.filter((e) => e.type === 'cupGone').length, 0);
});

check('a hand over one cup can be rejected and then stays quiet', () => {
  let state = calibrate(createDetector(10), full(10));
  const covered = () => {
    const f = full(10);
    f[7] = { ...HAND };
    return f;
  };
  let result = run(state, Array.from({ length: 6 }, covered));
  state = result.state;
  assert.equal(result.events.filter((e) => e.type === 'cupGone').length, 1);

  state = rejectCup(state, 7);
  // Still covered for a while: the cooldown must swallow it.
  result = run(state, Array.from({ length: 20 }, covered));
  assert.equal(result.events.length, 0, 'silent during cooldown');
});

check('an accepted cup stops being watched', () => {
  let state = calibrate(createDetector(10), full(10));
  const missing = () => {
    const f = full(10);
    f[0] = { ...EMPTY };
    return f;
  };
  let result = run(state, Array.from({ length: 6 }, missing));
  state = acceptCup(result.state, 0);
  result = run(state, Array.from({ length: 40 }, missing));
  assert.deepEqual(result.events, [], 'never asks about it again');
});

check('a second cup is still found after the first was scored', () => {
  let state = calibrate(createDetector(10), full(10));
  const oneGone = () => {
    const f = full(10);
    f[0] = { ...EMPTY };
    return f;
  };
  state = acceptCup(run(state, Array.from({ length: 6 }, oneGone)).state, 0);

  const twoGone = () => {
    const f = oneGone();
    f[6] = { ...EMPTY };
    return f;
  };
  const result = run(state, Array.from({ length: 8 }, twoGone));
  const gone = result.events.filter((e) => e.type === 'cupGone');
  assert.equal(gone.length, 1);
  assert.equal(gone[0].index, 6);
});

check('nothing is reported before calibration', () => {
  const state = createDetector(10);
  const { events } = run(state, [Array.from({ length: 10 }, () => ({ ...EMPTY }))]);
  assert.deepEqual(events, []);
});

check('a dimmer room does not empty the rack', () => {
  let state = calibrate(createDetector(10), full(10));
  // Everything drops ~18% in brightness at once.
  const dim = () =>
    Array.from({ length: 10 }, () => ({
      r: CUP.r * 0.82,
      g: CUP.g * 0.82,
      b: CUP.b * 0.82,
      contrast: CUP.contrast * 0.82,
    }));
  const { events } = run(state, Array.from({ length: 12 }, dim));
  assert.equal(events.filter((e) => e.type === 'cupGone').length, 0);
});

console.log(`\n${passed} checks passed`);
