/**
 * The design rules, as rules rather than as taste.
 *
 * A redesign is the easiest thing in a codebase to undo by accident. Nobody
 * ever decides to go back; it happens one card at a time, each of which
 * genuinely deserved a little emphasis, and a year later every card glows again
 * and the screen has no first thing to look at. That is exactly how the hub got
 * to ten cards in six colours.
 *
 * So the two load-bearing rules are asserted here against the real source:
 *
 *   1. **At most one `hero` per screen.** The loud element is the answer to
 *      "what do I do now", and a screen with two answers has a content problem
 *      rather than a styling one.
 *   2. **Buttons do not glow.** A solid neon fill on a near-black screen is
 *      already the loudest thing on it. This was the single biggest source of
 *      noise in the old app — every button on every screen had a halo.
 *
 * Plus the smaller ones that keep the palette honest: the semantic names exist,
 * nothing reaches past them for a raw hex where a role exists, and `locked` is
 * a grey rather than a dimmed colour.
 *
 * What this cannot check is whether the result looks good. Nothing can; that is
 * what the screenshots in the design canvas were for. It checks that the rules
 * the look was built on are still being followed.
 *
 * Run with: node tools/test_design.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Every .tsx under app/ and components/, which is every screen and widget. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}
const files = [...walk(join(root, 'app')), ...walk(join(root, 'components'))];
const read = (file) => readFileSync(file, 'utf8');
const shortName = (file) => relative(root, file);

/**
 * The file with its comments taken out.
 *
 * Needed because this codebase explains itself at length, and the rules below
 * are quoted in those explanations — `HeroCard.tsx` says "the only element
 * permitted `glow('hero')`" in its own doc comment, which a naive count reads
 * as a second hero. The rule is about what the code does.
 */
const code = (file) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('one loud thing per screen');

check('the glow scale still has the roles the rules are written in', () => {
  const source = read(join(root, 'theme/glow.ts'));
  for (const role of ['hero', 'lift', 'none']) {
    assert.ok(new RegExp(`\\b${role}:`).test(source), `the "${role}" level is gone`);
  }
});

