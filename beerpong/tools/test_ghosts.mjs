/**
 * Opponents built from real games, and the claim that decides whether they are
 * honest.
 *
 * The screen tells the player their friend's ghost throws like their friend.
 * That is a claim about a measurement, so it has to hold: the numbers have to
 * come from games that happened, two evenings under one name have to be one
 * person, and — the reason for the minimum — the rate has to have settled
 * before anything is built on it.
 *
 * That last one is measured here rather than asserted. A simulated 30% shooter
 * is walked through a long run and the spread of the running rate is printed at
 * each length, which is what the threshold is set from.
 *
 * Run with: node tools/test_ghosts.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'ghosts-'));
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
const g = await import(load('ghosts'));

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

const side = (name, hits, throws, bestStreak = 0) => ({ name, hits, throws, bestStreak });

console.log('keeping the record');

check('a finished game puts both teams in', () => {
  const after = g.foldGame([], [side('Lena', 7, 20), side('Milo', 4, 18)], 1000);
  assert.equal(after.length, 2);
  assert.deepEqual(
    after.map((x) => x.name).sort(),
    ['Lena', 'Milo']
  );
  assert.equal(g.findGhost(after, 'Lena').hits, 7);
});

check('a second game adds to the first rather than replacing it', () => {
  let ghosts = g.foldGame([], [side('Lena', 7, 20)], 1000);
  ghosts = g.foldGame(ghosts, [side('Lena', 5, 16)], 2000);
  const lena = g.findGhost(ghosts, 'Lena');
  assert.equal(ghosts.length, 1);
  assert.equal(lena.hits, 12);
  assert.equal(lena.throws, 36);
  assert.equal(lena.games, 2);
  assert.equal(lena.lastAt, 2000);
});

check('the same person spelled differently is still one person', () => {
  // Two half-ghosts of somebody are worse than one, and a name typed at a party
  // on a Saturday will not be capitalised the same way the next weekend.
  let ghosts = g.foldGame([], [side('Lena', 7, 20)], 1000);
  ghosts = g.foldGame(ghosts, [side('  lena ', 5, 16)], 2000);
  assert.equal(ghosts.length, 1);
  assert.equal(g.findGhost(ghosts, 'LENA').throws, 36);
  // And the spelling shown is the most recent one, trimmed.
  assert.equal(ghosts[0].name, 'lena');
});

check('the best run is the best of them, not the latest', () => {
  let ghosts = g.foldGame([], [side('Lena', 7, 20, 5)], 1000);
  ghosts = g.foldGame(ghosts, [side('Lena', 5, 16, 2)], 2000);
  assert.equal(g.findGhost(ghosts, 'Lena').bestStreak, 5);
});

check('a team that never threw, or was never named, is not a person', () => {
  const after = g.foldGame([], [side('', 0, 8), side('   ', 2, 5), side('Milo', 0, 0)], 1000);
  assert.equal(after.length, 0);
});

check('only the last dozen are kept, newest first', () => {
  let ghosts = [];
  for (let i = 0; i < g.GHOST_LIMIT + 5; i++) {
    ghosts = g.foldGame(ghosts, [side(`P${i}`, 5, 20)], 1000 + i);
  }
  assert.equal(ghosts.length, g.GHOST_LIMIT);
  assert.equal(ghosts[0].name, `P${g.GHOST_LIMIT + 4}`, 'newest is not first');
  assert.equal(g.findGhost(ghosts, 'P0'), null, 'the oldest should have fallen off');
});

console.log('how they throw');

check('the rate is theirs, not rounded to a preset', () => {
  // Rounding to the nearest difficulty would make every ghost one of three
  // opponents with different names on them, which is the whole thing this is
  // not supposed to be.
  const a = g.ghostSkill({ name: 'a', hits: 9, throws: 20, bestStreak: 0, games: 1, lastAt: 0 });
  const b = g.ghostSkill({ name: 'b', hits: 10, throws: 20, bestStreak: 0, games: 1, lastAt: 0 });
  assert.equal(a.accuracy, 0.45);
  assert.equal(b.accuracy, 0.5);
  assert.notEqual(a.accuracy, b.accuracy);
});

check('a perfect or hopeless record is still a playable opponent', () => {
  const none = g.ghostSkill({ name: 'n', hits: 0, throws: 30, bestStreak: 0, games: 2, lastAt: 0 });
  const all = g.ghostSkill({ name: 'a', hits: 30, throws: 30, bestStreak: 30, games: 2, lastAt: 0 });
  // Zero would be an opponent who cannot take a single cup, which is not a
  // game; one is not something a person has done over twenty throws.
  assert.ok(none.accuracy > 0, 'a scoreless ghost cannot throw at all');
  assert.ok(all.accuracy < 1, 'a perfect ghost never misses');
});

check('the better ones aim, the worse ones throw at the rack', () => {
  const weak = g.ghostSkill({ name: 'w', hits: 5, throws: 25, bestStreak: 1, games: 2, lastAt: 0 });
  const strong = g.ghostSkill({ name: 's', hits: 15, throws: 25, bestStreak: 4, games: 2, lastAt: 0 });
  assert.equal(weak.aim, 'random');
  assert.equal(strong.aim, 'cluster');
  assert.ok(strong.focus > weak.focus);
});

check('how much help your own throw gets does not depend on who you play', () => {
  const weak = g.ghostSkill({ name: 'w', hits: 5, throws: 25, bestStreak: 0, games: 2, lastAt: 0 });
  const strong = g.ghostSkill({ name: 's', hits: 20, throws: 25, bestStreak: 0, games: 2, lastAt: 0 });
  assert.equal(weak.playerSkill, strong.playerSkill);
});

console.log('why the minimum is where it is');

check('below the threshold the rate has not settled', () => {
  // A 30% shooter, simulated a thousand times, with the running rate read off
  // at various lengths. The number printed is how far off the true rate the
  // middle 90% of runs still are — the threshold has to sit where that stops
  // being a different opponent.
  const TRUE = 0.3;
  const spreadAt = (throws) => {
    const rates = [];
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let run = 0; run < 1000; run++) {
      let hits = 0;
      for (let i = 0; i < throws; i++) if (random() < TRUE) hits += 1;
      rates.push(hits / throws);
    }
    rates.sort((a, b) => a - b);
    return {
      low: rates[50],
      high: rates[949],
      band: Math.round((rates[949] - rates[50]) * 100),
    };
  };

  const measured = [5, 10, 20, 40, 80].map((n) => ({ n, ...spreadAt(n) }));
  for (const row of measured) {
    console.log(
      `       ${String(row.n).padStart(3)} throws: middle 90% lands between ` +
        `${Math.round(row.low * 100)}% and ${Math.round(row.high * 100)}% (${row.band} points wide)`
    );
  }

  const at10 = measured.find((r) => r.n === 10);
  const atMin = measured.find((r) => r.n === g.GHOST_MIN_THROWS);
  assert.ok(at10.band >= 30, `ten throws is already tight (${at10.band} points)`);
  assert.ok(
    atMin.band < at10.band,
    'the threshold is no better than half as many throws'
  );
  assert.equal(g.GHOST_MIN_THROWS, 20, 'the threshold moved without this being re-read');
});

check('a ghost under the threshold cannot be played', () => {
  const nearly = { name: 'n', hits: 5, throws: g.GHOST_MIN_THROWS - 1, bestStreak: 0, games: 1, lastAt: 0 };
  const enough = { ...nearly, throws: g.GHOST_MIN_THROWS };
  assert.equal(g.isPlayable(nearly), false);
  assert.equal(g.isPlayable(enough), true);
});

console.log(`\n${passed} checks passed`);
