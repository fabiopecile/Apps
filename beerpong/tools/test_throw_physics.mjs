/**
 * Checks that the throw is a throw: a real parabola, launched by how fast the
 * hand was moving.
 *
 * The properties that matter are not "does it compile" but "can a player get
 * better at it": a harder swipe has to carry further, the whole rack has to be
 * reachable inside a drag a thumb can actually make, the ball has to
 * leave the table and come back to it, and a steadier thrower has to score
 * more. Each is measured over thousands of simulated throws.
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
    .outputText
    // Type-only imports erase to nothing; real ones have to keep working, so
    // point them at the sibling file this same loader just wrote.
    .replace(/^import type .*$/gm, '')
    .replace(/from '\.\/([A-Za-z]+)'/g, "from './$1.mjs'");
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return import(file);
}

const layout = await load('arcadeLayout');
const geometry = await load('cupGeometry');
const physics = await load('throwPhysics');
const {
  GRAVITY,
  HANG_TIME,
  LAUNCH_UP,
  APEX,
  MIN_DRAG,
  RESTITUTION,
  dragLength,
  rangeForDrag,
  dragForRange,
  heightAt,
  buildFlight,
  sampleFlight,
  previewFlight,
  resolveLanding,
  resolveThrow,
  cupMouth,
  spreadFor,
  spreadForAccuracy,
  wobble,
} = physics;

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

/** The swipe that throws at a cup: straight at it, fast enough to reach. */
function swipeAt(cup, { extraSpeed = 1, offsetX = 0 } = {}) {
  const mouth = cupMouth(cup);
  const dx = mouth.x + offsetX - START.x;
  const dy = mouth.y - START.y;
  const distance = Math.hypot(dx, dy);
  const drag = dragForRange(distance) * extraSpeed;
  return { dragX: (dx / distance) * drag, dragY: (dy / distance) * drag };
}

function hitRate(cup, skill, { offsetX = 0, bounce = false, seed = 7, runs = 8000, alive = allAlive } = {}) {
  const random = seeded(seed);
  const swipe = swipeAt(cup, { offsetX });
  let hits = 0;
  for (let i = 0; i < runs; i++) {
    const outcome = resolveThrow({
      start: START,
      ...swipe,
      direction: 'up',
      skill,
      bounce,
      cups,
      aliveFlags: alive,
      random,
    });
    if (outcome?.hit) hits += 1;
  }
  return hits / runs;
}

const apex = cups[cups.length - 1]; // the single cup nearest the thrower
const backRow = cups[1]; // one of the four at the far end

console.log('throw physics');

// ------------------------------------------------------------ the flight

check('the ball leaves the table and comes back to it', () => {
  assert.equal(heightAt(0), 0);
  assert.equal(heightAt(HANG_TIME).toFixed(6), '0.000000');
  assert.ok(heightAt(HANG_TIME / 2) > 100, 'it should get properly airborne');
});

check('the arc peaks halfway, where the physics says it does', () => {
  const top = heightAt(HANG_TIME / 2);
  assert.ok(Math.abs(top - APEX) < 0.01, `apex ${top} vs ${APEX}`);
  // v^2 / 2g, the textbook height of a body thrown straight up.
  assert.ok(Math.abs(APEX - (LAUNCH_UP * LAUNCH_UP) / (2 * GRAVITY)) < 0.01);
});

check('a faster swipe carries further', () => {
  const speeds = [50, 90, 130, 180];
  const ranges = speeds.map(rangeForDrag);
  for (let i = 1; i < ranges.length; i++) {
    assert.ok(ranges[i] > ranges[i - 1], `${speeds[i]} should beat ${speeds[i - 1]}`);
  }
});

