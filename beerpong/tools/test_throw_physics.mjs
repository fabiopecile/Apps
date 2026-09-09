/**
 * Checks that the throw is a throw and not a die roll.
 *
 * The important properties are not "does it compile" but "can a player get
 * better at it": aiming at a cup has to beat aiming next to it, the far row
 * has to be harder than the near one, and a steadier thrower has to score
 * more. Each of those is measured over ten thousand simulated throws.
 *
 * Run with: node tools/test_throw_physics.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'throw-'));

async function load(name) {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText // the physics module imports only a type, which erases to nothing
    .replace(/^import .*$/gm, '');
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return import(file);
}

const layout = await load('arcadeLayout');
const physics = await load('throwPhysics');
const { aimPoint, throwPower, spreadFor, resolveLanding, resolveThrow, MAX_REACH } = physics;

const TABLE_WIDTH = 342; // a 390pt phone, minus the usual margins
const cups = layout.generateOpponentRack(TABLE_WIDTH);
const allAlive = Array(layout.CUP_COUNT).fill(true);
const START = { x: TABLE_WIDTH / 2, y: layout.PLAYER_BALL_Y };

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

/** Repeatable randomness, so a run either always passes or always fails. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * The drag that aims at a cup. With one-to-one aiming this is simply the
 * offset from the ball to the cup — dragging the ring onto it.
 */
function dragTo(cup) {
  return { dragX: cup.x - START.x, dragY: cup.y - START.y };
}

function hitRate(cup, skill, { offsetX = 0, bounce = false, seed = 7 } = {}) {
  const random = seeded(seed);
  const { dragX, dragY } = dragTo(cup);
  let hits = 0;
  const runs = 10000;
  for (let i = 0; i < runs; i++) {
    const outcome = resolveThrow({
      start: START,
      dragX: dragX + offsetX,
      dragY,
      direction: 'up',
      skill,
      bounce,
      cups,
      aliveFlags: allAlive,
      random,
    });
    if (outcome.hit) hits += 1;
  }
  return hits / runs;
}

const apex = cups[cups.length - 1]; // the single cup nearest the thrower
const backRow = cups[1]; // one of the four at the far end

console.log('throw physics');

check('the aim ring sits exactly under the finger', () => {
  // The whole mechanic rests on this: drag the ring onto a cup and the ball
  // goes to that cup. An amplified drag broke it once already.
  for (const cup of [apex, backRow, cups[7]]) {
    const { dragX, dragY } = dragTo(cup);
    const aim = aimPoint(START, dragX, dragY, 'up');
    assert.ok(Math.abs(aim.x - cup.x) < 0.5, `aim x ${aim.x} vs cup ${cup.x}`);
    assert.ok(Math.abs(aim.y - cup.y) < 0.5, `aim y ${aim.y} vs cup ${cup.y}`);
  }
});

check('every cup on the table is within reach of one drag', () => {
  const furthest = Math.max(...cups.map((c) => START.y - c.y));
  assert.ok(furthest <= MAX_REACH, `far row is ${furthest} away, reach is ${MAX_REACH}`);
});

check('a flick with no length is no throw', () => {
  assert.equal(throwPower(0), 0);
  assert.equal(throwPower(-MAX_REACH * 2), 1); // clamped, not runaway
});

check('throwing down the table aims the other way', () => {
  const up = aimPoint(START, 0, -150, 'up');
  const down = aimPoint(START, 0, -150, 'down');
  assert.ok(up.y < START.y && down.y > START.y);
});

check('a dead-centre landing is in, an edge landing rims out', () => {
  const inside = resolveLanding({ x: apex.x, y: apex.y }, cups, allAlive);
  assert.equal(inside.hit, true);
  assert.equal(inside.cupIndex, apex.index);
  const rim = resolveLanding({ x: apex.x + apex.width * 0.5, y: apex.y }, cups, allAlive);
  assert.equal(rim.hit, false);
  assert.equal(rim.rimOut, true);
  assert.equal(rim.cupIndex, apex.index);
});

check('landing on bare table hits nothing at all', () => {
  const miss = resolveLanding({ x: apex.x, y: apex.y + 200 }, cups, allAlive);
  assert.equal(miss.cupIndex, null);
  assert.equal(miss.hit, false);
  assert.equal(miss.rimOut, false);
});

check('a cup already sunk cannot be hit again', () => {
  const flags = [...allAlive];
  flags[apex.index] = false;
  const result = resolveLanding({ x: apex.x, y: apex.y }, cups, flags);
  assert.notEqual(result.cupIndex, apex.index);
  assert.equal(result.hit, false);
});

// --------------------------------------------------------------- the point

check('aiming at a cup beats aiming a cup-width beside it', () => {
  const onTarget = hitRate(apex, 0.55);
  const beside = hitRate(apex, 0.55, { offsetX: apex.width });
  assert.ok(
    onTarget > beside + 0.3,
    `on target ${onTarget.toFixed(2)} vs beside ${beside.toFixed(2)} — aiming must matter`
  );
});

check('the far row is harder than the cup in front of you', () => {
  const near = hitRate(apex, 0.55);
  const far = hitRate(backRow, 0.55);
  assert.ok(far < near, `far ${far.toFixed(2)} should be under near ${near.toFixed(2)}`);
});

check('a steadier thrower scores more', () => {
  const shaky = hitRate(apex, 0.48);
  const steady = hitRate(apex, 0.62);
  assert.ok(steady > shaky, `steady ${steady.toFixed(2)} vs shaky ${shaky.toFixed(2)}`);
});

check('a bounce shot is the harder way to take two cups', () => {
  const normal = hitRate(apex, 0.55);
  const bounced = hitRate(apex, 0.55, { bounce: true });
  assert.ok(bounced < normal, `bounce ${bounced.toFixed(2)} vs normal ${normal.toFixed(2)}`);
});

check('spread grows with power and shrinks with skill', () => {
  assert.ok(spreadFor(0.55, 1, false) > spreadFor(0.55, 0, false));
  assert.ok(spreadFor(0.8, 0.5, false) < spreadFor(0.3, 0.5, false));
});

check('a perfect throw is not a certainty, and a bad one is not hopeless', () => {
  const best = hitRate(apex, 0.62);
  const worst = hitRate(backRow, 0.48);
  assert.ok(best < 0.97, `best ${best.toFixed(2)} — there has to be some risk`);
  assert.ok(worst > 0.05, `worst ${worst.toFixed(2)} — there has to be some hope`);
});

console.log('\nhit rates, aiming as well as the player can:');
for (const [label, cup] of [['nearest cup', apex], ['far row', backRow]]) {
  const rates = [0.48, 0.55, 0.62].map((s) => `${(hitRate(cup, s) * 100).toFixed(0)}%`);
  console.log(`  ${label.padEnd(12)} shaky ${rates[0]}  ·  normal ${rates[1]}  ·  steady ${rates[2]}`);
}

console.log(`\n${passed} checks passed`);
