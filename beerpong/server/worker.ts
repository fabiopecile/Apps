/// <reference types="@cloudflare/workers-types" />

/**
 * The room that holds one online match.
 *
 * There is very little here on purpose. The rules live in
 * `../lib/onlineProtocol.ts`, which the app imports too, so the phone and the
 * room can never disagree about what a report means. This file is only the
 * part that cannot be pure: who is connected, who holds which seat, and
 * keeping the score somewhere that survives both phones losing signal.
 *
 * One Durable Object per room code. The object is the single writer, so there
 * is no merging to do and no clock to trust: every accepted action bumps a
 * version and the whole state goes back out to both phones. A beer pong match
 * is a few hundred bytes and a few dozen messages, so sending all of it every
 * time costs less than being clever would.
 *
 * Nothing about a game is stored beyond it: no accounts, no video, no history
 * across matches. Twelve hours after the last message the room deletes itself
 * and the code is free again.
 */

import {
  applyAction,
  createMatch,
  isOnlineAction,
  isRoomCode,
  normaliseRoomCode,
  type OnlineMatch,
  type Seat,
  type ServerMessage,
} from '../lib/onlineProtocol';

import {
  DEFAULT_CURRENCY,
  DEFAULT_PRICE_CENTS,
  LICENCE_BODY,
  LICENCE_CHECK,
  encodeLicenceChars,
  formatLicence,
  splitLicence,
} from '../lib/licence';

import { isSaveCode, normaliseSaveCode } from '../lib/saveCode';

export interface Env {
  ROOMS: DurableObjectNamespace;
  /** One object per save code; see the `Save` class at the bottom. */
  SAVES: DurableObjectNamespace;
  /** Set with `wrangler secret put STRIPE_SECRET_KEY`. Absent = shop closed. */
  STRIPE_SECRET_KEY?: string;
  /** Set with `wrangler secret put LICENCE_SECRET`. Absent = shop closed. */
  LICENCE_SECRET?: string;
  /** Price in cents. Defaults to 499. */
  SHOP_PRICE_CENTS?: string;
  SHOP_CURRENCY?: string;
  /** Where to send people back to. Defaults to the browser's own origin. */
  APP_URL?: string;
  /** Pointed elsewhere only by the test stub; see tools/fake_stripe.mjs. */
  STRIPE_API_BASE?: string;
}