check('the whole rack sits inside a drag a thumb can make', () => {
  const nearest = dragForRange(START.y - cupMouth(apex).y);
  const furthest = dragForRange(
    Math.hypot(cupMouth(backRow).x - START.x, START.y - cupMouth(backRow).y)
  );
  // Both ends have to be reachable, and not two flicks of the wrist apart.
  assert.ok(nearest > MIN_DRAG, `near cup needs a ${nearest.toFixed(0)}pt drag`);
  assert.ok(furthest < 2200, `far row needs ${furthest.toFixed(0)}pt/s, too fast to aim`);
  assert.ok(furthest < 210, `back row needs a ${furthest.toFixed(0)}pt drag, past a thumb's reach`);
  assert.ok(furthest / nearest < 2.2, `${(furthest / nearest).toFixed(2)}x range is too twitchy`);
});

check('a slow hand is not a throw', () => {
  const nudge = previewFlight({
    start: START,
    dragX: 0,
    dragY: -(MIN_DRAG - 6),
    direction: 'up',
    bounce: false,
  });
  assert.equal(nudge, null);
});

check('swiping backwards throws nothing', () => {
  const backwards = previewFlight({
    start: START,
    dragX: 0,
    dragY: 200,
    direction: 'up',
    bounce: false,
  });
  assert.equal(backwards, null);
  // ...but the same swipe is a throw for the player at the other end.
  const other = previewFlight({
    start: START,
    dragX: 0,
    dragY: 200,
    direction: 'down',
    bounce: false,
  });
  assert.ok(other && other.landing.y > START.y);
});

check('the flight starts and ends where it should', () => {
  const flight = buildFlight(START, cupMouth(apex), false);
  const target = cupMouth(apex);
  const first = sampleFlight(flight, 0);
  const last = sampleFlight(flight, flight.hang);
  assert.ok(Math.abs(first.x - START.x) < 0.01 && Math.abs(first.y - START.y) < 0.01);
  assert.ok(Math.abs(last.x - target.x) < 0.01 && Math.abs(last.y - target.y) < 0.01);
  assert.ok(first.height < 0.01 && last.height < 0.01);
  assert.ok(sampleFlight(flight, flight.hang / 2).height > 100);
});

check('walking the ball up the table buys no distance', () => {
  // The ball follows the finger all the way, so it can be let go half way up
  // the table. If that simply added its head start to the range, a short drag
  // and a soft flick would drop the ball straight into the back row.
  const drag = 140;
  const fromMark = previewFlight({
    start: START,
    dragX: 0,
    dragY: -drag,
    direction: 'up',
    bounce: false,
  });
  const carry = 90;
  const carried = previewFlight({
    start: { x: START.x, y: START.y - carry },
    dragX: 0,
    dragY: -drag,
    direction: 'up',
    bounce: false,
    carry,
  });
  assert.ok(fromMark && carried);
  assert.ok(
    Math.abs(carried.landing.y - fromMark.landing.y) < 0.01,
    `carrying the ball ${carry}pt forward moved the landing to ${carried.landing.y} from ${fromMark.landing.y}`
  );
  // Pulling back is not a run-up either: it must not lend range.
  const pulled = previewFlight({
    start: { x: START.x, y: START.y + 60 },
    dragX: 0,
    dragY: -drag,
    direction: 'up',
    bounce: false,
    carry: -60,
  });
  assert.ok(pulled && pulled.landing.y > fromMark.landing.y - 0.01);
});

check('a bounce shot touches the table on the way, and only once', () => {
  const target = cupMouth(apex);
  const flight = buildFlight(START, target, true);
  assert.ok(flight.bounceAt, 'a bounce shot has to bounce');
  // On the table, short of the cup, and past halfway.
  const total = Math.hypot(target.x - START.x, target.y - START.y);
  const toBounce = Math.hypot(flight.bounceAt.x - START.x, flight.bounceAt.y - START.y);
  assert.ok(toBounce < total, 'it has to come down before the cup');
  assert.ok(toBounce / total > 0.5, 'and cover most of the way on the first hop');
  // The second hop keeps `RESTITUTION` of the first: that fixes where it lands.
  const secondHop = total - toBounce;
  assert.ok(
    Math.abs(secondHop / toBounce - RESTITUTION) < 0.001,
    `second hop is ${(secondHop / toBounce).toFixed(3)} of the first, expected ${RESTITUTION}`
  );
  assert.ok(sampleFlight(flight, flight.bounceTime).height < 0.01, 'it must be on the table');
});

