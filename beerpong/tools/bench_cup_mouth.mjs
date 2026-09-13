/**
 * How big a cup is to score against, compared with how big it looks.
 *
 * Written for a complaint that turned out to be exactly right: with Bounce ×2
 * armed, balls counted that had plainly not gone in. The bounce only made it
 * visible — it flies flat and slow, so you can watch where it is going, where
 * a lobbed ball drops out of the sky and is over before you can judge it.
 *
 * The numbers underneath:
 *
 *   drawn cup, outer rim      23.0 table points
 *   drawn cup, inside the rim 22.0
 *   ball                      12.5 radius
 *   fully over the hole at     9.5   (inside radius minus the ball)
 *   touching the cup at       35.5   (outer radius plus the ball)
 *
 * A ball was counted in at **23.9** — further out than the drawn rim, with a
 * ball that wide meaning most of it beside the cup. Landing next to a cup
 * scored, and so did throwing up the middle of the table without aiming at
 * anything, because ten catching circles that wide overlap into one target.
 *
 * This prints where the line sits now and what it costs. The point was never
 * to make the game harder: it is that what counts and what you watch should be
 * the same thing, so the scatter and the help for strength were re-measured
 * against the new target until a swipe pointed at a cup scored as often as it
 * used to.
 *
 * Run with: node tools/bench_cup_mouth.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'mouth-'));
const load = (name) => {
  const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  const js = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/from ['"]\.\/(\w+)['"]/g, "from './$1.mjs'");
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, js);
  return file;
};
load('arcadeLayout');
load('cupGeometry');
const { CUP_COUNT, TABLE_WIDTH_REFERENCE, generateOpponentRack } = await import(
  load('arcadeLayout')
);
const { cupMouth, resolveLanding, spreadFor, wobble } = await import(load('throwPhysics'));

/**
 * The catching radius the module actually uses, found by walking outwards
 * rather than by restating a constant — a copy here would go stale the first
 * time the cup or the ball changed size.
 */
const IN_SHARE = (() => {
  const probe = generateOpponentRack(TABLE_WIDTH_REFERENCE, CUP_COUNT);
  const only = probe.map((_, i) => i === 0);
  const mouth = cupMouth(probe[0]);
  for (let step = 0; step <= 200; step++) {
    const d = (step / 200) * 2;
    if (!resolveLanding({ x: mouth.x + mouth.rx * d, y: mouth.y }, probe, only).hit) return d;
  }
  return 2;
})();

const rack = generateOpponentRack(TABLE_WIDTH_REFERENCE, CUP_COUNT);
const alive = Array(CUP_COUNT).fill(true);

/** A predictable stream, so two runs of this say the same thing. */
function rng(seed) {
  let state = seed;
  return () => ((state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/**
 * Throws at the rack and reports how far off centre they came down.
 *
 * Aimed at the cup's mouth, which is what both the player's assist and the
 * opponent do, so the only thing between the aim and the cup is the hand.
 */
function distances(spread, throws, seed) {
  const random = rng(seed);
  const out = [];
  for (let i = 0; i < throws; i++) {
    const target = rack[Math.floor(random() * rack.length)];
    const mouth = cupMouth(target);
    const offset = wobble(spread, random);
    // The depth wobble is damped in the real throw; mirrored here.
    const landing = { x: mouth.x + offset.x, y: mouth.y + offset.y * 0.6 };
    let nearest = Infinity;
    for (const cup of rack) {
      if (!alive[cup.index]) continue;
      const m = cupMouth(cup);
      nearest = Math.min(nearest, Math.hypot(landing.x - m.x, landing.y - m.y));
    }
    out.push(nearest);
  }
  return out;
}

const share = (list, radius) => list.filter((d) => d <= radius).length / list.length;
const pct = (value) => `${(value * 100).toFixed(1)}%`;

const THROWS = 40000;
/** What used to count as in, and what does now — both in table points. */
const OLD_IN = 23.9;
const NOW_IN = cupMouth(rack[0]).rx * IN_SHARE;

console.log('Wie oft ein Wurf zählt — 40.000 Würfe je Zeile\n');
console.log(`  drin ab ${NOW_IN.toFixed(1)} Punkten statt ${OLD_IN} — die Mündung ist jetzt der Becher\n`);
console.log('  Wurf                     Streuung   zählte früher   zählt jetzt');
const cases = [
  ['Spieler, normal', spreadFor(0.55, 0.5, false)],
  ['Spieler, Bounce ×2', spreadFor(0.55, 0.5, true)],
  ['Gegner, mittel', spreadFor(0.5, 0.5, false)],
];
for (const [name, spread] of cases) {
  const list = distances(spread, THROWS, 4242);
  console.log(
    `  ${name.padEnd(24)} ${spread.toFixed(1).padStart(6)}   ${pct(share(list, OLD_IN)).padStart(11)}   ${pct(
      share(list, NOW_IN)
    ).padStart(9)}`
  );
}

// What the scatter has to become for an honest target to score as often as the
// generous one does today. The wobble scales linearly, so this is a search over
// one number rather than a derivation.
console.log('\nWelche Streuung hielte die alte Quote gegen die neue Mündung?\n');
for (const [name, spread] of cases) {
  const target = share(distances(spread, THROWS, 4242), OLD_IN);
  let lo = 1;
  let hi = spread;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const rate = share(distances(mid, THROWS, 4242), NOW_IN);
    if (rate > target) lo = mid;
    else hi = mid;
  }
  const found = (lo + hi) / 2;
  console.log(
    `  ${name.padEnd(24)} ${spread.toFixed(1).padStart(6)} → ${found.toFixed(1).padStart(5)}   (Faktor ${(
      found / spread
    ).toFixed(2)}, Quote ${pct(share(distances(found, THROWS, 4242), NOW_IN))})`
  );
}
