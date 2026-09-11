/**
 * A stand-in for Stripe, so the purchase can be tested without money.
 *
 * It speaks the two endpoints the Worker actually uses, in Stripe's own wire
 * format — form-encoded in, JSON out — and nothing else. Point the Worker at
 * it with `STRIPE_API_BASE=http://127.0.0.1:8799`.
 *
 * What this proves and what it does not, stated plainly, because the
 * difference matters when the thing being tested takes people's money:
 *
 *   It proves  — the Worker builds a correct session request, follows the
 *                redirect back, refuses to hand out a licence for a session
 *                that is not paid, mints the same code for the same session
 *                every time, and verifies a code it minted. It proves the app
 *                survives every one of those answers.
 *   It cannot  — prove that Stripe accepts the request, that a real card
 *                clears, or that the money arrives. Only a test-mode purchase
 *                against the real API does that, and that is a five-minute job
 *                with a test card once the keys are in place.
 *
 * Sessions start unpaid. `POST /pay/<id>` marks one paid, which is what the
 * test uses instead of typing a card number.
 *
 * Run with: node tools/fake_stripe.mjs [port]
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 8799);
/** id -> { paid, successUrl, cancelUrl, amount, currency } */
const sessions = new Map();

const send = (response, status, body) => {
  const text = JSON.stringify(body);
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(text);
};

const readBody = (request) =>
  new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => (raw += chunk));
    request.on('end', () => resolve(raw));
  });

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  // Create a session. Stripe requires the secret key, so check for one: a
  // Worker that forgets the header should fail here rather than in production.
  if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
    if (!(request.headers.authorization ?? '').startsWith('Bearer sk_')) {
      return send(response, 401, { error: { message: 'no api key' } });
    }
    const form = new URLSearchParams(await readBody(request));
    const id = `cs_test_${Math.random().toString(36).slice(2, 12)}`;
    const success = (form.get('success_url') ?? '').replace('{CHECKOUT_SESSION_ID}', id);
    sessions.set(id, {
      paid: false,
      successUrl: success,
      cancelUrl: form.get('cancel_url') ?? '',
      amount: Number(form.get('line_items[0][price_data][unit_amount]') ?? 0),
      currency: form.get('line_items[0][price_data][currency]') ?? '',
      // Kept verbatim so the test can check what was actually asked for —
      // the metadata and the statement descriptor matter when one Stripe
      // account sells more than one thing.
      form: Object.fromEntries(form.entries()),
    });
    return send(response, 200, {
      id,
      url: `http://127.0.0.1:${port}/checkout/${id}`,
      payment_status: 'unpaid',
    });
  }

  // Read a session back.
  const read = url.pathname.match(/^\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)$/);
  if (request.method === 'GET' && read) {
    const session = sessions.get(read[1]);
    if (!session) return send(response, 404, { error: { message: 'no such session' } });
    return send(response, 200, {
      id: read[1],
      payment_status: session.paid ? 'paid' : 'unpaid',
      amount_total: session.amount,
      currency: session.currency,
    });
  }

  // Not a Stripe endpoint: lets the test read back the request the Worker made.
  const sent = url.pathname.match(/^\/sent\/(cs_[A-Za-z0-9_]+)$/);
  if (request.method === 'GET' && sent) {
    const session = sessions.get(sent[1]);
    if (!session) return send(response, 404, { error: { message: 'no such session' } });
    return send(response, 200, session.form);
  }

  // Stands in for the hosted page and the card. The test calls this instead of
  // typing a card number; opening it in a browser redirects like Stripe does.
  const pay = url.pathname.match(/^\/pay\/(cs_[A-Za-z0-9_]+)$/);
  if (pay) {
    const session = sessions.get(pay[1]);
    if (!session) return send(response, 404, { error: { message: 'no such session' } });
    session.paid = true;
    if (url.searchParams.get('redirect') === '1') {
      response.writeHead(302, { location: session.successUrl });
      return response.end();
    }
    return send(response, 200, { paid: true, redirect: session.successUrl });
  }

  // The hosted checkout page, as a single button.
  const page = url.pathname.match(/^\/checkout\/(cs_[A-Za-z0-9_]+)$/);
  if (page) {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return response.end(
      `<!doctype html><meta charset="utf-8"><title>Fake Stripe</title>` +
        `<body style="font-family:system-ui;padding:2rem">` +
        `<h1>Nicht Stripe</h1><p>Nur zum Testen. Kein Geld bewegt sich.</p>` +
        `<p><a id="pay" href="/pay/${page[1]}?redirect=1">Bezahlen</a></p></body>`
    );
  }

  send(response, 404, { error: { message: 'not found' } });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Stripe-Attrappe auf http://127.0.0.1:${port}`);
  console.log('  POST /v1/checkout/sessions      Sitzung anlegen');
  console.log('  GET  /v1/checkout/sessions/:id  Sitzung lesen');
  console.log('  GET  /pay/:id?redirect=1        "bezahlen" und zurückleiten');
});
