/**
 * How good the opponent actually is, and how good it could be.
 *
 * The AI's "accuracy" is a spread around a cup, not a coin flip — so which cup
 * it picks changes how often it scores, for free. A ball that strays off a cup
 * standing on its own is a miss; the same stray off a cup in the middle of the
 * rack can still drop into a neighbour, because the landing test looks for the
 * nearest cup rather than the intended one.
 *
 * This measures that instead of assuming it. Every strategy throws the same
 * physics at the same racks with the same seeded randomness, so the only thing
 * that differs is the choice of target.
 *
 * Run with: node tools/bench_opponent.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'ai-'));
function load(name) {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  // Keep the real imports, pointing at the files beside it.
  js = js.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return file;
}
load('arcadeLayout');
load('cupGeometry');
const physicsFile = load('throwPhysics');
const aiFile = load('opponentAi');
const layout = await import(join(dir, 'arcadeLayout.mjs'));
const physics = await import(physicsFile);
// The real one the game ships, not a copy of it — a bench measuring its own
// reimplementation measures nothing.
const ai = await import(aiFile);

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const TABLE_WIDTH = layout.TABLE_WIDTH_REFERENCE;
const CUPS = layout.generateOpponentRack(TABLE_WIDTH);

const STRATEGIES = {
  random: (cups, alive, random) => ai.pickTarget('random', cups, alive, random),
  cluster: (cups, alive, random) => ai.pickTarget('cluster', cups, alive, random),
};

/**
 * Throws `count` balls at a rack with `standingCount` cups left, and returns
 * the share that went in.
 */
function hitRate(strategy, accuracy, standingCount, count, seed) {
  const random = seeded(seed);
  const spread = physics.spreadForAccuracy(accuracy);
  let hits = 0;
  for (let i = 0; i < count; i++) {
    // A rack worn down from the back, the way a game actually wears one down.
    const alive = CUPS.map((_, index) => index >= CUPS.length - standingCount);
    const standing = CUPS.filter((cup) => alive[cup.index]);
    const target = STRATEGIES[strategy](CUPS, alive, random);
    const mouth = physics.cupMouth(target);
    const offset = physics.wobble(spread, random);
    const landing = { x: mouth.x + offset.x, y: mouth.y + offset.y };
    if (physics.resolveLanding(landing, CUPS, alive).hit) hits += 1;
  }
  return hits / count;
}

const THROWS = 20000;
const ACCURACIES = [0.3, 0.45, 0.62, 0.75];

console.log('Trefferquote des Gegners, gemessen (20.000 Würfe je Zelle)\n');
console.log('  Ein volles Rack (10 Becher)');
console.log('  Strategie      ' + ACCURACIES.map((a) => `${a}`.padStart(7)).join(''));
for (const strategy of Object.keys(STRATEGIES)) {
  const row = ACCURACIES.map(
    (a) => `${(hitRate(strategy, a, 10, THROWS, 99) * 100).toFixed(1)}%`.padStart(7)
  ).join('');
  console.log(`  ${strategy.padEnd(14)}${row}`);
}

console.log('\n  Feiner: die Cluster-Strategie über die Genauigkeit');
const FINE = [0.3, 0.4, 0.45, 0.5, 0.55, 0.62];
console.log('  nominal        ' + FINE.map((a) => `${a}`.padStart(7)).join(''));
console.log(
  '  voll (10)     ' +
    FINE.map((a) => `${(hitRate('cluster', a, 10, THROWS, 11) * 100).toFixed(1)}%`.padStart(7)).join('')
);

console.log('\n  Wie es am Ende aussieht (Becher übrig, Genauigkeit 0.62)');
console.log('  Strategie      ' + [10, 6, 3, 2, 1].map((n) => `${n}`.padStart(7)).join(''));
for (const strategy of Object.keys(STRATEGIES)) {
  const row = [10, 6, 3, 2, 1]
    .map((n) => `${(hitRate(strategy, 0.62, n, THROWS, 7) * 100).toFixed(1)}%`.padStart(7))
    .join('');
  console.log(`  ${strategy.padEnd(14)}${row}`);
}

// ---------------------------------------------------------------- matches
//
// Hit rates are only half the story: two balls a turn and balls-back mean a
// good shooter compounds. The number that decides whether a difficulty is fair
// is how often it wins a whole game, so simulate that.

const turnFile = load('turnRules');
const turns = await import(turnFile);

/**
 * Effective accuracy given how many cups are left to aim at.
 *
 * A lone cup is a small target and everybody's rate collapses on it — measured
 * above, from 86% on a full rack to 24% on the last one, whatever the strategy.
 * `focus` is the model of a player concentrating as it gets tight: it buys back
 * some of that, and it is the only lever that changes how a game *ends*.
 */
