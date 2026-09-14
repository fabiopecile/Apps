/**
 * The paid tournament, and the two things about it that could go wrong with
 * money in the room.
 *
 * One: the pot has to be worth entering without being worth farming. The whole
 * reason this bracket is played out match by match, instead of being the party
 * tournament where a winner is reported by tapping a name, is that a tapped
 * winner is a coin printer. That reasoning only holds if the payout really does
 * need every round won, so that is asserted here.
 *
 * Two: a run has to end when it ends. A loss must not leave a run standing that
 * could be replayed, and neither must walking out of a match.
 *
 * Run with: node tools/test_knockout.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const dir = mkdtempSync(join(tmpdir(), 'knockout-'));
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
for (const name of ['opponents', 'competition', 'i18n', 'languages']) {
  try {
    load(name);
  } catch {
    // Only what knockout.ts actually imports has to resolve.
  }
}
const k = await import(load('knockout'));

let passed = 0;
const check = (name, fn) => {
  fn();
  console.log('  ok ', name);
  passed += 1;
};

console.log('the bracket');

check('every size has a ladder, and the rounds match the teams', () => {
  for (const teams of k.KNOCKOUT_SIZES) {
    // Four teams is two rounds, eight is three: the bracket halves each time.
    assert.equal(k.roundsFor(teams), Math.log2(teams), `${teams} teams`);
  }
});

check('the last round is the final and the one before it the semi', () => {
  for (const teams of k.KNOCKOUT_SIZES) {
    const rounds = k.roundsFor(teams);
    assert.equal(k.roundKey(teams, rounds), 'final', `${teams}`);
    if (rounds > 1) assert.equal(k.roundKey(teams, rounds - 1), 'semi', `${teams}`);
  }
});

check('it gets harder every round, and never easier', () => {
  const order = ['easy', 'medium', 'hard', 'pro'];
  for (const teams of k.KNOCKOUT_SIZES) {
    let last = -1;
    for (let round = 1; round <= k.roundsFor(teams); round++) {
      const at = order.indexOf(k.difficultyForRound(teams, round));
      assert.ok(at > last, `${teams} teams, round ${round} is not harder than the one before`);
      last = at;
    }
  }
});

check('the draw never puts the same opponent in twice', () => {
  // The bracket is shown in full before a coin is staked, and the same face in
  // two rounds would read as a bug in the draw.
  for (const teams of k.KNOCKOUT_SIZES) {
    for (let seed = 0; seed < 200; seed++) {
      let n = seed;
      const random = () => {
        n = (n * 1103515245 + 12345) % 2147483648;
        return n / 2147483648;
      };
      const drawn = k.drawOpponents(teams, random);
      assert.equal(drawn.length, k.roundsFor(teams));
      assert.equal(new Set(drawn).size, drawn.length, `seed ${seed} drew a duplicate`);
      for (const id of drawn) assert.equal(k.opponentById(id).id, id);
      // And the faces get harder along with the rounds. The difficulty bands
      // overlap, so an unsorted draw really does sometimes put the friendlier
      // of two opponents in the final — seen in a played-through run.
      for (let i = 1; i < drawn.length; i++) {
        assert.ok(
          k.opponentById(drawn[i]).difficulty >= k.opponentById(drawn[i - 1]).difficulty,
          `seed ${seed} put an easier face later in the bracket`
        );
      }
    }
  }
});

console.log('the pot');

check('it is the stake times the teams, so the odds are about fair', () => {
  // Deliberately close to fair rather than generous: somebody winning half
  // their matches comes out level over a long run. A four-team bracket needs
  // two wins and pays four times; eight needs three and pays eight. Make this
  // pay more and the tournament becomes the only sensible way to earn.
  for (const teams of k.KNOCKOUT_SIZES) {
    for (const stake of k.KNOCKOUT_STAKES) {
      assert.equal(k.potFor(stake, teams), stake * teams);
      assert.equal(k.potFor(stake, teams), stake * Math.pow(2, k.roundsFor(teams)));
    }
  }
});

check('nothing is paid out before the final is won', () => {
  for (const teams of k.KNOCKOUT_SIZES) {
    let run = k.startRun(500, teams, 0);
    for (let round = 1; round < k.roundsFor(teams); round++) {
      const result = k.reportRound(run, true);
      assert.equal(result.coins, 0, `paid out in round ${round}`);
      assert.equal(result.finished, false);
      assert.equal(result.champion, false);
      assert.ok(result.run);
      assert.equal(result.run.round, round + 1);
      run = result.run;
    }
    const last = k.reportRound(run, true);
    assert.equal(last.champion, true);
    assert.equal(last.coins, k.potFor(500, teams));
    assert.equal(last.finished, true);
  }
});

check('a loss in any round ends it and pays nothing', () => {
  for (const teams of k.KNOCKOUT_SIZES) {
    for (let upTo = 1; upTo <= k.roundsFor(teams); upTo++) {
      let run = k.startRun(200, teams, 0);
      for (let round = 1; round < upTo; round++) run = k.reportRound(run, true).run;
      const result = k.reportRound(run, false);
      assert.equal(result.coins, 0, `round ${upTo} of ${teams} paid out on a loss`);
      assert.equal(result.champion, false);
      assert.equal(result.finished, true);
      assert.equal(result.run, null, 'a lost run is still standing');
    }
  }
});

check('winning it all pays the pot exactly once', () => {
  // The run is gone afterwards, so there is nothing left to report a second
  // win against — which is what stops a won final being claimed twice.
  let run = k.startRun(1200, 4, 0);
  run = k.reportRound(run, true).run;
  const first = k.reportRound(run, true);
  assert.equal(first.coins, 4800);
  assert.equal(first.run, null);
});

check('a run starts on round one with nothing pending', () => {
  const run = k.startRun(200, 8, 12345);
  assert.equal(run.round, 1);
  assert.equal(run.pending, false);
  assert.equal(run.stake, 200);
  assert.equal(run.teams, 8);
  assert.equal(run.startedAt, 12345);
});

check('winning a round clears the pending flag', () => {
  // Set when the match screen opens and cleared when a result comes back. A
  // round that stayed pending after a win would be forfeited by the next visit
  // to the tournament screen — the player would win and lose at once.
  const started = { ...k.startRun(500, 8, 0), pending: true };
  const result = k.reportRound(started, true);
  assert.equal(result.run.pending, false);
});

console.log(`\n${passed} checks passed`);
