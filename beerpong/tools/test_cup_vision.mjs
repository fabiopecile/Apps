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
  let state = calibrate(createDetector([10]), full(10));
  const { events } = run(state, Array.from({ length: 30 }, () => full(10)));
  assert.deepEqual(events, []);
});

check('a removed cup is reported once, not every frame', () => {
  let state = calibrate(createDetector([10]), full(10));
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
  let state = calibrate(createDetector([10]), full(10));
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
  let state = calibrate(createDetector([10]), full(10));
  const frames = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ ...HAND })));
  const { events } = run(state, frames);
  assert.ok(events.every((e) => e.type === 'disturbed'), 'only disturbance events');
  assert.equal(events.filter((e) => e.type === 'cupGone').length, 0);
});

check('a hand over one cup can be rejected and then stays quiet', () => {
  let state = calibrate(createDetector([10]), full(10));
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
  let state = calibrate(createDetector([10]), full(10));
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
  let state = calibrate(createDetector([10]), full(10));
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
  const state = createDetector([10]);
  const { events } = run(state, [Array.from({ length: 10 }, () => ({ ...EMPTY }))]);
  assert.deepEqual(events, []);
});

check('a dimmer room does not empty the rack', () => {
  let state = calibrate(createDetector([10]), full(10));
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

check('the light going down does not empty the rack, and a real hit still lands', () => {
  // The old detector judged each patch against its own calibration in
  // absolute terms, so a room getting darker looked like every cup changing
  // at once — twelve false calls and four hundred deaf frames on the bench.
  // Now each cup is judged against what the *rest of the rack* is doing.
  const dim = (samples, k) =>
    samples.map((c) => ({ r: c.r * k, g: c.g * k, b: c.b * k, contrast: c.contrast * k }));
  let state = calibrate(createDetector([10]), full(10));
  const frames = [];
  for (let f = 1; f <= 120; f++) frames.push(dim(full(10), 1 - 0.3 * (f / 120)));
  const drift = run(state, frames);
  assert.equal(drift.events.length, 0, 'a dimmer room is not ten hits');

  // ...and a cup going out under that dimmer light is still found.
  const dark = dim(full(10), 0.7);
  dark[4] = { r: EMPTY.r * 0.7, g: EMPTY.g * 0.7, b: EMPTY.b * 0.7, contrast: EMPTY.contrast * 0.7 };
  const hit = run(drift.state, Array(6).fill(dark));
  assert.ok(
    hit.events.some((e) => e.type === 'cupGone' && e.index === 4),
    'the cup that actually went was missed'
  );
});

check('a view that stays wholly changed is taken again rather than staying deaf', () => {
  // A knocked phone puts every patch off its cup for good. Before this, that
  // ended the feature: 599 frames of disturbance on the bench and the hit that
  // followed was never found.
  let state = calibrate(createDetector([10]), full(10));
  const moved = Array.from({ length: 10 }, () => ({ ...HAND }));
  const long = run(state, Array(40).fill(moved));
  assert.ok(
    long.events.some((e) => e.type === 'rebaselined'),
    'it never took the view again'
  );

  // And from there it works on the new view: a cup going out is found.
  const after = [...moved];
  after[2] = { ...EMPTY };
  const hit = run(long.state, Array(6).fill(after));
  assert.ok(hit.events.some((e) => e.type === 'cupGone' && e.index === 2));
});

check('three cups changing at once is a shadow, not three throws', () => {
  // Too many for throws, too few for the whole-rack guard. A throw takes one
  // cup; a person leaning over one end takes three patches at the same instant.
  let state = calibrate(createDetector([10]), full(10));
  const shaded = full(10);
  for (let i = 0; i < 3; i++) {
    shaded[i] = { r: CUP.r * 0.6, g: CUP.g * 0.6, b: CUP.b * 0.6, contrast: CUP.contrast * 0.6 };
  }
  const result = run(state, Array(10).fill(shaded));
  assert.ok(
    !result.events.some((e) => e.type === 'cupGone'),
    'a shadow was scored as hits'
  );
  assert.ok(result.events.some((e) => e.type === 'disturbed'));
});

console.log('two racks');
const both = (n) => full(2 * n);

check('a cup on the second rack reports against the second rack', () => {
  let state = calibrate(createDetector([10, 10]), both(10));
  const frames = Array.from({ length: 8 }, () => {
    const f = both(10);
    f[13] = { ...EMPTY };
    return f;
  });
  const { events } = run(state, frames);
  const gone = events.filter((e) => e.type === 'cupGone');
  assert.equal(gone.length, 1);
  assert.equal(gone[0].index, 13);
  assert.equal(gone[0].rack, 1, 'attributed to the second rack');
});

check('a hand over one of two racks is a disturbance, not five hits', () => {
  // This is the case a pooled check would miss: ten of twenty cups changing
  // is only half of everything, but it is the whole of one rack.
  let state = calibrate(createDetector([10, 10]), both(10));
  const frames = Array.from({ length: 10 }, () => {
    const f = both(10);
    for (let i = 0; i < 10; i++) f[i] = { ...HAND };
    return f;
  });
  const { events } = run(state, frames);
  assert.equal(events.filter((e) => e.type === 'cupGone').length, 0, 'no hits');
  const disturbed = events.filter((e) => e.type === 'disturbed');
  assert.ok(disturbed.length > 0, 'reported as a disturbance');
  assert.ok(disturbed.every((e) => e.rack === 0), 'only the covered rack');
});

check('one disturbed rack does not deafen the other', () => {
  let state = calibrate(createDetector([10, 10]), both(10));
  const frames = Array.from({ length: 8 }, () => {
    const f = both(10);
    for (let i = 0; i < 10; i++) f[i] = { ...HAND };  // rack 0 covered
    f[16] = { ...EMPTY };                              // real hit on rack 1
    return f;
  });
  const { events } = run(state, frames);
  const gone = events.filter((e) => e.type === 'cupGone');
  assert.equal(gone.length, 1, 'the good rack still scores');
  assert.equal(gone[0].rack, 1);
});

check('both racks can lose a cup in the same session', () => {
  let state = calibrate(createDetector([10, 10]), both(10));
  const first = () => {
    const f = both(10);
    f[2] = { ...EMPTY };
    return f;
  };
  let result = run(state, Array.from({ length: 6 }, first));
  assert.equal(result.events[0].rack, 0);
  state = acceptCup(result.state, 2);

  const second = () => {
    const f = first();
    f[15] = { ...EMPTY };
    return f;
  };
  result = run(state, Array.from({ length: 8 }, second));
  const gone = result.events.filter((e) => e.type === 'cupGone');
  assert.equal(gone.length, 1);
  assert.equal(gone[0].rack, 1);
});

console.log(`\n${passed} checks passed`);