check('a bounce shot arcs lower than a straight throw', () => {
  const target = cupMouth(apex);
  const straight = buildFlight(START, target, false);
  const bounced = buildFlight(START, target, true);
  const topOf = (f) => {
    let best = 0;
    for (let i = 0; i <= 40; i++) best = Math.max(best, sampleFlight(f, (i / 40) * f.hang).height);
    return best;
  };
  assert.ok(topOf(bounced) < topOf(straight) * 0.6);
});

// ------------------------------------------------------------- the target

check('a cup mouth is a circle, right above where the cup stands', () => {
  // In ground coordinates there is nothing left to get wrong. Both of these
  // used to be false — the layout was in screen coordinates, so a mouth was an
  // ellipse sitting a third of a cup's height above the point the cup was
  // stored at — and getting either wrong meant balls scoring without ever
  // looking like they went in.
  for (const cup of cups) {
    const mouth = cupMouth(cup);
    assert.equal(mouth.x, cup.x);
    assert.equal(mouth.y, cup.y);
    assert.ok(Math.abs(mouth.rx - mouth.ry) < 1e-9, 'a mouth on the ground is round');
    assert.ok(mouth.rx > cup.width * 0.4 && mouth.rx < cup.width * 0.7);
  }
});

check('every cup is the same size, because the camera does perspective now', () => {
  // The old layout listed far cups as narrower so they would *draw* smaller.
  // With a real camera in front of them that would shrink them twice over.
  const all = [...cups, ...layout.generatePlayerRack(TABLE_WIDTH)];
  assert.equal(new Set(all.map((c) => c.width)).size, 1);
});

check('a rack is a ten-cup triangle, four rows deep', () => {
  assert.equal(cups.length, 10);
  const rows = new Map();
  for (const cup of cups) rows.set(Math.round(cup.y), (rows.get(Math.round(cup.y)) ?? 0) + 1);
  assert.deepEqual([...rows.values()].sort(), [1, 2, 3, 4]);
});

check('you throw from behind your own rack, over it', () => {
  // Resting mid-table was invisible nonsense once a camera existed: your own
  // cups stand between you and the middle of the table.
  const yours = layout.generatePlayerRack(TABLE_WIDTH);
  assert.ok(
    START.y > Math.max(...yours.map((c) => c.y)),
    'the ball has to rest nearer you than your own back row'
  );
  // And the arc has to clear them.
  assert.ok(APEX > layout.CUP_HEIGHT * 1.4, `apex ${APEX.toFixed(0)} vs cup ${layout.CUP_HEIGHT}`);
});

check('a landing in the hole is in, one on the rim bounces out', () => {
  const mouth = cupMouth(apex);
  const inside = resolveLanding(mouth, cups, allAlive);
  assert.equal(inside.hit, true);
  assert.equal(inside.cupIndex, apex.index);
  const rim = resolveLanding({ x: mouth.x + mouth.rx * 1.15, y: mouth.y }, cups, allAlive);
  assert.equal(rim.hit, false);
  assert.equal(rim.rimOut, true);
  assert.equal(rim.cupIndex, apex.index);
});

check('landing on bare table hits nothing at all', () => {
  const miss = resolveLanding({ x: apex.x, y: apex.y + 200 }, cups, allAlive);
  assert.equal(miss.cupIndex, null);
  assert.equal(miss.hit, false);
});

check('a cup already sunk cannot be hit again', () => {
  const flags = [...allAlive];
  flags[apex.index] = false;
  const result = resolveLanding(cupMouth(apex), cups, flags);
  assert.notEqual(result.cupIndex, apex.index);
  assert.equal(result.hit, false);
});