/** One match. Returns true when the AI won. */
function playMatch(strategy, accuracy, playerRate, random, focus = 0) {
  const alive = { ai: CUPS.map(() => true), player: CUPS.map(() => true) };
  const left = (side) => alive[side].filter(Boolean).length;

  /** The AI throwing at the player's rack. */
  const aiThrow = () => {
    const standing = CUPS.filter((cup) => alive.player[cup.index]);
    if (standing.length === 0) return false;
    const target = STRATEGIES[strategy](CUPS, alive.player, random);
    const mouth = physics.cupMouth(target);
    const spread = physics.spreadForAccuracy(
      ai.effectiveAccuracy(accuracy, focus, standing.length, CUPS.length)
    );
    const offset = physics.wobble(spread, random);
    const outcome = physics.resolveLanding(
      { x: mouth.x + offset.x, y: mouth.y + offset.y },
      CUPS,
      alive.player
    );
    if (outcome.hit && outcome.cupIndex != null) alive.player[outcome.cupIndex] = false;
    return outcome.hit;
  };

  /**
   * The player, through the same physics.
   *
   * A flat hit rate was tried first and it flattered every AI change: it made
   * the player equally good at a lone cup as at a full rack, which nobody is.
   * The measured collapse from 86% to 24% as a rack empties applies to a thumb
   * as much as to an opponent, so the player aims at a cup and strays too. No
   * cluster strategy and no focus — a thumb picks a cup it likes, not the
   * sheltered one.
   */
  const playerThrow = () => {
    const standing = CUPS.filter((cup) => alive.ai[cup.index]);
    if (standing.length === 0) return false;
    const target = standing[Math.floor(random() * standing.length)];
    const mouth = physics.cupMouth(target);
    const offset = physics.wobble(physics.spreadForAccuracy(playerRate), random);
    const outcome = physics.resolveLanding(
      { x: mouth.x + offset.x, y: mouth.y + offset.y },
      CUPS,
      alive.ai
    );
    if (outcome.hit && outcome.cupIndex != null) alive.ai[outcome.cupIndex] = false;
    return outcome.hit;
  };

  let side = random() < 0.5 ? 'ai' : 'player';
  let state = turns.startTurn();
  for (let ball = 0; ball < 400; ball++) {
    const other = side === 'ai' ? 'player' : 'ai';
    if (left(other) === 0) {
      // Redemption, played out at the same rate.
      let redeeming = turns.startTurn(true);
      for (let shot = 0; shot < 40; shot++) {
        const hit = other === 'ai' ? aiThrow() : playerThrow();
        const step = turns.afterThrow(redeeming, hit, left(side));
        redeeming = step.next;
        if (step.outcome === 'eliminated') return side === 'ai';
        if (step.outcome === 'overtime') {
          // Overtime: fresh three-cup racks, and the redeemer throws first.
          for (const who of ['ai', 'player']) {
            alive[who] = CUPS.map((_, index) => index >= CUPS.length - 3);
          }
          side = other;
          state = turns.startTurn();
          break;
        }
      }
      continue;
    }
    const hit = side === 'ai' ? aiThrow() : playerThrow();
    const step = turns.afterThrow(state, hit, left(other));
    state = step.next;
    if (!turns.keepsThrowing(step.outcome)) {
      side = other;
      state = turns.startTurn();
    }
  }
  return false;
}

function winRate(strategy, accuracy, playerRate, matches, seed, focus = 0) {
  const random = seeded(seed);
  let wins = 0;
  for (let i = 0; i < matches; i++) {
    if (playMatch(strategy, accuracy, playerRate, random, focus)) wins += 1;
  }
  return wins / matches;
}

const MATCHES = 3000;
// The band a real swipe lands in: the throw bench measures 81-96% for
// somebody swiping as well as they can, so this is where a difficulty is
// decided — not at 0.35.
const PLAYERS = [0.5, 0.65, 0.8, 0.9];
console.log('\nGanze Spiele: wie oft der Gegner gewinnt (3000 Spiele je Zelle)');
console.log('  Spieler trifft ' + PLAYERS.map((p) => `${p}`.padStart(8)).join(''));
// These mirror AI_PRESETS in lib/competition.ts. Kept as literals rather than
// imported because competition.ts pulls in the whole i18n and store chain, and
// a bench that needs the app booted is a bench nobody runs.
const CANDIDATES = [
  ['vorher: einfach', 'random', 0.3, 0],
  ['vorher: mittel', 'random', 0.45, 0],
  ['vorher: schwer', 'random', 0.62, 0],
  ['—', null, 0, 0],
  ['jetzt: einfach', 'random', 0.3, 0],
  ['jetzt: mittel', 'random', 0.45, 0.08],
  ['jetzt: schwer', 'cluster', 0.62, 0.15],
  ['jetzt: profi', 'cluster', 0.74, 0.24],
  ['—', null, 0, 0],
  // The two levers on their own, which is where the surprise was: aiming well
  // changes single throws and almost nothing else.
  ['nur Zielwahl .62', 'cluster', 0.62, 0],
  ['nur Fokus .62/.20', 'random', 0.62, 0.2],
];
for (const [label, strategy, accuracy, focus] of CANDIDATES) {
  if (!strategy) {
    console.log('');
    continue;
  }
  const row = PLAYERS.map(
    (p) => `${(winRate(strategy, accuracy, p, MATCHES, 4242, focus) * 100).toFixed(0)}%`.padStart(8)
  ).join('');
  console.log(`  ${label.padEnd(22)}${row}`);
}
