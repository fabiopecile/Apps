/**
 * Two phones against a room that is really running.
 *
 * `tools/test_online_protocol.mjs` checks the rules; this checks everything the
 * rules cannot know about — that a code reaches the same room from two
 * sockets, that a seat cannot be taken twice, that a phone which loses signal
 * gets its seat and the score back, and that the room ignores junk instead of
 * falling over.
 *
 * Start the room first, in server/:
 *   npm install && npx wrangler dev --port 8787
 * then, from the app folder:
 *   npm run test:room
 *
 * ROOM_URL points it at a deployed room instead of the local one.
 */
const HTTP = process.env.ROOM_URL ?? 'http://127.0.0.1:8787';
const BASE = `${HTTP.replace(/^http/, 'ws')}/room`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await fetch(`${HTTP}/health`);
} catch {
  console.log(`Kein Raum-Server unter ${HTTP} — übersprungen.`);
  console.log('Starten mit:  cd server && npm install && npx wrangler dev --port 8787');
  process.exit(0);
}

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.states = [];
    ws.errors = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.type === 'state') ws.states.push(m);
      if (m.type === 'error') ws.errors.push(m.reason);
    });
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', () => resolve(ws));
    setTimeout(() => resolve(ws), 3000);
  });
}
const last = (ws) => ws.states[ws.states.length - 1];
const send = (ws, action) => ws.send(JSON.stringify(action));

/** A fresh code each run, so a second run is not refused as "taken". */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

let ok = 0, bad = 0;
const check = (name, cond) => { (cond ? ok++ : bad++); console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); };

const health = await fetch(`${HTTP}/health`).then((r) => r.json());
check('health', health.ok === true);
check('a stray path is 404', (await fetch(`${HTTP}/nonsense`)).status === 404);

// --- one game -------------------------------------------------------------
const host = await open(`${BASE}/${CODE}?seat=0&create=1&name=Wir&cups=10`);
await wait(300);
check('the host gets a state', last(host)?.match.startCups === 10);
check('the host is seat 0', last(host)?.seat === 0);
check('and is alone', last(host)?.present[1] === false);

const guest = await open(`${BASE}/${CODE}?seat=1&name=Ihr`);
await wait(400);
check('the guest joins the same room', last(guest)?.code === CODE);
check('the guest is seat 1', last(guest)?.seat === 1);
check('both sides now see each other', last(host)?.present[0] && last(host)?.present[1]);
check('the guest name arrived', last(host)?.match.teams[1].name === 'Ihr');

// The guest's rack loses a cup -> the host scored.
send(guest, { type: 'cupDown' });
await wait(300);
check('the host scored it', last(host)?.match.teams[0].hits === 1);
check('the guest rack is down one', last(host)?.match.teams[1].cupsLeft === 9);
check('both phones agree', last(host)?.match.version === last(guest)?.match.version);
check('it is still the host throwing', last(guest)?.match.activeTeam === 0);

send(guest, { type: 'miss' });
await wait(250);
check('a miss hands the turn over', last(host)?.match.activeTeam === 1);
check('and counts as the host throwing', last(host)?.match.teams[0].throws === 2);

send(host, { type: 'undo' });
await wait(250);
check('either side can undo', last(guest)?.match.teams[0].throws === 1);

// --- the refusals ---------------------------------------------------------
const gatecrasher = await open(`${BASE}/${CODE}?seat=1`);
await wait(400);
check('a third phone is turned away', gatecrasher.errors[0] === 'full');

const nowhere = await open(`${BASE}/ZZZZ?seat=1`);
await wait(400);
check('joining a code nobody opened says so', nowhere.errors[0] === 'missing');

const dupe = await open(`${BASE}/${CODE}?seat=0&create=1`);
await wait(400);
check('a code in use is not handed out again', dupe.errors[0] === 'taken');

// --- reconnecting ---------------------------------------------------------
guest.close();
await wait(500);
check('the host sees the guest drop', last(host)?.present[1] === false);
const back = await open(`${BASE}/${CODE}?seat=1`);
await wait(400);
check('the guest can take its seat back', last(back)?.present[1] === true);
check('and the score survived', last(back)?.match.teams[0].hits === 1);

// --- junk -----------------------------------------------------------------
const versionBefore = last(host).match.version;
back.send('not json');
back.send(JSON.stringify({ type: 'drop table' }));
back.send(JSON.stringify({ type: 'cupDown', extra: 'x'.repeat(4000) }));
await wait(400);
check('junk changes nothing', last(host).match.version === versionBefore);

// --- to the end -----------------------------------------------------------
for (let i = 0; i < 9; i++) { send(back, { type: 'cupDown' }); await wait(90); }
await wait(400);
check('the last cup ends it', last(host)?.match.winner === 0);
check('and the rack is empty', last(host)?.match.teams[1].cupsLeft === 0);
send(back, { type: 'rematch' });
await wait(300);
check('a rematch starts over with the names kept', last(host)?.match.teams[1].cupsLeft === 10 && last(host)?.match.teams[1].name === 'Ihr');

host.close(); back.close();

// --- the arcade game in a room --------------------------------------------
// Same room, different game: two phones flicking at each other's cups. The
// rules live in the protocol and are checked there; what matters here is that
// a room opened as an arcade room stays one, and that a throw arriving over a
// socket lands on the other side's rack.
const ARCADE = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const one = await open(`${BASE}/${ARCADE}?seat=0&create=1&name=Eins&game=arcade`);
await wait(400);
check('an arcade room opens as an arcade room', last(one)?.match.kind === 'arcade');
check('with two full racks', last(one)?.match.alive?.[0].filter(Boolean).length === 10);

const two = await open(`${BASE}/${ARCADE}?seat=1&name=Zwei`);
await wait(400);
check('the other phone joins it', last(two)?.match.kind === 'arcade' && last(one)?.present[1] === true);

const shot = (hit, cups) => ({ type: 'shot', hit, cups, landing: { x: 0, y: 0 }, bounce: false });
send(one, shot(true, [3]));
await wait(400);
check('a throw takes a cup off the other rack', last(two)?.match.alive[1].filter(Boolean).length === 9);
check('and both phones see the same throw', last(two)?.match.lastShot?.id === last(one)?.match.lastShot?.id);

// The name a phone joined with, still there after a throw.
//
// Said plainly, because a test that looks like it covers something it does
// not is worse than no test: this passes either way in a run this fast. The
// bug it is written against was that the joining phone's name was applied in
// memory and never written down, and these sockets hibernate — so the room
// was rebuilt from storage and "Zwei" came back as "Team 2" minutes later,
// after the other phone had already seen the real name. Reproducing that
// needs the room actually torn down, which was done by hand: join, restart
// the worker, reconnect. Without the write it read "Team 2", with it "Zwei".
check('the name a phone joined with is still there after a throw', last(one)?.match.teams[1].name === 'Zwei');

send(two, shot(true, [0]));
await wait(400);
check('throwing out of turn changes nothing', last(one)?.match.alive[0].filter(Boolean).length === 10);

one.close(); two.close();
console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad > 0 ? 1 : 0);