// --------------------------------------------------------------- the game

check('swiping at a cup beats swiping a cup-width beside it', () => {
  const onTarget = hitRate(apex, 0.55);
  const beside = hitRate(apex, 0.55, { offsetX: apex.width });
  assert.ok(
    onTarget > beside + 0.3,
    `on target ${onTarget.toFixed(2)} vs beside ${beside.toFixed(2)} — aiming must matter`
  );
});

check('a full rack catches misses, a lone cup does not', () => {
  // Not the other way round, which is what this used to assert. Aiming into
  // the middle of a full triangle is forgiving because a throw that misses its
  // cup drops into the neighbour; the same cup on its own is the hard shot.
  const lonely = allAlive.map((_, i) => i === 1);
  assert.ok(hitRate(backRow, 0.55) > hitRate(backRow, 0.55, { alive: lonely }));
});

check('a steadier thrower scores more', () => {
  assert.ok(hitRate(apex, 0.62) > hitRate(apex, 0.48));
});

check('throwing too hard sails past the rack', () => {
  const over = resolveThrow({
    start: START,
    ...swipeAt(backRow, { extraSpeed: 1.6 }),
    direction: 'up',
    skill: 1, // no wobble: this is the swipe's fault, not the hand's
    bounce: false,
    cups,
    aliveFlags: allAlive,
    random: () => 0.5,
  });
  assert.ok(over && over.landing.y < cupMouth(backRow).y - 40, 'it should fly past the back row');
  assert.equal(over.hit, false);
});

check('spread grows with power and shrinks with skill', () => {
  assert.ok(spreadFor(0.55, 1, false) > spreadFor(0.55, 0, false));
  assert.ok(spreadFor(0.8, 0.5, false) < spreadFor(0.3, 0.5, false));
  assert.ok(spreadFor(0.55, 0.5, true) > spreadFor(0.55, 0.5, false));
});

check('a flick of nearly the right strength still lands', () => {
  // Judging how hard to swipe is the hard part and there is nothing on screen
  // that reports it, so the strength — and only the strength — is helped along.
  // Without that, being 12% out is a guaranteed miss.
  const nearlyRight = (share) => {
    const mouth = cupMouth(apex);
    const dx = mouth.x - START.x;
    const dy = mouth.y - START.y;
    const distance = Math.hypot(dx, dy);
    const drag = dragForRange(distance) * (1 + share);
    const random = seeded(7);
    let hits = 0;
    for (let i = 0; i < 4000; i++) {
      const outcome = resolveThrow({
        start: START,
        dragX: (dx / distance) * drag,
        dragY: (dy / distance) * drag,
        direction: 'up',
        skill: 0.55,
        bounce: false,
        cups,
        aliveFlags: allAlive,
        random,
      });
      if (outcome?.hit) hits += 1;
    }
    return hits / 4000;
  };
  for (const share of [-0.12, -0.06, 0.06, 0.12]) {
    const rate = nearlyRight(share);
    assert.ok(rate > 0.6, `${(share * 100).toFixed(0)}% out of strength lands only ${rate.toFixed(2)}`);
  }
});

check('the help does not rescue a wild throw', () => {
  // It pulls onto a cup that was nearly reached, never onto one that was not.
  const start = { x: cups[0].x, y: START.y };
  const far = { x: cups[0].x, y: START.y - 900 };
  const drag = dragForRange(900);
  const outcome = resolveThrow({
    start,
    dragX: 0,
    dragY: -drag,
    direction: 'up',
    skill: 1,
    bounce: false,
    cups,
    aliveFlags: allAlive,
    random: () => 0.5,
  });
  assert.ok(outcome && !outcome.hit, 'a throw at twice the table must not be helped in');
  assert.ok(far.y < 0);
});