check('no file asks for more than one hero', () => {
  // The rule the whole redesign rests on. `HeroCard` is the one component that
  // may carry it, and a screen may hold one of those.
  for (const file of files) {
    const source = code(file);
    const heroes = (source.match(/glow\(\s*['"]hero['"]/g) ?? []).length;
    assert.ok(
      heroes <= 1,
      `${shortName(file)} asks for ${heroes} hero glows — a screen has one answer to "what now"`
    );
  }
});

check('and no screen mounts two HeroCards', () => {
  for (const file of files) {
    const source = code(file);
    const mounts = (source.match(/<HeroCard\b/g) ?? []).length;
    assert.ok(mounts <= 1, `${shortName(file)} mounts ${mounts} HeroCards`);
  }
});

check('the retired glow names really were retuned, not just renamed', () => {
  // If somebody "restores" the old values, every one of the three dozen
  // remaining call sites goes loud again at once and the app is back where it
  // started. The numbers matter more than the names.
  const source = read(join(root, 'theme/glow.ts'));
  const levels = [...source.matchAll(/(\w+):\s*\{\s*radius:\s*([\d.]+),\s*opacity:\s*([\d.]+)/g)];
  const byName = Object.fromEntries(levels.map((m) => [m[1], { radius: +m[2], opacity: +m[3] }]));
  for (const name of ['soft', 'medium', 'lift']) {
    assert.ok(byName[name], `the "${name}" level is missing`);
    assert.ok(
      byName[name].opacity <= 0.2,
      `"${name}" is back up to ${byName[name].opacity} — it is on three dozen call sites`
    );
  }
  assert.ok(byName.hero.opacity > byName.lift.opacity, 'the hero is no louder than a lift');
});

check('the web glow has no spread', () => {
  // The bug that made the first attempt look like a light leak: CSS spread is
  // a band of flat colour before the blur starts, and at the hero radius that
  // was a 13px ring of solid green around the card.
  const source = read(join(root, 'theme/glow.ts'));
  const box = source.match(/boxShadow: `([^`]+)`/);
  assert.ok(box, 'the web boxShadow is gone');
  assert.ok(
    /0 0 \$\{level\.radius\}px 0 /.test(box[1]),
    `the spread is back: ${box[1]}`
  );
});

console.log('\nbuttons');

check('GlowButton does not glow', () => {
  // The name is a leftover and that is fine; the behaviour is the point.
  const source = code(join(root, 'components/ui/GlowButton.tsx'));
  assert.ok(!/\bglow\(/.test(source), 'GlowButton calls glow() again');
});

check('and it still presses in', () => {
  // The halo used to carry the press feedback. Removing it without replacing
  // the feel would have made every button in the app feel dead.
  const source = read(join(root, 'components/ui/GlowButton.tsx'));
  assert.ok(/withSpring\(0\.9\d/.test(source), 'the press-in scale is gone');
});

console.log('\ncolour means something');

check('the semantic names exist', () => {
  const source = read(join(root, 'theme/colors.ts'));
  for (const token of ['you', 'rival', 'reward', 'locked']) {
    assert.ok(new RegExp(`^\\s+${token}:`, 'm').test(source), `colors.${token} is gone`);
  }
});

check('locked is a grey, not a dimmed colour', () => {
  // The whole point of the token: "not yet" has one look, and it is never a
  // faded version of the thing it is withholding.
  const source = read(join(root, 'theme/colors.ts'));
  const locked = source.match(/^\s+locked: '(#[0-9A-Fa-f]{6})'/m);
  assert.ok(locked, 'colors.locked is not a plain hex any more');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(locked[1].slice(i, i + 2), 16));
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  assert.ok(spread < 24, `colors.locked has a ${spread}-point hue in it — it should read as grey`);
});

check('danger and rival are different colours', () => {
  // A lost match and a failed payment must not look the same.
  const source = read(join(root, 'theme/colors.ts'));
  const value = (name) => source.match(new RegExp(`^\\s+${name}: '(#[0-9A-Fa-f]{6})'`, 'm'))?.[1];
  assert.notEqual(value('rival'), value('danger'));
});

check('the reward colour is the only gold, and prices use it', () => {
  // Checked on the one screen that sells things for coins, because that is
  // where green-for-a-price was actually wrong on screen.
  // Each <GlowButton …/> taken whole, rather than a fixed number of characters
  // after the label: the first version of this check used a 220-character
  // window and broke the moment somebody wrote a comment inside the element,
  // which is a test failing for a reason that has nothing to do with the rule.
  const source = code(join(root, 'app/(tabs)/arcade/skins.tsx'));
  const buttons = source
    .split('<GlowButton')
    .slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf('/>')));
  const buys = buttons.filter((button) => button.includes("t('skins.buy'"));
  assert.ok(buys.length >= 2, `expected the ball and cup buy buttons, found ${buys.length}`);
  for (const button of buys) {
    assert.ok(
      /accent=\{[^}]*colors\.reward/.test(button),
      'a price is not painted with the reward colour'
    );
  }
});

console.log('\nthe background');

check('the grid is gone', () => {
  // It fought every card laid on it. If it comes back, so does that.
  const source = code(join(root, 'components/ui/GridBackground.tsx'));
  assert.ok(!/from 'react-native-svg'/.test(source), 'the SVG grid lines are back');
  assert.ok(/LinearGradient/.test(source), 'the felt gradient is gone');
});

check('the felt stays weak enough to lay a card on', () => {
  const source = read(join(root, 'theme/colors.ts'));
  const felt = source.match(/feltGlow: 'rgba\(\s*\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)'/);
  assert.ok(felt, 'the felt colour is gone');
  assert.ok(
    Number(felt[1]) <= 0.35,
    `the felt is back up to ${felt[1]} — the top third of every screen goes green`
  );
});

console.log('\nthe hub, which is what started this');

check('it has one hero and the rest are rows', () => {
  const source = code(join(root, 'app/(tabs)/arcade/index.tsx'));
  assert.equal((source.match(/<HeroCard\b/g) ?? []).length, 1);
  assert.ok((source.match(/<ModeRow\b/g) ?? []).length >= 6, 'the modes are not rows any more');
  // The old component took a per-card accent and glowed with it. Its absence
  // is what stops the light show coming back.
  assert.ok(!/<ModeCard\b/.test(source), 'ModeCard is back on the hub');
});

check('the rows do not each pick their own colour', () => {
  // A ModeRow may take an accent, but it should be a semantic one and most
  // rows should not pass one at all.
  const source = code(join(root, 'app/(tabs)/arcade/index.tsx'));
  const accents = [...source.matchAll(/accent=\{([^}]+)\}/g)].map((m) => m[1]);
  for (const accent of accents) {
    assert.ok(
      /colors\.(you|rival|reward|locked)/.test(accent),
      `the hub passes a non-semantic accent: ${accent.trim()}`
    );
  }
});

console.log(`\n${passed} checks passed across ${files.length} screens and components`);
