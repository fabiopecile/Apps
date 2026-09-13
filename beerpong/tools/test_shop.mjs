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
 *
 * The price can also live in the Stripe dashboard instead of in the Worker.
 * That path is checked too, against a second Worker if one is running:
 *   cd server && npx wrangler dev --port 8788 \
 *     --var STRIPE_SECRET_KEY:sk_test_x --var LICENCE_SECRET:test-secret \
 *     --var STRIPE_API_BASE:http://127.0.0.1:8799 --var APP_URL:http://localhost:8081 \
 *     --var STRIPE_PRICE_ID:price_test_799
 * Without it those cases say so rather than passing quietly.
 */
const WORKER = process.env.WORKER_URL ?? 'http://127.0.0.1:8787';
const STRIPE = process.env.FAKE_STRIPE_URL ?? 'http://127.0.0.1:8799';
const CATALOG_WORKER = process.env.WORKER_CATALOG_URL ?? 'http://127.0.0.1:8788';
/**
 * A Worker with no Stripe keys at all, for the half-configured case:
 *   cd server && npx wrangler dev --port 8789 --var STRIPE_SECRET_KEY:sk_test_x
 * One key set and one missing is the state somebody lands in by adding the
 * second one under the wrong heading, and it must name the one that is absent.
 */
const HALF_WORKER = process.env.WORKER_HALF_URL ?? 'http://127.0.0.1:8789';

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
check(
  'and reports nothing missing',
  Array.isArray(shop.d.missing) && shop.d.missing.length === 0,
  JSON.stringify(shop.d.missing)
);

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

// --- one Stripe account, more than one product -----------------------------
// Somebody selling two things from one account needs each payment to be
// findable afterwards and recognisable on the buyer's bank statement.
const sentForm = await fetch(`${STRIPE}/sent/${session}`).then((r) => r.json());
check('the payment is tagged as this app', sentForm['metadata[app]'] === 'beerpong', JSON.stringify(sentForm['metadata[app]']));
check('and as which product', sentForm['metadata[product]'] === 'pro-camera');
check(
  'the bank statement says something recognisable',
  sentForm['payment_intent_data[statement_descriptor_suffix]'] === 'BEERPONG',
  JSON.stringify(sentForm['payment_intent_data[statement_descriptor_suffix]'])
);

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