check('the last cup standing is where the difficulty lives', () => {
  // This guard has moved twice, and both moves were the point catching up with
  // the game. It first demanded that even the cup in front of you be missable,
  // which is not true at a real table and made the whole thing feel stiff. Then
  // it watched the back row of a *full* rack — but a miss there drops into a
  // neighbour, so that is the easy case, not the hard one. What is actually
  // hard is the end of a game: one cup, nothing around it.
  const lonely = allAlive.map((_, i) => i === 1);
  const lastCup = hitRate(backRow, 0.55, { alive: lonely });
  const gimme = hitRate(apex, 0.62);
  const shaky = hitRate(apex, 0.48);
  assert.ok(gimme > 0.85, `the cup in front of you should be a gimme, not ${gimme.toFixed(2)}`);
  assert.ok(lastCup < 0.95, `the last cup at ${lastCup.toFixed(2)} — closing out has to cost something`);
  assert.ok(lastCup > 0.4, `the last cup at ${lastCup.toFixed(2)} — and not be a wall`);
  assert.ok(gimme > shaky + 0.03, 'a steadier hand still has to be worth having');
});

check('drag length is the length of the drag', () => {
  assert.ok(Math.abs(dragLength(300, 400) - 500) < 0.001);
});

// ----------------------------------------------------------- the opponent

/** The opponent picks a cup at random and throws at it with its own spread. */
function opponentRate(accuracy, runs = 30000) {
  const random = seeded(21);
  const yours = layout.generatePlayerRack(TABLE_WIDTH);
  const alive = Array(layout.CUP_COUNT).fill(true);
  const spread = spreadForAccuracy(accuracy);
  let hits = 0;
  for (let i = 0; i < runs; i++) {
    const mouth = cupMouth(yours[Math.floor(random() * yours.length)]);
    const offset = wobble(spread, random);
    if (resolveLanding({ x: mouth.x + offset.x, y: mouth.y + offset.y }, yours, alive).hit) hits += 1;
  }
  return hits / runs;
}

check('every opponent hits about as often as its profile claims', () => {
  // The whole league, so a bad interpolation anywhere shows up.
  for (const accuracy of [0.32, 0.4, 0.44, 0.5, 0.54, 0.6, 0.68]) {
    const actual = opponentRate(accuracy);
    assert.ok(
      Math.abs(actual - accuracy) < 0.04,
      `accuracy ${accuracy} throws at ${actual.toFixed(3)}`
    );
  }
});

check('a better opponent throws tighter', () => {
  assert.ok(spreadForAccuracy(0.68) < spreadForAccuracy(0.32));
});

check('an accuracy off the end of the table still gives a usable spread', () => {
  for (const accuracy of [0, 0.05, 0.99, 1]) {
    const spread = spreadForAccuracy(accuracy);
    assert.ok(Number.isFinite(spread) && spread > 0, `accuracy ${accuracy} gave ${spread}`);
  }
  assert.ok(spreadForAccuracy(0) >= spreadForAccuracy(0.5));
  assert.ok(spreadForAccuracy(1) <= spreadForAccuracy(0.5));
});

console.log('\nhow far your thumb has to drag, in points:');
for (const [label, cup] of [['nearest cup', apex], ['far row', backRow]]) {
  const m = cupMouth(cup);
  const distance = Math.hypot(m.x - START.x, m.y - START.y);
  console.log(`  ${label.padEnd(12)} ${dragForRange(distance).toFixed(0)} pt drag  (${distance.toFixed(0)}pt away)`);
}
console.log(`  arc peaks at ${APEX.toFixed(0)}pt after ${(HANG_TIME / 2).toFixed(2)}s\n`);

console.log('hit rates, swiping as well as the player can:');
for (const [label, cup] of [['nearest cup', apex], ['far row', backRow]]) {
  const rates = [0.48, 0.55, 0.62].map((s) => `${(hitRate(cup, s) * 100).toFixed(0)}%`);
  console.log(`  ${label.padEnd(12)} shaky ${rates[0]}  ·  normal ${rates[1]}  ·  steady ${rates[2]}`);
}

console.log(`\n${passed} checks passed`);
