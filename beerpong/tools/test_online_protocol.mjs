/**
 * The rules of an online match, checked without a network.
 *
 * The point of these is the direction of every report: each phone says what
 * happened to *its own* rack, never what it thinks it scored. If that gets
 * inverted anywhere the game keeps working and quietly counts for the wrong
 * team, which is exactly the kind of bug nobody notices until the last cup.
 *
 * Run with: node tools/test_online_protocol.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'online-'));
const source = readFileSync(new URL('../lib/onlineProtocol.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, 'onlineProtocol.mjs');
writeFileSync(file, js);
const {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  applyAction,
  createMatch,
  isOnlineAction,
  isRoomCode,
  makeRoomCode,
  normaliseRoomCode,
} = await import(file);

let passed = 0;
function check(name, fn) {
  fn();
  console.log('  ok ', name);
  passed += 1;
}

const T0 = 1_700_000_000_000;
const fresh = (cups = 10) => createMatch(cups, ['Wir', 'Ihr'], T0);
/** Applies a list of [seat, action] pairs in order. */
const play = (match, steps) =>
  steps.reduce((state, [seat, action]) => applyAction(state, seat, action, T0), match);

console.log('online protocol');

check('a room code avoids the letters people mishear', () => {
  for (const character of 'ILO01') {
    assert.ok(!ROOM_CODE_ALPHABET.includes(character), `${character} should not be in a code`);
  }
  let random = 0;
  const code = makeRoomCode(() => (random = (random + 0.137) % 1));
  assert.equal(code.length, ROOM_CODE_LENGTH);
  assert.ok(isRoomCode(code));
});

check('a code survives being typed badly', () => {
  assert.equal(normaliseRoomCode(' k7 qm '), 'K7QM');
  assert.equal(normaliseRoomCode('k7qm-extra'), 'K7QM', 'and is cut to length');
  assert.equal(isRoomCode('k7q'), false);
});

check('a cup down on my rack scores for the other side', () => {
  const after = applyAction(fresh(), 0, { type: 'cupDown' }, T0);
  assert.equal(after.teams[0].cupsLeft, 9, 'my rack lost one');
  assert.equal(after.teams[1].cupsLeft, 10, 'theirs is untouched');
  assert.equal(after.teams[1].hits, 1, 'they scored it');
  assert.equal(after.teams[0].hits, 0, 'not me');
  assert.equal(after.teams[1].throws, 1);
});

check('...and from the other seat it works the other way round', () => {
  const after = applyAction(fresh(), 1, { type: 'cupDown' }, T0);
  assert.equal(after.teams[1].cupsLeft, 9);
  assert.equal(after.teams[0].hits, 1);
});

check('a report settles whose turn it is, however wrong it had got', () => {
  // Seat 0 is active, but seat 1 reports a cup going down on its own rack —
  // which can only mean seat 0 is throwing. The turn should agree.
  let match = fresh();
  assert.equal(match.activeTeam, 0);
  match = applyAction(match, 1, { type: 'cupDown' }, T0);
  assert.equal(match.activeTeam, 0, 'the scorer keeps the ball');
  match = applyAction(match, 1, { type: 'miss' }, T0);
  assert.equal(match.activeTeam, 1, 'a miss at my rack makes it my turn');
});

check('a miss counts against the thrower, not the reporter', () => {
  const match = play(fresh(), [
    [0, { type: 'cupDown' }],
    [0, { type: 'miss' }],
  ]);
  assert.equal(match.teams[1].throws, 2, 'both throws were theirs');
  assert.equal(match.teams[0].throws, 0);
  assert.equal(match.teams[1].streak, 0, 'the miss broke the run');
  assert.equal(match.teams[1].bestStreak, 1, 'but the run is remembered');
});

check('the last cup ends it, and nothing counts afterwards', () => {
  let match = fresh(2);
  match = play(match, [
    [0, { type: 'cupDown' }],
    [0, { type: 'cupDown' }],
  ]);
  assert.equal(match.winner, 1);
  const frozen = applyAction(match, 0, { type: 'cupDown' }, T0);
  assert.equal(frozen, match, 'an action after the end changes nothing at all');
  assert.equal(frozen.teams[0].cupsLeft, 0);
});

