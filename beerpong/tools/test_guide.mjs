/**
 * The manual, checked against the app it describes.
 *
 * A guide is the one part of an app that can be wrong without anything
 * breaking, so nobody notices until a player does. Two kinds of wrong are
 * caught here: prose that is missing or half-translated, and numbers that have
 * drifted away from the code.
 *
 * The numbers the guide interpolates take care of themselves — they are the
 * constants. The ones written out in a sentence are the risk, so those are read
 * back out of the source they belong to and compared.
 *
 * Run with: node tools/test_guide.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'guide-'));
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
for (const name of [
  'arcadeLayout',
  'cupGeometry',
  'cupSkins',
  'catalogue',
  'competition',
  'entitlement',
  'highlightsShared',
  'licence',
  'luckyShot',
  'turnRules',
  'i18n',
  'languages',
  'opponentAi',
  'progression',
]) {
  try {
    load(name);
  } catch {
    // Only the ones the guide imports have to resolve; the rest are along for
    // the ride because of how the import graph fans out.
  }
}
const { GUIDE, GUIDE_ITEM_COUNT } = await import(load('guide'));

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('guide');

check('every chapter is complete', () => {
  assert.ok(GUIDE.length >= 8, `only ${GUIDE.length} chapters`);
  for (const chapter of GUIDE) {
    assert.ok(chapter.id && chapter.icon, JSON.stringify(chapter.id));
    for (const field of ['de', 'en']) {
      assert.ok(chapter[field]?.length > 0, `${chapter.id} title ${field}`);
      assert.ok(chapter.summary[field]?.length > 0, `${chapter.id} summary ${field}`);
    }
    assert.ok(chapter.items.length > 0, `${chapter.id} has no items`);
  }
});

check('every section says something in both languages', () => {
  for (const chapter of GUIDE) {
    for (const item of chapter.items) {
      for (const field of ['de', 'en']) {
        assert.ok(item[field]?.length > 2, `${chapter.id}: heading ${field}`);
        assert.ok(item.body[field]?.length > 40, `${chapter.id}/${item.de}: body ${field} too short`);
      }
      // A body identical in both languages is a forgotten translation, not a
      // coincidence — these are sentences, not labels.
      assert.notEqual(
        item.body.de,
        item.body.en,
        `${chapter.id}/${item.de} is the same text twice`
      );
    }
  }
});

check('the one piece of markup is balanced', () => {
  for (const chapter of GUIDE) {
    for (const item of chapter.items) {
      for (const field of ['de', 'en']) {
        const stars = (item.body[field].match(/\*\*/g) ?? []).length;
        assert.equal(stars % 2, 0, `${chapter.id}/${item.de} (${field}) has an unclosed **`);
      }
    }
  }
});

check('nothing is left as a placeholder', () => {
  for (const chapter of GUIDE) {
    for (const item of chapter.items) {
      for (const text of [item.de, item.en, item.body.de, item.body.en]) {
        // Not "XXX": the guide legitimately shows the shape of a code as
        // BP-XXXX-XXXX-XXXX, which is the format people have to recognise.
        assert.ok(!/TODO|TBD|\{[a-z]+\}/i.test(text), `${chapter.id}: ${text.slice(0, 60)}`);
      }
    }
  }
});

check('it covers every part of the app', () => {
  // Not a spell check: this is the list of things a new player has to be told
  // about, and a chapter quietly dropped is the failure this catches.
  const all = GUIDE.flatMap((chapter) => [
    chapter.de,
    chapter.summary.de,
    ...chapter.items.flatMap((item) => [item.de, item.body.de]),
  ])
    .join(' ')
    .toLowerCase();
  for (const topic of [
    'kamera',
    'arcade',
    'bounce',
    're-rack',
    'house rules',
    'highlight',
    'online',
    'division',
    'weekend',
    'lucky shot',
    'coins',
    'spielstand',
    'stripe',
    'becher-design',
    'turnier',
    'pass & play',
    'sprache',
  ]) {
    assert.ok(all.includes(topic), `nothing in the guide mentions "${topic}"`);
  }
});

console.log('numbers that also live in the code');

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const guideText = GUIDE.flatMap((chapter) =>
  chapter.items.map((item) => item.body.de)
).join(' ');

check('the coins per hit, throw, win and loss are the ones paid out', () => {
  const store = source('../lib/store.ts');
  const perThrow = store.match(/coins: s\.coins \+ \(hit \? (\d+) : (\d+)\)/);
  const perMatch = store.match(/coins: s\.coins \+ \(won \? (\d+) : (\d+)\)/);
  assert.ok(perThrow && perMatch, 'could not read the coin rewards out of the store');
  const [, hit, throwCoins] = perThrow;
  const [, win, loss] = perMatch;
  assert.ok(
    guideText.includes(`${hit} Coins`),
    `the guide should say ${hit} coins a hit`
  );
  for (const [what, value] of [['throw', throwCoins], ['win', win], ['loss', loss]]) {
    assert.ok(guideText.includes(value), `the guide never mentions ${value} (${what})`);
  }
});

check('the XP per hit is the one awarded', () => {
  const store = source('../lib/store.ts');
  const xp = store.match(/careerXP: s\.arcade\.careerXP \+ \(hit \? (\d+) : (\d+)\)/);
  assert.ok(xp, 'could not read the XP out of the store');
  assert.ok(guideText.includes(`${xp[1]} XP`), `the guide should say ${xp[1]} XP a hit`);
});

check('the sampling interval is the one the detector runs at', () => {
  const detect = source('../components/camera/AutoDetect.tsx');
  const ms = detect.match(/SAMPLE_INTERVAL_MS\s*=\s*(\d+)/);
  assert.ok(ms, 'could not read SAMPLE_INTERVAL_MS out of AutoDetect');
  const interval = ms[1];
  assert.ok(
    guideText.includes(`${interval} ms`),
    `the guide says a different interval than the ${interval} ms in AutoDetect`
  );
});

check('the camera height is the one the bench arrived at', () => {
  const bench = source('./bench_camera_angle.mjs');
  assert.ok(bench.includes('80'), 'the angle bench no longer mentions 80cm');
  assert.ok(guideText.includes('80 cm'), 'the guide should name the measured height');
});

console.log(`\n${passed} checks passed, ${GUIDE.length} chapters, ${GUIDE_ITEM_COUNT} sections`);
