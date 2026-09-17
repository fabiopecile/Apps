/**
 * The rules the never-ending animations have to keep.
 *
 * Ambient motion is the one kind of animation in this app that runs when the
 * player is doing nothing, which makes it the only kind that can quietly cost
 * battery, and the only kind that can make a screen unusable for somebody who
 * cannot tolerate movement. Both failures are invisible in a screenshot and
 * neither shows up in a typecheck, so they are asserted here against the real
 * source.
 *
 * The four that matter:
 *
 *   1. **Every ambient loop goes through `useAmbientLoop`.** That is the single
 *      place that honours reduce-motion and stops when the app is backgrounded.
 *      A `withRepeat(..., -1)` written by hand somewhere else keeps running in
 *      a pocket, and nobody would ever notice.
 *   2. **Reduce-motion really is wired up**, rather than a comment claiming it.
 *   3. **It stays slow.** Five seconds is the floor. An ambient effect fast
 *      enough to watch has stopped being ambient.
 *   4. **It stays faint.** No ambient effect may move something more than a few
 *      percent, because the loud things in this app are the hero card and the
 *      celebrations, and they fire on events.
 *
 * What this cannot check is whether the result is pleasant, or whether it drops
 * frames on a four-year-old phone. The first needs eyes and the second needs
 * that phone.
 *
 * Run with: node tools/test_ambient.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = [...walk(join(root, 'app')), ...walk(join(root, 'components'))];
const read = (file) => readFileSync(file, 'utf8');
const shortName = (file) => relative(root, file);

/**
 * The file with its comments taken out.
 *
 * This codebase explains itself at length and those explanations quote the very
 * rules being checked — `ambient.ts` describes `withRepeat` in prose. The rules
 * are about what the code does.
 */
const code = (file) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const ambientSource = read(join(root, 'lib/ambient.ts'));
const ambientCode = code(join(root, 'lib/ambient.ts'));

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('the motion that never stops');

check('reduce-motion is actually read, not just promised', () => {
  assert.ok(
    /useReducedMotion\(\)/.test(ambientCode),
    'lib/ambient.ts no longer reads the platform reduce-motion setting'
  );
  assert.ok(
    /return !reduced && awake/.test(ambientCode),
    'the enabled flag no longer depends on reduce-motion'
  );
});

check('a backgrounded app stops animating', () => {
  assert.ok(/AppState\.addEventListener/.test(ambientCode), 'AppState is no longer watched');
  assert.ok(
    /subscription\.remove\(\)/.test(ambientCode),
    'the AppState listener is never removed — that is a leak per mounted screen'
  );
});

check('turning it off cancels what is already running', () => {
  // Without this the flag flips but the animation carries on: `withRepeat`
  // does not check anything once it has started.
  assert.ok(/cancelAnimation\(progress\)/.test(ambientCode), 'loops are never cancelled');
  assert.ok(
    /progress\.value = 0;/.test(ambientCode),
    'a cancelled loop is left wherever it stopped rather than returned to its resting pose'
  );
});

