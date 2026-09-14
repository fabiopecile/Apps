/**
 * Telling your own rack from theirs.
 *
 * One rule, and it beats everything: at a glance, which of those two triangles
 * is yours. It was broken and nobody noticed for months, because it only breaks
 * for *some* opponents — the easy computer and division 7 are painted the exact
 * same neon as the player, and division 6 is a shade off. Play those and both
 * ends of the table are the same green.
 *
 * The reason it survived so long is that nothing failed. Every test passed,
 * every screenshot was taken against an opponent that happened to be gold. It
 * took somebody photographing their own screen on Einfach.
 *
 * So this walks the whole palette — every difficulty, every division — and
 * asserts the far rack never comes out near the near one.
 *
 * Run with: node tools/test_rack_colour.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'rack-'));
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
for (const name of ['i18n', 'languages', 'opponentAi']) {
  try {
    load(name);
  } catch {
    // Only what competition.ts imports has to resolve.
  }
}
const c = await import(load('competition'));

/** The one the player's cups are painted, from theme/colors.ts. */
const PLAYER = '#39FF14';

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('the two racks');

check('the player colour here is still the one the theme uses', () => {
  // This file hard-codes it, so it has to be the same one — otherwise the
  // whole check drifts quietly out of being about anything.
  const theme = readFileSync(new URL('../theme/colors.ts', import.meta.url), 'utf8');
  const neon = theme.match(/neon:\s*'(#[0-9A-Fa-f]{6})'/);
  assert.ok(neon, 'could not find the neon colour in the theme');
  assert.equal(neon[1].toUpperCase(), PLAYER);
});

check('no difficulty leaves both racks the same colour', () => {
  for (const preset of Object.values(c.AI_PRESETS)) {
    const painted = c.opponentRackColour(preset.color);
    assert.ok(
      c.colourDistance(painted, PLAYER) >= c.RACK_COLOUR_MIN_DISTANCE,
      `${preset.id} paints the far rack ${painted}, which is the player's own`
    );
  }
});

check('and no division does either', () => {
  for (const division of c.ALL_DIVISIONS) {
    const painted = c.opponentRackColour(division.color);
    assert.ok(
      c.colourDistance(painted, PLAYER) >= c.RACK_COLOUR_MIN_DISTANCE,
      `division ${division.id} paints the far rack ${painted}`
    );
  }
});

check('the ones that were already fine are left alone', () => {
  // The substitution is a repair, not a repaint. An opponent whose colour
  // already reads as another team keeps it, or every match looks the same.
  for (const [name, colour] of [
    ['mittel', '#FFC94A'],
    ['schwer', '#FF3B4E'],
    ['profi', '#7C4DFF'],
    ['division 10', '#9BA39B'],
    ['division 8', '#3FD8FF'],
  ]) {
    assert.equal(c.opponentRackColour(colour), colour, `${name} was repainted needlessly`);
  }
});

check('the ones that were broken really are replaced', () => {
  // Named outright, so a future palette change that reintroduces one of these
  // fails here rather than shipping.
  for (const [name, colour] of [
    ['the easy computer', '#39FF14'],
    ['division 7', '#39FF14'],
    ['division 6', '#00FF66'],
  ]) {
    assert.notEqual(c.opponentRackColour(colour), colour, `${name} is still the player's green`);
  }
});

check('the distance is symmetric and zero for a colour against itself', () => {
  assert.equal(c.colourDistance(PLAYER, PLAYER), 0);
  assert.equal(
    Math.round(c.colourDistance('#FFC94A', PLAYER)),
    Math.round(c.colourDistance(PLAYER, '#FFC94A'))
  );
});

check('the weighting leaves more room for the threshold than plain RGB', () => {
  // This is the entire reason the channels are weighted, and the first version
  // of this check asserted the opposite and failed — which was the test doing
  // its job on the comment above it.
  //
  // What has to hold is that there is a gap to put a threshold in: the worst
  // colour that must be replaced on one side, the nearest colour that must be
  // kept on the other. Both metrics order them the same way; the weighted one
  // leaves twice the space between.
  const plain = (a, b) => {
    const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y, z] = ch(a);
    const [p, q, r] = ch(b);
    return Math.sqrt((x - p) ** 2 + (y - q) ** 2 + (z - r) ** 2);
  };
  const worstToReplace = '#00FF66'; // division 6, the near-miss green
  const nearestToKeep = '#9BA39B'; // division 10's grey

  const plainGap = plain(nearestToKeep, PLAYER) - plain(worstToReplace, PLAYER);
  const weightedGap =
    c.colourDistance(nearestToKeep, PLAYER) - c.colourDistance(worstToReplace, PLAYER);
  assert.ok(plainGap > 0, 'plain RGB does not even order them correctly');
  assert.ok(
    weightedGap > plainGap * 1.8,
    `the weighting bought only ${Math.round(weightedGap)} points against ${Math.round(plainGap)}`
  );

  // And the threshold actually sits inside that gap, rather than on an edge.
  assert.ok(c.RACK_COLOUR_MIN_DISTANCE > c.colourDistance(worstToReplace, PLAYER));
  assert.ok(c.RACK_COLOUR_MIN_DISTANCE < c.colourDistance(nearestToKeep, PLAYER));
});

console.log(`\n${passed} checks passed`);
