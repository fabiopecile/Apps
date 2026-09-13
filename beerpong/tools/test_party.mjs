/**
 * The party scoreboard, against a real Worker.
 *
 * Run with: node tools/test_party.mjs (with `npx wrangler dev` running in
 * `server/`).
 *
 * Nothing here needs the app: it is the Durable Object's own rules being
 * checked — one host at a time, watchers cannot write, a late message cannot
 * put the score back, and somebody arriving halfway through sees where things
 * stand rather than an empty screen.
 */
import assert from 'node:assert/strict';

const HTTP = process.env.PARTY_URL ?? process.env.WORKER_URL ?? 'http://127.0.0.1:8787';
const BASE = HTTP.replace(/^http/, 'ws');

// Skipped rather than failed when nothing is running, the same way the room
// and save tests are: this needs a Worker, and `npm test` has to be runnable
// without one.
try {
  await fetch(`${HTTP}/health`);
} catch {
  console.log(`Kein Server unter ${HTTP} — übersprungen.`);
  console.log('Starten mit:  cd server && npm install && npx wrangler dev --port 8787');
  process.exit(0);
}
/**
 * A fresh code every run.
 *
 * Each code is its own Durable Object, and the first assertions here are about
 * an empty one — a fixed code passes once and then fails on every rerun against
 * the same Worker, which is the worst kind of test.
 */
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () =>
  Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
const CODE = randomCode();

let passed = 0;
const check = async (name, fn) => {
  await fn();
  console.log('  ok ', name);
  passed += 1;
};

const open = (code, hosting) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`${BASE}/party/${code}${hosting ? '?host=1' : ''}`);
    socket.messages = [];
    socket.addEventListener('message', (event) => socket.messages.push(JSON.parse(event.data)));
    socket.addEventListener('open', () => resolve(socket));
    socket.addEventListener('error', reject);
    setTimeout(() => reject(new Error('socket never opened')), 5000);
  });

const settle = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const board = (version, cupsLeft, name = 'Lena') => ({
  teams: [
    { name, cupsLeft, hits: 10 - cupsLeft, throws: 12 },
    { name: 'Milo', cupsLeft: 10, hits: 0, throws: 9 },
  ],
  startCups: 10,
  activeTeam: 0,
  winner: null,
  version,
});

console.log('the party scoreboard');

const host = await open(CODE, true);
const watcher = await open(CODE, false);
await settle();

await check('a watcher is told there is a host, and how many are watching', () => {
  const last = watcher.messages.at(-1);
  assert.equal(last.type, 'party');
  assert.equal(last.hosted, true);
  assert.equal(last.watchers, 1);
});

await check('what the host publishes reaches the watcher', async () => {
  host.send(JSON.stringify({ type: 'score', state: board(1, 7) }));
  await settle();
  const last = watcher.messages.at(-1);
  assert.equal(last.state.teams[0].cupsLeft, 7);
  assert.equal(last.state.teams[0].name, 'Lena');
});

await check('somebody who arrives halfway through sees the score at once', async () => {
  const late = await open(CODE, false);
  await settle();
  const first = late.messages.at(-1);
  assert.equal(first.state.teams[0].cupsLeft, 7, 'a late watcher started from nothing');
  assert.equal(first.watchers, 2);
  late.close();
  await settle();
});

await check('a watcher cannot change the score', async () => {
  watcher.send(JSON.stringify({ type: 'score', state: board(99, 0, 'HACKED') }));
  await settle();
  const last = watcher.messages.at(-1);
  assert.equal(last.state.teams[0].cupsLeft, 7);
  assert.equal(last.state.teams[0].name, 'Lena');
});

await check('a message that took the long way round cannot undo a newer one', async () => {
  host.send(JSON.stringify({ type: 'score', state: board(5, 3) }));
  await settle();
  host.send(JSON.stringify({ type: 'score', state: board(2, 9) }));
  await settle();
  assert.equal(watcher.messages.at(-1).state.teams[0].cupsLeft, 3, 'the score went backwards');
});

await check('rubbish from the host is dropped rather than passed on', async () => {
  for (const bad of [
    { type: 'score', state: { teams: [], startCups: 10, activeTeam: 0, winner: null, version: 9 } },
    { type: 'score', state: { ...board(9, 3), startCups: 7 } },
    { type: 'score', state: { ...board(9, 3), activeTeam: 5 } },
    { type: 'score', state: { ...board(9, 99) } },
    { type: 'nonsense' },
    'not json at all',
  ]) {
    host.send(typeof bad === 'string' ? bad : JSON.stringify(bad));
  }
  await settle();
  assert.equal(watcher.messages.at(-1).state.teams[0].cupsLeft, 3);
});

await check('a second phone cannot take over the scoreboard', async () => {
  const rival = await open(CODE, true);
  await settle();
  const said = rival.messages.at(-1);
  assert.equal(said.type, 'error');
  assert.equal(said.reason, 'hosted');
  rival.close();
});

await check('the watchers are told when the counting phone goes', async () => {
  host.close();
  await settle(600);
  assert.equal(watcher.messages.at(-1).hosted, false);
  // And the score stays up rather than vanishing with it.
  assert.equal(watcher.messages.at(-1).state.teams[0].cupsLeft, 3);
});

await check('another code is a different game', async () => {
  const other = await open(randomCode(), false);
  await settle();
  assert.equal(other.messages.at(-1).state, null);
  other.close();
});

watcher.close();
await settle();
console.log(`\n${passed} ok, 0 failed`);
