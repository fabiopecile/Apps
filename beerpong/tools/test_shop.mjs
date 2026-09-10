/**
 * The purchase, end to end, against a really running Worker.
 *
 * Stripe itself is stood in for by `tools/fake_stripe.mjs`, which speaks the
 * same two endpoints in the same wire format. What that does and does not
 * prove is written out at the top of that file; the short version is that
 * everything on *our* side is exercised for real, and Stripe accepting a card
 * is not.
 *
 * The cases that matter are the ones where money and access disagree:
 *   - a session that was never paid must not yield a code;
 *   - a made-up session id must not yield a code;
 *   - a code nobody signed must not verify;
 *   - claiming twice must give the same code, not a second one.
 *
 * Start both first, from the app folder:
 *   node tools/fake_stripe.mjs 8799
 *   cd server && npx wrangler dev --port 8787 \
 *     --var STRIPE_SECRET_KEY:sk_test_x --var LICENCE_SECRET:test-secret \
 *     --var STRIPE_API_BASE:http://127.0.0.1:8799 --var APP_URL:http://localhost:8081
 * then: npm run test:shop
 */
const WORKER = process.env.WORKER_URL ?? 'http://127.0.0.1:8787';
const STRIPE = process.env.FAKE_STRIPE_URL ?? 'http://127.0.0.1:8799';

async function reachable(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

if (!(await reachable(`${WORKER}/health`)) || !(await reachable(`${STRIPE}/nope`))) {
  console.log('Worker oder Stripe-Attrappe laufen nicht — übersprungen.');
  console.log('Anleitung steht oben in tools/test_shop.mjs.');
  process.exit(0);
}

let ok = 0;
let bad = 0;
const check = (name, condition, detail) => {
  if (condition) ok += 1;
  else bad += 1;
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${name}${condition || !detail ? '' : ` — ${detail}`}`);
};

const get = (path) => fetch(`${WORKER}${path}`).then((r) => r.json().then((d) => ({ status: r.status, d })));
const post = (path, body) =>
  fetch(`${WORKER}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:8081' },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json().then((d) => ({ status: r.status, d })));

console.log('shop');

// --- what is for sale ------------------------------------------------------
const shop = await get('/shop');
check('the shop says it is open', shop.d.enabled === true, JSON.stringify(shop.d));
check('and at 4,99 €', shop.d.amount === 499 && shop.d.currency === 'eur', JSON.stringify(shop.d));

// --- an unpaid session -----------------------------------------------------
const started = await post('/checkout', { path: '/pro' });
check('a checkout can be started', typeof started.d.sessionId === 'string', JSON.stringify(started.d));
const session = started.d.sessionId;

const beforePaying = await get(`/licence?session=${session}`);
check('an unpaid session yields no code', beforePaying.d.paid === false && !beforePaying.d.licence);

// --- an invented one -------------------------------------------------------
const invented = await get('/licence?session=cs_test_madeup');
check('an invented session yields no code', !invented.d.licence, JSON.stringify(invented.d));
const malformed = await get('/licence?session=../../etc/passwd');
check('a malformed session is refused outright', malformed.status === 400);

// --- pay, then claim -------------------------------------------------------
await fetch(`${STRIPE}/pay/${session}`, { method: 'POST' });
const claimed = await get(`/licence?session=${session}`);
check('a paid session yields a code', claimed.d.paid === true && !!claimed.d.licence, JSON.stringify(claimed.d));
const licence = claimed.d.licence ?? '';
check('and it looks like a code', /^BP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licence), licence);

const again = await get(`/licence?session=${session}`);
check('claiming twice gives the same code', again.d.licence === licence, `${again.d.licence} vs ${licence}`);

// --- verifying -------------------------------------------------------------
check('the code verifies', (await post('/licence/verify', { licence })).d.ok === true);
check(
  'and verifies however it was typed',
  (await post('/licence/verify', { licence: licence.toLowerCase().replace(/-/g, '') })).d.ok === true
);

// A different purchase must not produce the same code.
const second = await post('/checkout', { path: '/pro' });
await fetch(`${STRIPE}/pay/${second.d.sessionId}`, { method: 'POST' });
const secondLicence = (await get(`/licence?session=${second.d.sessionId}`)).d.licence;
check('a different purchase gets a different code', secondLicence !== licence);
check('which also verifies', (await post('/licence/verify', { licence: secondLicence })).d.ok === true);

// --- forgery ---------------------------------------------------------------
const body = licence.replace(/-/g, '').slice(2, 10);
for (const forged of [
  'BP-AAAA-AAAA-AAAA',
  `BP-${body.slice(0, 4)}-${body.slice(4, 8)}-ZZZZ`,
  licence.slice(0, -1) + (licence.slice(-1) === 'Z' ? 'Y' : 'Z'),
  '',
  'nonsense',
]) {
  const result = await post('/licence/verify', { licence: forged });
  check(`a forged code is refused: ${JSON.stringify(forged)}`, result.d.ok === false);
}

// --- the redirect ----------------------------------------------------------
// The checkout url belongs to Stripe and is only opened, never parsed — a
// first attempt asserted it does *not* contain the session id, which is simply
// untrue of the real thing (`checkout.stripe.com/c/pay/cs_test_...`).
check(
  'the checkout url is an absolute url somewhere else',
  typeof started.d.url === 'string' &&
    /^https?:\/\//.test(started.d.url) &&
    !started.d.url.startsWith('http://localhost:8081'),
  started.d.url
);
const page = await fetch(`${STRIPE}/pay/${session}`, { method: 'POST' }).then((r) => r.json());
check(
  'and that url is the app, carrying the session id',
  page.redirect.startsWith('http://localhost:8081/pro?paid=cs_'),
  page.redirect
);

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad > 0 ? 1 : 0);
