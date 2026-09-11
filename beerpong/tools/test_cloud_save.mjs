/**
 * The backup, against a really running Worker.
 *
 * The cases that matter are the ones where a save could be lost or handed to
 * the wrong person:
 *   - an unknown code must return nothing, not somebody else's save;
 *   - a malformed code must be refused before it reaches any storage;
 *   - a write that arrives out of order must not overwrite a newer one;
 *   - turning backup off must actually delete the copy.
 *
 * Start the Worker first, in server/:
 *   npx wrangler dev --port 8787
 * then, from the app folder:  npm run test:save
 */
const WORKER = process.env.WORKER_URL ?? 'http://127.0.0.1:8787';

async function reachable(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

if (!(await reachable(`${WORKER}/health`))) {
  console.log(`Kein Worker unter ${WORKER} — übersprungen.`);
  console.log('Starten mit:  cd server && npx wrangler dev --port 8787');
  process.exit(0);
}

let ok = 0;
let bad = 0;
const check = (name, condition, detail) => {
  if (condition) ok += 1;
  else bad += 1;
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${name}${condition || !detail ? '' : ` — ${detail}`}`);
};

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = () =>
  Array.from({ length: 12 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const get = (c) =>
  fetch(`${WORKER}/save/${c}`).then((r) => r.json().then((d) => ({ status: r.status, d })));
const put = (c, state, updatedAt) =>
  fetch(`${WORKER}/save/${c}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, updatedAt }),
  }).then((r) => r.json().then((d) => ({ status: r.status, d })));
const del = (c) =>
  fetch(`${WORKER}/save/${c}`, { method: 'DELETE' }).then((r) => ({ status: r.status }));

console.log('cloud save');

// --- nothing there yet -----------------------------------------------------
const mine = code();
const empty = await get(mine);
check('an unused code holds nothing', empty.status === 404 && empty.d.found === false);

// --- a round trip ----------------------------------------------------------
const save = JSON.stringify({ state: { coins: 1234, licence: 'BP-TEST-TEST-TEST' }, version: 0 });
const first = await put(mine, save, 1000);
check('a save can be written', first.d.ok === true, JSON.stringify(first.d));

const back = await get(mine);
check('and comes back exactly as it went in', back.d.state === save);
check('with the time it was written', back.d.updatedAt === 1000);

// --- codes are separate ----------------------------------------------------
const other = code();
const stranger = await get(other);
check('another code is still empty', stranger.status === 404, 'saves must not leak between codes');

await put(other, JSON.stringify({ state: { coins: 7 } }), 2000);
check('and writing there leaves mine alone', (await get(mine)).d.state === save);

// --- ordering --------------------------------------------------------------
const older = await put(mine, JSON.stringify({ state: { coins: 0 } }), 500);
check('a write that arrives late does not win', older.status === 409 && older.d.stale === true);
check('and the newer save is untouched', (await get(mine)).d.state === save);

const newer = await put(mine, JSON.stringify({ state: { coins: 9999 } }), 3000);
check('a genuinely newer write does win', newer.d.ok === true);
check('and replaces it', JSON.parse((await get(mine)).d.state).state.coins === 9999);

// --- junk ------------------------------------------------------------------
const badCode = await fetch(`${WORKER}/save/nope`).then((r) => r.status);
check('a malformed code is refused', badCode === 400, `got ${badCode}`);
const traversal = await fetch(`${WORKER}/save/..%2f..%2fetc`).then((r) => r.status);
check('and so is a path dressed up as one', traversal === 400 || traversal === 404, `got ${traversal}`);

const noState = await put(mine, '', 4000);
check('an empty save is refused', noState.status === 400);
check('the real one survived that too', JSON.parse((await get(mine)).d.state).state.coins === 9999);

const huge = await put(code(), 'x'.repeat(300 * 1024), 1000);
check('something far too big is refused', huge.status === 413, `got ${huge.status}`);

// --- turning it off --------------------------------------------------------
check('a save can be deleted', (await del(mine)).status === 200);
check('and is then gone', (await get(mine)).status === 404);

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad > 0 ? 1 : 0);