check('undo puts back exactly what the last report changed', () => {
  const start = fresh();
  const after = applyAction(start, 0, { type: 'cupDown' }, T0);
  const back = applyAction(after, 1, { type: 'undo' }, T0);
  assert.deepEqual(back.teams, start.teams, 'either seat may take a miscount back');
  assert.equal(back.activeTeam, start.activeTeam);
  assert.equal(back.winner, null);
  assert.ok(back.version > after.version, 'and it is still a new version');
});

check('undo can take back the winning cup', () => {
  let match = fresh(1);
  match = applyAction(match, 0, { type: 'cupDown' }, T0);
  assert.equal(match.winner, 1);
  match = applyAction(match, 0, { type: 'undo' }, T0);
  assert.equal(match.winner, null, 'a wrongly counted last cup is not final');
  assert.equal(match.teams[0].cupsLeft, 1);
});

check('undo on an untouched game does nothing', () => {
  const start = fresh();
  assert.equal(applyAction(start, 0, { type: 'undo' }, T0), start);
});

check('every seat renames only itself', () => {
  let match = applyAction(fresh(), 1, { type: 'rename', name: '  Die Anderen  ' }, T0);
  assert.equal(match.teams[1].name, 'Die Anderen', 'trimmed');
  assert.equal(match.teams[0].name, 'Wir', 'and the other name is left alone');
  match = applyAction(match, 1, { type: 'rename', name: '   ' }, T0);
  assert.equal(match.teams[1].name, 'Die Anderen', 'an empty name is not a name');
  match = applyAction(match, 1, { type: 'rename', name: 'x'.repeat(40) }, T0);
  assert.equal(match.teams[1].name.length, 16, 'and a very long one is cut');
});

check('the rack size can be changed before the first throw and not after', () => {
  let match = applyAction(fresh(), 0, { type: 'setCups', cups: 6 }, T0);
  assert.equal(match.startCups, 6);
  assert.deepEqual([match.teams[0].cupsLeft, match.teams[1].cupsLeft], [6, 6]);
  const thrown = applyAction(match, 0, { type: 'miss' }, T0);
  assert.equal(applyAction(thrown, 0, { type: 'setCups', cups: 15 }, T0), thrown);
  assert.equal(applyAction(match, 0, { type: 'setCups', cups: 7 }, T0), match, '7 is not a rack');
});

check('a rematch keeps the names and the rack, and drops everything else', () => {
  let match = play(fresh(), [
    [0, { type: 'setCups', cups: 6 }],
    [1, { type: 'rename', name: 'Ihr Tisch' }],
    [0, { type: 'cupDown' }],
    [0, { type: 'cupDown' }],
  ]);
  const versionBefore = match.version;
  match = applyAction(match, 1, { type: 'rematch' }, T0 + 1000);
  assert.equal(match.startCups, 6);
  assert.deepEqual([match.teams[0].name, match.teams[1].name], ['Wir', 'Ihr Tisch']);
  assert.deepEqual([match.teams[0].cupsLeft, match.teams[1].cupsLeft], [6, 6]);
  assert.equal(match.teams[1].hits, 0);
  assert.equal(match.history.length, 0);
  assert.ok(match.version > versionBefore, 'a rematch is a new version, not a reset to 1');
});

check('the version only ever goes up', () => {
  let match = fresh();
  let last = match.version;
  for (const step of [
    [0, { type: 'cupDown' }],
    [1, { type: 'miss' }],
    [0, { type: 'undo' }],
    [1, { type: 'rename', name: 'Neu' }],
    [0, { type: 'rematch' }],
  ]) {
    match = applyAction(match, step[0], step[1], T0);
    assert.ok(match.version > last, `${step[1].type} should bump the version`);
    last = match.version;
  }
});

check('junk off the wire is not an action', () => {
  for (const junk of [null, 42, 'cupDown', {}, { type: 'drop' }, { type: 'rename' }, { type: 'setCups', cups: '10' }]) {
    assert.equal(isOnlineAction(junk), false, `${JSON.stringify(junk)} should be rejected`);
  }
  assert.ok(isOnlineAction({ type: 'cupDown' }));
  assert.ok(isOnlineAction({ type: 'rename', name: 'A' }));
});

console.log(`\n${passed} checks passed`);