/** A room with nothing happening in it is gone by the next evening. */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Anything longer than this is not one of our messages. */
const MAX_MESSAGE_BYTES = 1024;

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  // PUT and DELETE are the backup's; leaving them out made the browser's
  // preflight refuse the write before it was ever sent, which showed up as
  // "turning backup on does nothing" rather than as an error anybody could see.
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Lets the app say "the server is reachable" before anyone types a code,
    // and gives the setup instructions in the README something to curl.
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    // A save lives under its code, the same way a room does. The code is the
    // only secret there is, so it is also the only thing checked.
    if (url.pathname.startsWith('/save/')) {
      const saveCode = normaliseSaveCode(url.pathname.slice('/save/'.length));
      if (!isSaveCode(saveCode)) return json({ error: 'code' }, 400);
      return env.SAVES.get(env.SAVES.idFromName(saveCode)).fetch(request);
    }

    if (url.pathname === '/shop') return shopInfo(env);
    if (url.pathname === '/checkout') return startCheckout(request, env);
    if (url.pathname === '/licence') return claimLicence(url, env);
    if (url.pathname === '/licence/verify') return verifyLicence(request, env);

    const code = normaliseRoomCode(url.pathname.replace(/^\/room\//, ''));
    if (!url.pathname.startsWith('/room/') || !isRoomCode(code)) {
      return new Response('not found', { status: 404, headers: CORS });
    }

    // The code *is* the address. Two phones typing the same four characters
    // reach the same object, wherever in the world they are.
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
};

// ---------------------------------------------------------------- the shop
//
// One thing is for sale: the camera counting cups without a weekly limit. The
// whole transaction is Stripe Checkout and two lookups, with no database on
// this side — what somebody bought is proven by a code that verifies itself,
// which is the only way to have a purchase survive a new phone without making
// everybody create an account for €4.99.

/** Stripe's API is form-encoded, so there is no SDK worth pulling in. */
async function stripe(
  env: Env,
  path: string,
  init?: { method?: string; body?: Record<string, string> }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const base = env.STRIPE_API_BASE ?? 'https://api.stripe.com';
  const response = await fetch(`${base}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init?.body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.body ? new URLSearchParams(init.body).toString() : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

function shopOpen(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.LICENCE_SECRET);
}

function priceOf(env: Env): { amount: number; currency: string } {
  const amount = Number(env.SHOP_PRICE_CENTS ?? DEFAULT_PRICE_CENTS);
  return {
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : DEFAULT_PRICE_CENTS,
    currency: (env.SHOP_CURRENCY ?? DEFAULT_CURRENCY).toLowerCase(),
  };
}

/**
 * What is for sale, if anything.
 *
 * The app asks rather than assumes, so a Worker without Stripe keys says "not
 * purchasable" on the Pro screen instead of showing a button that fails.
 */
function shopInfo(env: Env): Response {
  const { amount, currency } = priceOf(env);
  return json({ enabled: shopOpen(env), amount, currency });
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

/**
 * The code for a paid session.
 *
 * Derived from the session rather than random, so claiming twice — a closed
 * tab, a refresh, a second attempt an hour later — gives back the same code
 * instead of minting a new one each time.
 */
async function licenceFor(secret: string, sessionId: string): Promise<string> {
  const body = encodeLicenceChars(await hmac(secret, `id:${sessionId}`), LICENCE_BODY);
  const check = encodeLicenceChars(await hmac(secret, `check:${body}`), LICENCE_CHECK);
  return formatLicence(body, check);
}

async function licenceValid(secret: string, code: string): Promise<boolean> {
  const parts = splitLicence(code);
  if (!parts) return false;
  const expected = encodeLicenceChars(await hmac(secret, `check:${parts.body}`), LICENCE_CHECK);
  // Constant time is overkill against a check this short, but comparing
  // properly costs nothing and stops the habit forming.
  let same = expected.length === parts.check.length ? 0 : 1;
  for (let i = 0; i < expected.length; i++) {
    same |= expected.charCodeAt(i) ^ parts.check.charCodeAt(i);
  }
  return same === 0;
}

/** Where Stripe sends the browser back to. */
function appOrigin(request: Request, env: Env): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, '');
  const origin = request.headers.get('origin');
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/+$/, '');
  return '';
}

async function startCheckout(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!shopOpen(env)) return json({ error: 'closed' }, 503);

  const origin = appOrigin(request, env);
  if (!origin) return json({ error: 'origin' }, 400);

  const { amount, currency } = priceOf(env);
  const body = await request.json<{ path?: string }>().catch(() => ({}) as { path?: string });
  // The app says which of its routes to come back to, because the web build
  // can live under a sub-path on Pages.
  const back = typeof body.path === 'string' && body.path.startsWith('/') ? body.path : '/pro';

  const result = await stripe(env, '/v1/checkout/sessions', {
    method: 'POST',
    body: {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': currency,
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': 'Beerpong Pro',
      'line_items[0][price_data][product_data][description]':
        'Kamera-Tracking ohne Wochenlimit. Einmalig, kein Abo.',
      success_url: `${origin}${back}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${back}?paid=cancelled`,
    },
  });

  if (!result.ok) return json({ error: 'stripe', status: result.status }, 502);
  const id = typeof result.data.id === 'string' ? result.data.id : null;
  const checkoutUrl = typeof result.data.url === 'string' ? result.data.url : null;
  if (!id || !checkoutUrl) return json({ error: 'stripe' }, 502);
  return json({ sessionId: id, url: checkoutUrl });
}

/**
 * Turns a paid session into a code.
 *
 * Deliberately asks Stripe rather than trusting the redirect: the browser came
 * back from Stripe with a session id in the address bar, and an address bar is
 * something anybody can type into.
 */
async function claimLicence(url: URL, env: Env): Promise<Response> {
  if (!shopOpen(env)) return json({ error: 'closed' }, 503);
  const session = url.searchParams.get('session') ?? '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return json({ error: 'session' }, 400);

  const result = await stripe(env, `/v1/checkout/sessions/${session}`);
  if (!result.ok) return json({ paid: false }, result.status === 404 ? 404 : 502);
  if (result.data.payment_status !== 'paid') return json({ paid: false });

  return json({ paid: true, licence: await licenceFor(env.LICENCE_SECRET!, session) });
}

async function verifyLicence(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.LICENCE_SECRET) return json({ error: 'closed' }, 503);
  const body = await request
    .json<{ licence?: string }>()
    .catch(() => ({}) as { licence?: string });
  const code = typeof body.licence === 'string' ? body.licence : '';
  return json({ ok: await licenceValid(env.LICENCE_SECRET, code) });
}

interface RoomRecord {
  code: string;
  match: OnlineMatch;
  touchedAt: number;
}

export class Room implements DurableObject {
  private record: RoomRecord | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env
  ) {
    // Read once on wake rather than on every message: the object is the only
    // writer, so what is in memory is always current.
    this.ctx.blockConcurrencyWhile(async () => {
      this.record = (await this.ctx.storage.get<RoomRecord>('room')) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426, headers: CORS });
    }

    const code = normaliseRoomCode(url.pathname.replace(/^\/room\//, ''));
    const seat: Seat = url.searchParams.get('seat') === '1' ? 1 : 0;
    const creating = url.searchParams.get('create') === '1';
    const name = url.searchParams.get('name') ?? '';
    const cups = Number(url.searchParams.get('cups') ?? '10');

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    const refuse = (reason: 'full' | 'missing' | 'taken', closeCode: number) => {
      // Accepted first and closed straight after: a browser cannot read the
      // body of a refused handshake, so the only way to say *why* is to say it
      // over the socket.
      server.accept();
      server.send(JSON.stringify({ type: 'error', reason } satisfies ServerMessage));
      server.close(closeCode, reason);
      return new Response(null, { status: 101, webSocket: client });
    };

    const now = Date.now();
    const stale = this.record != null && now - this.record.touchedAt > ROOM_TTL_MS;
    if (stale) this.record = null;

    if (creating) {
      // A code somebody is still playing on is never handed out twice; the app
      // just picks another and tries again.
      if (this.record != null && !stale) return refuse('taken', 4009);
      this.record = {
        code,
        match: createMatch(
          [6, 10, 15].includes(cups) ? cups : 10,
          [name.slice(0, 16) || 'Team 1', 'Team 2'],
          now
        ),
        touchedAt: now,
      };
      await this.save();
    } else {
      if (this.record == null) return refuse('missing', 4004);
      if (name.trim().length > 0) {
        this.record.match = applyAction(this.record.match, seat, { type: 'rename', name }, now);
      }
    }

    if (this.seatTaken(seat)) return refuse('full', 4001);

    this.ctx.acceptWebSocket(server, [String(seat)]);
    // Twelve hours from the last thing that happened, not from the start.
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
    this.broadcast();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return;
    if (this.record == null) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    // A keep-alive is not an action; it is only here to hold the socket open
    // through a phone-network idle timeout.
    if ((parsed as { type?: string })?.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (!isOnlineAction(parsed)) return;

    const seat = this.seatOf(ws);
    if (seat == null) return;

    const now = Date.now();
    const next = applyAction(this.record.match, seat, parsed, now);
    this.record.touchedAt = now;
    if (next === this.record.match) return;

    this.record.match = next;
    await this.save();
    this.broadcast();
  }

  async webSocketClose(): Promise<void> {
    // Presence is what the other phone shows as "connected", so it is worth a
    // message of its own.
    this.broadcast();
  }

  async webSocketError(): Promise<void> {
    this.broadcast();
  }

  /** Nothing happened for half a day: forget the game and free the code. */
  async alarm(): Promise<void> {
    if (this.record != null && Date.now() - this.record.touchedAt < ROOM_TTL_MS) {
      await this.ctx.storage.setAlarm(this.record.touchedAt + ROOM_TTL_MS);
      return;
    }
    this.record = null;
    await this.ctx.storage.deleteAll();
  }

  private async save(): Promise<void> {
    if (this.record != null) await this.ctx.storage.put('room', this.record);
  }

  private liveSockets(seat: Seat): WebSocket[] {
    return this.ctx.getWebSockets(String(seat)).filter((ws) => ws.readyState === 1);
  }

  private seatTaken(seat: Seat): boolean {
    return this.liveSockets(seat).length > 0;
  }

  private seatOf(ws: WebSocket): Seat | null {
    const tags = this.ctx.getTags(ws);
    if (tags.includes('0')) return 0;
    if (tags.includes('1')) return 1;
    return null;
  }

  private broadcast(): void {
    if (this.record == null) return;
    const present: [boolean, boolean] = [this.seatTaken(0), this.seatTaken(1)];
    for (const seat of [0, 1] as const) {
      const payload = JSON.stringify({
        type: 'state',
        match: this.record.match,
        present,
        seat,
        code: this.record.code,
      } satisfies ServerMessage);
      for (const ws of this.liveSockets(seat)) {
        try {
          ws.send(payload);
        } catch {
          // A socket that died between the check and the send is the other
          // side's problem, and its close event is already on its way.
        }
      }
    }
  }
}

/**
 * One save, under one code.
 *
 * Deliberately dumb: it holds a blob of JSON it never looks inside, plus when
 * it was written. The app decides what a save *is*; this decides only that the
 * newest one wins and that it does not sit here forever.
 *
 * No merging. Two phones on one code is last-write-wins, and pretending
 * otherwise — conflict resolution for a single player's coin count — would be
 * a great deal of machinery in service of a problem nobody has.
 */
export class Save implements DurableObject {
  /** A save nobody has touched in a year is not a save anybody wants. */
  private static readonly TTL_MS = 365 * 24 * 60 * 60 * 1000;
  /** The real thing is a few kilobytes. This is a guard, not a budget. */
  private static readonly MAX_BYTES = 256 * 1024;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      const stored = await this.ctx.storage.get<{ updatedAt: number; state: string }>('save');
      if (!stored) return json({ found: false }, 404);
      return json({ found: true, updatedAt: stored.updatedAt, state: stored.state });
    }

    if (request.method === 'PUT') {
      const body = await request
        .json<{ state?: string; updatedAt?: number }>()
        .catch(() => ({}) as { state?: string; updatedAt?: number });
      if (typeof body.state !== 'string' || body.state.length === 0) {
        return json({ error: 'state' }, 400);
      }
      if (body.state.length > Save.MAX_BYTES) return json({ error: 'tooBig' }, 413);

      const updatedAt = typeof body.updatedAt === 'number' ? body.updatedAt : Date.now();
      const existing = await this.ctx.storage.get<{ updatedAt: number }>('save');
      // Out-of-order arrivals lose. Two devices racing is still last-write-wins
      // by their own clocks, which is the honest limit of a design with no
      // accounts and no merge.
      if (existing && existing.updatedAt > updatedAt) {
        return json({ ok: false, stale: true, updatedAt: existing.updatedAt }, 409);
      }

      await this.ctx.storage.put('save', { updatedAt, state: body.state });
      await this.ctx.storage.setAlarm(Date.now() + Save.TTL_MS);
      return json({ ok: true, updatedAt });
    }

    if (request.method === 'DELETE') {
      await this.ctx.storage.deleteAll();
      return json({ ok: true });
    }

    return json({ error: 'method' }, 405);
  }

  async alarm(): Promise<void> {
    const stored = await this.ctx.storage.get<{ updatedAt: number }>('save');
    if (stored && Date.now() - stored.updatedAt < Save.TTL_MS) {
      await this.ctx.storage.setAlarm(stored.updatedAt + Save.TTL_MS);
      return;
    }
    await this.ctx.storage.deleteAll();
  }
}
