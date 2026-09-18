/**
 * Two rules about racks that a screenshot caught and no test would have.
 *
 * **A rebuilt rack has to be redrawn.** Overtime throws both racks away and
 * lays fresh ones — ten cups become three. That changes the `count` the
 * instanced meshes are built with, so r3f builds new meshes, and a new
 * `InstancedMesh` starts with identity matrices: every cup at the world origin,
 * which on this table is the middle of the net. `Table3D` has an optimisation
 * that skips uploading matrices while nothing is moving, and it was still armed
 * from the rack that had just settled — so the new rack was never positioned at
 * all. On screen: the scoreboard said three cups a side and the table showed
 * one cup sitting on the halfway line, because all three were stacked on the
 * same spot.
 *
 * **A re-rack touches your own cups, never the other side's.** It used to be
 * indexed by which rack was being shot at, so calling it reached across the
 * table and rearranged the opponent's rack.
 *
 * Neither is provable from the pure rule functions, so both are asserted
 * against the source. That is weaker than running the renderer, and it is what
 * is available: the first bug lives in a frame loop inside a GL canvas.
 *
 * Run with: node tools/test_overtime.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => readFileSync(join(root, file), 'utf8');

/** Source with its comments stripped — this codebase quotes its own rules. */
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

console.log('rebuilt racks and whose cups they are');

const table = code('components/arcade/Table3D.tsx');
const match = code('app/(tabs)/arcade/match.tsx');

check('the skip-the-upload optimisation is still there', () => {
  // If this ever goes, the checks below are guarding nothing — and the cost it
  // avoids is real: six instance buffers a frame for a table at rest.
  assert.ok(
    /if \(!settling\.current &&/.test(table),
    'Table3D no longer skips uploading a still rack — these checks are now moot'
  );
});

check('a rebuilt rack forces one upload', () => {
  assert.ok(
    /const drawn = useRef\(cups\);/.test(table),
    'Table3D no longer remembers which rack it last drew'
  );
  assert.ok(
    /drawn\.current !== cups/.test(table),
    'the rack is compared by length only — a rebuild at the same size slips through'
  );
  // The reset itself. Without this line the new mesh keeps identity matrices.
  const guard = table.match(/if \(drawn\.current !== cups[\s\S]{0,400}?\n  \}/);
  assert.ok(guard, 'the rebuild guard is gone');
  assert.ok(
    /settling\.current = true;/.test(guard[0]),
    'a rebuilt rack no longer re-arms the frame loop, so its cups stay stacked on the net'
  );
});

check('overtime really does rebuild both racks', () => {
  assert.ok(
    /setOpponentAlive\(Array\(OVERTIME_CUP_COUNT\)\.fill\(true\)\)/.test(match) &&
      /setPlayerAlive\(Array\(OVERTIME_CUP_COUNT\)\.fill\(true\)\)/.test(match),
    'overtime no longer lays fresh racks, so the guard above has nothing to catch'
  );
});

check('a re-rack moves your own cups', () => {
  const body = match.match(/const doReRack = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(body, 'doReRack is gone');
  // Your turn moves your rack. The old version had these the other way round,
  // which is precisely the reach-across-the-table bug.
  assert.ok(
    /if \(playerTurn\) setPlayerAlive/.test(body[0]),
    'on your turn the re-rack no longer moves your own cups'
  );
  assert.ok(
    /else setOpponentAlive/.test(body[0]),
    'the other side no longer re-racks its own cups'
  );
});

check('nothing re-racks a rack it does not own', () => {
  // The old signature took the side as an argument, and every caller passed
  // "whichever rack is being shot at". A no-argument handler cannot express it.
  assert.ok(
    !/doReRack\(\s*(?:playerTurn \? 0 : 1|0|1)\s*\)/.test(match),
    'a caller is choosing which rack to re-rack again'
  );
});

check('the button says whose cups move', () => {
  const strings = read('lib/i18n.ts');
  assert.ok(/'match\.reRackOwn':/.test(strings), 'the arcade re-rack label is gone');
  assert.ok(
    /'match\.reRack':/.test(strings),
    'the camera tracker lost its own re-rack label — that one is a real-table house rule'
  );
  assert.ok(/eigene/i.test(strings.split("'match.reRackOwn':")[1].slice(0, 160)),
    'the German label no longer says the cups are your own');
});

check('the manual describes the re-rack that exists', () => {
  const guide = read('lib/guide.ts');
  assert.ok(/Re-Rack/.test(guide), 'the manual no longer covers the re-rack');
  assert.ok(
    /\*\*deine eigenen\*\*/.test(guide),
    'the manual does not say the cups are your own, which is the whole rule'
  );
  // It also has to be straight about the trade-off, because the button reads as
  // purely helpful and is not.
  assert.ok(
    /leichter zu treffen/.test(guide),
    'the manual no longer warns that a tightened rack is an easier target'
  );
});

check('the bounce button really is gone from every match screen', () => {
  for (const screen of [
    'app/(tabs)/arcade/match.tsx',
    'app/(tabs)/arcade/onlinematch.tsx',
  ]) {
    assert.ok(
      !/bounceArmed/.test(code(screen)),
      `${screen} can arm a bounce again — the button was removed on purpose`
    );
  }
});

check('no daily challenge asks for something the app cannot do', () => {
  const progression = code('lib/progression.ts');
  assert.ok(
    !/metric: 'bounceHits'/.test(progression),
    'a daily challenge wants bounce shots, which no screen can throw any more'
  );
});

console.log(`\n${passed} checks passed`);
