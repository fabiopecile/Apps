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
/**
 * The protocol imports the turn rules and the rack sizes rather than restating
 * them, so the arcade game online plays by the same rules as offline. That
 * means its neighbours come along to the temp folder too.
 */
const transpile = (name) => {
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
transpile('turnRules');
transpile('arcadeLayout');
const file = transpile('onlineProtocol');
const {
  OVERTIME_CUPS,
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

// ---------------------------------------------------------------- arcade ---
// The flick game, played by two phones. Everything the room decides is here:
// whose go it is, what the score is, and when it is over. The physics stays on
// the phone that threw — the room takes the result and owns what follows.

const arcade = (cups = 10) => createMatch(cups, ['Wir', 'Ihr'], T0, 'arcade');
/** The cup a shot claims, with the landing point the flight is redrawn from. */
const shot = (hit, cups = [], bounce = false) => ({
  type: 'shot',
  hit,
  cups,
  landing: { x: 0, y: 0 },
  bounce,
});
const standing = (match, seat) => match.alive[seat].filter(Boolean).length;

check('an arcade room starts with two full racks and nobody ahead', () => {
  const match = arcade();
  assert.equal(match.kind, 'arcade');
  assert.deepEqual([standing(match, 0), standing(match, 1)], [10, 10]);
  assert.equal(match.turn.ballsLeft, 2);
  assert.equal(match.activeTeam, 0);
});

check('a hit takes the cup off the other rack, not your own', () => {
  const match = applyAction(arcade(), 0, shot(true, [4]), T0);
  assert.equal(standing(match, 1), 9, 'the cup comes off the rack being thrown at');
  assert.equal(standing(match, 0), 10, 'and never off your own');
  assert.equal(match.teams[0].hits, 1);
  assert.equal(match.teams[1].cupsLeft, 9);
});

check('throwing out of turn changes nothing at all', () => {
  const start = arcade();
  const match = applyAction(start, 1, shot(true, [0]), T0);
  assert.equal(match, start, 'the seat that is not up must not be able to score');
});

check('a cup that is already down cannot be hit twice', () => {
  let match = applyAction(arcade(), 0, shot(true, [4]), T0);
  match = applyAction(match, 0, shot(true, [4]), T0);
  assert.equal(standing(match, 1), 9, 'the same cup must not count a second time');
  assert.equal(match.teams[0].hits, 1, 'and it counts as the miss it was');
  assert.equal(match.teams[0].throws, 2);
});

check('a bounce takes two cups, a plain hit only one', () => {
  const bounced = applyAction(arcade(), 0, shot(true, [3, 4], true), T0);
  assert.equal(standing(bounced, 1), 8);
  const plain = applyAction(arcade(), 0, shot(true, [3, 4], false), T0);
  assert.equal(standing(plain, 1), 9, 'without a bounce only the cup that was hit goes');
});

check('two balls a turn, then it is their go', () => {
  let match = applyAction(arcade(), 0, shot(false), T0);
  assert.equal(match.activeTeam, 0, 'the first ball does not hand over');
  assert.equal(match.turn.ballsLeft, 1);
  match = applyAction(match, 0, shot(false), T0);
  assert.equal(match.activeTeam, 1, 'the second one does');
  assert.equal(match.turn.ballsLeft, 2, 'and they start a fresh set');
});

check('both in and the balls come back', () => {
  let match = applyAction(arcade(), 0, shot(true, [0]), T0);
  match = applyAction(match, 0, shot(true, [1]), T0);
  assert.equal(match.activeTeam, 0, 'sinking both keeps the ball');
  assert.equal(match.note, 'ballsBack');
  assert.equal(match.turn.ballsLeft, 2);
});

check('clearing their rack does not win it — they shoot redemption', () => {
  let match = arcade(2);
  match = applyAction(match, 0, shot(true, [0]), T0);
  match = applyAction(match, 0, shot(true, [1]), T0);
  assert.equal(standing(match, 1), 0);
  assert.equal(match.winner, null, 'nobody has won while redemption is still owed');
  assert.equal(match.activeTeam, 1, 'the side on the brink gets the ball');
  assert.equal(match.turn.redemption, true);
  assert.equal(match.note, 'redemption');
});

check('redemption missed is the match', () => {
  let match = arcade(1);
  match = applyAction(match, 0, shot(true, [0]), T0);
  match = applyAction(match, 1, shot(false), T0);
  assert.equal(match.winner, 0, 'the side that cleared the rack takes it');
});

check('redemption that clears the rack goes to overtime, not a loss', () => {
  // This is the rule the offline game once got wrong, and it cost a game that
  // had been won. Online it must not be wrong in a second place.
  let match = arcade(1);
  match = applyAction(match, 0, shot(true, [0]), T0);
  assert.equal(match.activeTeam, 1);
  match = applyAction(match, 1, shot(true, [0]), T0);
  assert.equal(match.winner, null, 'a good redemption is level, never a win either way');
  assert.equal(match.note, 'overtime');
  assert.equal(match.overtime, 1);
  assert.deepEqual([standing(match, 0), standing(match, 1)], [OVERTIME_CUPS, OVERTIME_CUPS]);
  assert.equal(match.activeTeam, 1, 'whoever shot the redemption throws first');
  assert.equal(match.turn.redemption, false, 'and the set starts over');
});

check('a throw carries the landing point so the other phone can redraw it', () => {
  const match = applyAction(
    arcade(),
    0,
    { type: 'shot', hit: true, cups: [2], landing: { x: 12, y: -34 }, bounce: false },
    T0
  );
  assert.deepEqual(match.lastShot.landing, { x: 12, y: -34 });
  assert.equal(match.lastShot.seat, 0);
  assert.deepEqual(match.lastShot.cups, [2]);
  assert.equal(match.lastShot.id, 1, 'the id counts up so a redraw is not a new throw');
});

check('a landing point that is not a number is refused outright', () => {
  const start = arcade();
  for (const landing of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
    const match = applyAction(start, 0, { type: 'shot', hit: false, cups: [], landing }, T0);
    assert.equal(match, start);
  }
});

check('nothing counts once it is over', () => {
  let match = arcade(1);
  match = applyAction(match, 0, shot(true, [0]), T0);
  match = applyAction(match, 1, shot(false), T0);
  const finished = match;
  match = applyAction(match, 0, shot(true, [0]), T0);
  assert.equal(match, finished);
});

check('undo is refused in the arcade game rather than half applied', () => {
  const match = applyAction(arcade(), 0, shot(true, [0]), T0);
  assert.equal(applyAction(match, 0, { type: 'undo' }, T0), match);
});

check('changing the rack size before the first ball resizes the racks too', () => {
  const match = applyAction(arcade(10), 0, { type: 'setCups', cups: 6 }, T0);
  assert.deepEqual([standing(match, 0), standing(match, 1)], [6, 6]);
});

check('a rematch deals two fresh racks and keeps the game it is', () => {
  let match = applyAction(arcade(6), 0, shot(true, [0]), T0);
  match = applyAction(match, 1, { type: 'rematch' }, T0 + 5000);
  assert.equal(match.kind, 'arcade');
  assert.deepEqual([standing(match, 0), standing(match, 1)], [6, 6]);
  assert.equal(match.turn.ballsLeft, 2);
  assert.equal(match.teams[0].hits, 0);
});

check('a whole arcade game only ever ends on a missed redemption', () => {
  // Walk a long game with a fixed pattern of hits and misses and assert the
  // one property that matters: no ending that is not a redemption missed.
  let match = arcade(10);
  let random = 12345;
  const next = () => ((random = (random * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let guard = 0;
  while (match.winner == null && guard < 4000) {
    guard += 1;
    const seat = match.activeTeam;
    const target = seat === 0 ? 1 : 0;
    const standingCups = match.alive[target]
      .map((up, index) => (up ? index : -1))
      .filter((index) => index >= 0);
    const hit = next() < 0.45 && standingCups.length > 0;
    const before = match.turn.redemption;
    match = applyAction(match, seat, shot(hit, hit ? [standingCups[0]] : []), T0);
    if (match.winner != null) {
      assert.ok(before && !hit, 'a match can only end on a redemption that missed');
    }
  }
  assert.ok(match.winner != null, `the game should finish; stopped after ${guard} throws`);
});

check('junk shots off the wire are not actions', () => {
  for (const junk of [
    { type: 'shot' },
    { type: 'shot', hit: true, cups: [0] },
    { type: 'shot', hit: 'yes', cups: [], landing: { x: 0, y: 0 } },
    { type: 'shot', hit: true, cups: ['2'], landing: { x: 0, y: 0 } },
    { type: 'shot', hit: true, cups: [], landing: { x: 0 } },
  ]) {
    assert.equal(isOnlineAction(junk), false, `${JSON.stringify(junk)} should be rejected`);
  }
  assert.ok(isOnlineAction({ type: 'shot', hit: true, cups: [1], landing: { x: 1, y: 2 } }));
});

console.log(`\n${passed} checks passed`);