// --- the price living in the Stripe dashboard ------------------------------
// The other way round: STRIPE_PRICE_ID set, so the Worker must ask Stripe what
// it costs and hand Stripe the id instead of a price of its own. Getting this
// wrong charges the wrong amount, which is the one bug nobody forgives.
if (await reachable(`${CATALOG_WORKER}/health`)) {
  const cat = (path) =>
    fetch(`${CATALOG_WORKER}${path}`).then((r) => r.json().then((d) => ({ status: r.status, d })));
  const catPost = (path, body) =>
    fetch(`${CATALOG_WORKER}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8081' },
      body: JSON.stringify(body ?? {}),
    }).then((r) => r.json().then((d) => ({ status: r.status, d })));

  // 7,99 € is what the stand-in's catalogue says for this id, and deliberately
  // not the Worker's own 4,99 €: reading 799 here can only mean it asked.
  const catShop = await cat('/shop');
  check(
    'with a price id, the shop reports the catalogue price, not the built-in one',
    catShop.d.enabled === true && catShop.d.amount === 799 && catShop.d.currency === 'eur',
    JSON.stringify(catShop.d)
  );

  const catStarted = await catPost('/checkout', { path: '/pro' });
  const catSession = catStarted.d.sessionId;
  check('and a checkout still starts', typeof catSession === 'string', JSON.stringify(catStarted.d));

  const catForm = await fetch(`${STRIPE}/sent/${catSession}`).then((r) => r.json());
  check(
    'the session points at the price, not at a price of its own',
    catForm['line_items[0][price]'] === 'price_test_799' &&
      !catForm['line_items[0][price_data][unit_amount]'],
    JSON.stringify(catForm['line_items[0][price]'])
  );

  await fetch(`${STRIPE}/pay/${catSession}`, { method: 'POST' });
  const catClaimed = await cat(`/licence?session=${catSession}`);
  check(
    'and paying it still yields a code',
    catClaimed.d.paid === true && /^BP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(catClaimed.d.licence ?? ''),
    JSON.stringify(catClaimed.d)
  );
  check(
    'which verifies',
    (await catPost('/licence/verify', { licence: catClaimed.d.licence })).d.ok === true
  );
} else {
  console.log('  --   Katalogpreis (STRIPE_PRICE_ID) — zweiter Worker läuft nicht, übersprungen');
}

// --- half configured -------------------------------------------------------
// The shop being shut is not a bug; not saying which of the two names is
// absent is, because from outside the two cases look identical and the fix
// differs. Names only — never values.
if (await reachable(`${HALF_WORKER}/health`)) {
  const half = await fetch(`${HALF_WORKER}/shop`).then((r) => r.json());
  check('a half-configured shop is shut', half.enabled === false, JSON.stringify(half));
  check(
    'and names the one that is missing, and only that one',
    Array.isArray(half.missing) &&
      half.missing.length === 1 &&
      half.missing[0] === 'LICENCE_SECRET',
    JSON.stringify(half.missing)
  );
} else {
  console.log('  --   halb eingerichteter Worker läuft nicht, übersprungen');
}

// --- more than one thing for sale -----------------------------------------
// A cup design at €1.99 beside the camera at €4.99. The case that matters is
// the cheap one buying the dear one: both are "a code", and until the item went
// into the signature they were the same twelve characters.
const shopItems = Object.fromEntries((shop.d.items ?? []).map((entry) => [entry.id, entry.amount]));
check('the price list reaches the app', typeof shopItems['item-cup-at'] === 'number', JSON.stringify(shop.d.items?.slice(0, 3)));
check('a cup design costs 1,99 €', shopItems['item-cup-at'] === 199, String(shopItems['item-cup-at']));
check('the bundle costs less than four of them', shopItems['cups-all'] < 4 * 199, String(shopItems['cups-all']));

const cupStart = await post('/checkout', { path: '/(tabs)/arcade/cups', item: 'item-cup-at' });
check('a design can be bought', typeof cupStart.d.sessionId === 'string', JSON.stringify(cupStart.d));
const cupForm = await fetch(`${STRIPE}/sent/${cupStart.d.sessionId}`).then((r) => r.json());
check(
  'and is charged at 1,99 €, priced by the server',
  cupForm['line_items[0][price_data][unit_amount]'] === '199',
  cupForm['line_items[0][price_data][unit_amount]']
);
check(
  'the checkout page says which design',
  String(cupForm['line_items[0][price_data][product_data][name]']).includes('Österreich'),
  cupForm['line_items[0][price_data][product_data][name]']
);
check('and the session records the item', cupForm['metadata[item]'] === 'item-cup-at');

await fetch(`${STRIPE}/pay/${cupStart.d.sessionId}`, { method: 'POST' });
const cupClaim = await get(`/licence?session=${cupStart.d.sessionId}`);
check('paying it yields a code', cupClaim.d.paid === true && !!cupClaim.d.licence, JSON.stringify(cupClaim.d));
check('and the answer says what was bought', cupClaim.d.item === 'item-cup-at', String(cupClaim.d.item));

const cupCode = cupClaim.d.licence;
check('the code opens that design', (await post('/licence/verify', { licence: cupCode, item: 'item-cup-at' })).d.ok === true);
check(
  'and not another one',
  (await post('/licence/verify', { licence: cupCode, item: 'item-cup-de' })).d.ok === false
);
check(
  'and not the camera — €1.99 must not buy €4.99',
  (await post('/licence/verify', { licence: cupCode, item: 'pro' })).d.ok === false
);
check(
  'and not the whole bundle',
  (await post('/licence/verify', { licence: cupCode, item: 'cups-all' })).d.ok === false
);
check(
  'the camera code does not open a design either',
  (await post('/licence/verify', { licence, item: 'item-cup-at' })).d.ok === false
);

// Asking for a dearer item than was paid for, by editing the address bar.
const swapped = await get(`/licence?session=${cupStart.d.sessionId}&item=pro`);
check(
  'the item cannot be swapped on the way home',
  swapped.d.item === 'item-cup-at' && swapped.d.licence === cupCode,
  JSON.stringify(swapped.d)
);

check(
  'an invented item cannot be bought',
  (await post('/checkout', { path: '/pro', item: 'item-cup-atlantis' })).status === 400
);

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad > 0 ? 1 : 0);