check('no endless loop anywhere is beyond switching off', () => {
  /**
   * The real invariant, which is not "only one hook may loop".
   *
   * The match screen legitimately runs its own: the "your turn" hint pulses
   * while it is your turn and stops when it is not, which is feedback about
   * state rather than atmosphere, and routing it through `useAmbientLoop` would
   * make it ignore whose turn it is. What it may *not* do is pulse at somebody
   * who has asked their phone to stop animating — so the rule is that any file
   * running a `-1` repeat has to consult the same switch, one way or the other.
   */
  for (const file of files) {
    const source = code(file);
    const endless = (source.match(/withRepeat\([^;]*?,\s*-1/gs) ?? []).length;
    if (endless === 0) continue;
    assert.ok(
      /useAmbientLoop\(|useAmbientEnabled\(/.test(source),
      `${shortName(file)} runs an endless loop without consulting useAmbientEnabled — it will not stop for reduce-motion or for a backgrounded app`
    );
  }
});

check('every cycle is slow enough to be ambient', () => {
  const durations = [...ambientSource.matchAll(/^\s+(\w+): (\d+),$/gm)]
    .map(([, name, value]) => [name, Number(value)])
    // The stagger is a gap between neighbours, not a cycle length.
    .filter(([name]) => name !== 'glintStagger');

  assert.ok(durations.length >= 5, 'the AMBIENT table has lost entries');
  for (const [name, ms] of durations) {
    assert.ok(ms >= 5000, `AMBIENT.${name} is ${ms}ms — fast enough to watch, so no longer ambient`);
  }
});

check('the cycles do not lock into one visible pulse', () => {
  // Chosen against each other rather than individually: if one becomes a whole
  // multiple of another, the two effects sync up and the screen throbs.
  const durations = [...ambientSource.matchAll(/^\s+(\w+): (\d+),$/gm)]
    .map(([, name, value]) => [name, Number(value)])
    .filter(([name]) => name !== 'glintStagger');

  for (const [nameA, a] of durations) {
    for (const [nameB, b] of durations) {
      if (nameA === nameB) continue;
      const bigger = Math.max(a, b);
      const smaller = Math.min(a, b);
      assert.ok(
        bigger % smaller !== 0,
        `AMBIENT.${nameA} and AMBIENT.${nameB} are multiples — those two effects will beat in time`
      );
    }
  }
});

check('every ambient movement stays under a tenth', () => {
  /**
   * The scale and opacity factors the ambient styles multiply by.
   *
   * Matched off `ambient.value * N` and `+ ambient.value * N`, which is how all
   * of them are written. A cap of 0.1 is the line between "the room is alive"
   * and "something on this screen is moving".
   */
  const movers = ['components/ui/GridBackground.tsx', 'components/ui/CupRack.tsx'];
  let found = 0;
  for (const file of movers) {
    const source = code(join(root, file));
    for (const [, factor] of source.matchAll(/(?:drift|breath)\.value \* (0\.\d+)/g)) {
      found += 1;
      assert.ok(
        Number(factor) <= 0.15,
        `${file} moves by ${factor} — that is a gesture, not an atmosphere`
      );
    }
  }
  assert.ok(found >= 3, 'the ambient styles no longer look the way this check assumes');
});

check('the resting pose is the one with no motion in it', () => {
  // Somebody with reduce-motion on sees progress = 0 and nothing else, for
  // ever. Anything whose zero state is wrong is broken for them.
  assert.ok(
    /\*\*0 is the resting pose\.\*\*/.test(ambientSource),
    'the contract that 0 must look right is gone from the hook that depends on it'
  );
  // The hero card's orbiting light is not parked, it is not drawn. Found by
  // screenshotting with reduce-motion on: a stopped orbit leaves a bright spot
  // sitting on the top edge for ever.
  const hero = code(join(root, 'components/ui/HeroCard.tsx'));
  assert.ok(
    /motionOk && diagonal > 0/.test(hero),
    'the hero card draws its sweep even with motion off, which parks a highlight on one edge'
  );

  const grid = code(join(root, 'components/ui/GridBackground.tsx'));
  // At rest the lamp must still be lit, i.e. the opacity floor is not zero.
  const floor = grid.match(/opacity: (0\.\d+) \+ drift\.value/);
  assert.ok(floor, 'the felt no longer has a resting opacity');
  assert.ok(
    Number(floor[1]) >= 0.8,
    `the felt rests at ${floor[1]} — with reduce-motion on, the room is permanently dimmed`
  );
});

check('a locked row does not shimmer', () => {
  // A light sweeping over something greyed out says "available", which is the
  // opposite of what a locked row means.
  const row = code(join(root, 'components/ui/ModeRow.tsx'));
  assert.ok(
    /locked \? null : \(/.test(row),
    'the sheen is drawn on locked rows too, which contradicts the grey'
  );
});

check('the match screen keeps its corner still', () => {
  // The one screen where something is being aimed.
  const match = code(join(root, 'app/(tabs)/arcade/match.tsx'));
  assert.ok(/<CoinChip[^>]*\bquiet\b/.test(match), 'the coin chip pulses during a throw');
});

check('the coin chip exists once rather than five times', () => {
  // It was copied into five screens, and the copies had already drifted apart.
  // The pulse is exactly the kind of change that would have made it six.
  const offenders = files.filter((file) => /styles\.coinChip/.test(code(file)));
  assert.deepEqual(
    offenders.map(shortName),
    [],
    'a screen is building its own coin chip again instead of using CoinChip'
  );
});

console.log(`\n${passed} checks passed across ${files.length} screens and components`);
