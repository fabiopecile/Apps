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
  licenceBodyMessage,
  licenceCheckMessage,
  splitLicence,
} from '../lib/licence';

import { isSaveCode, normaliseSaveCode } from '../lib/saveCode';
import {
  PARTY_WATCHER_LIMIT,
  isPartyAction,
  isPartyCode,
  normalisePartyCode,
  type PartyMessage,
  type PartyState,
} from '../lib/partyProtocol';

import { CATALOGUE, PRO_ITEM, catalogueItem } from '../lib/catalogue';
import { CUP_DESIGNS } from '../lib/cupSkins';

export interface Env {
  PARTIES: DurableObjectNamespace;
  ROOMS: DurableObjectNamespace;
  /** One object per save code; see the `Save` class at the bottom. */
  SAVES: DurableObjectNamespace;
  /** One object per division: whoever is waiting for an opponent. */
  QUEUE: DurableObjectNamespace;
  /** Set with `wrangler secret put STRIPE_SECRET_KEY`. Absent = shop closed. */
  STRIPE_SECRET_KEY?: string;
  /** Set with `wrangler secret put LICENCE_SECRET`. Absent = shop closed. */
  LICENCE_SECRET?: string;
  /**
   * A price from the Stripe product catalogue (`price_...`).
   *
   * Set it and Stripe owns the price: it can be changed in the dashboard
   * without touching this code, and the product's own name and description
   * appear on the checkout page. Leave it unset and the price below is used
   * and built into each session, which needs no dashboard setup at all.
   */
  STRIPE_PRICE_ID?: string;
  /** Price in cents, used only when there is no STRIPE_PRICE_ID. */
  SHOP_PRICE_CENTS?: string;
  SHOP_CURRENCY?: string;
  /** Where to send people back to. Defaults to the browser's own origin. */
  APP_URL?: string;
  /**
   * What the buyer sees on their bank statement, after the account's own
   * prefix. Matters when one Stripe account sells more than one thing: a
   * charge from an unfamiliar name is a charge people dispute.
   *
   * Stripe allows 22 characters for the whole descriptor including the prefix
   * and its separator, and none of < > ' " *.
   */
  SHOP_STATEMENT_SUFFIX?: string;
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

    // Looking for somebody to play. One queue per division, so a beginner is
    // not handed the best player in the app as their first opponent.
    if (url.pathname.startsWith('/queue')) {
      const division = Math.max(1, Math.min(10, Number(url.searchParams.get('division') ?? '10')));
      const id = env.QUEUE.idFromName(`division-${division}`);
      return env.QUEUE.get(id).fetch(request);
    }

    // One table, one phone counting it, everyone else watching. Separate from
    // a room on purpose — see `lib/partyProtocol.ts` for why the trust model is
    // a different one.
    if (url.pathname.startsWith('/party/')) {
      const partyCode = normalisePartyCode(url.pathname.slice('/party/'.length));
      if (!isPartyCode(partyCode)) {
        return new Response('not found', { status: 404, headers: CORS });
      }
      return env.PARTIES.get(env.PARTIES.idFromName(partyCode)).fetch(request);
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
 * The catalogue price, looked up once and remembered for a while.
 *
 * The Pro screen asks what things cost every time it opens, and a Stripe call
 * per screen open would be silly for a number that changes about never. Five
 * minutes is short enough that a price change in the dashboard shows up while
 * somebody is still looking at the dashboard.
 */
let priceCache: { at: number; amount: number; currency: string } | null = null;
const PRICE_CACHE_MS = 5 * 60 * 1000;

async function catalogPrice(env: Env): Promise<{ amount: number; currency: string } | null> {
  if (!env.STRIPE_PRICE_ID) return null;
  if (priceCache && Date.now() - priceCache.at < PRICE_CACHE_MS) {
    return { amount: priceCache.amount, currency: priceCache.currency };
  }
  const result = await stripe(env, `/v1/prices/${env.STRIPE_PRICE_ID}`);
  const amount = result.data.unit_amount;
  const currency = result.data.currency;
  if (!result.ok || typeof amount !== 'number' || typeof currency !== 'string') return null;
  priceCache = { at: Date.now(), amount, currency };
  return { amount, currency };
}

/**
 * What is for sale, if anything.
 *
 * The app asks rather than assumes, so a Worker without Stripe keys says "not
 * purchasable" on the Pro screen instead of showing a button that fails.
 */
async function shopInfo(env: Env): Promise<Response> {
  const open = shopOpen(env);
  // A price id that Stripe will not confirm falls back to the configured one
  // rather than showing nothing: a wrong number on the button is better than a
  // screen that cannot say what it costs.
  const fromCatalog = open ? await catalogPrice(env) : null;
  const { amount, currency } = fromCatalog ?? priceOf(env);
  // Which of the two is absent, by name. Two keys mean two ways to be half
  // configured, and from outside both look the same. This says whether a name
  // is set, never anything about its value — the difference between fixing it
  // in ten seconds and hunting through a dashboard for an evening.
  const missing = open
    ? []
    : [
        env.STRIPE_SECRET_KEY ? null : 'STRIPE_SECRET_KEY',
        env.LICENCE_SECRET ? null : 'LICENCE_SECRET',
      ].filter((name): name is string => name !== null);
  return json({
    enabled: open,
    amount,
    currency,
    missing,
    // Every price in one answer. The app draws what this says, so a price is
    // changed in one place and both ends move together.
    items: CATALOGUE.map((entry) => ({
      id: entry.id,
      amount: entry.kind === 'pro' ? amount : entry.cents,
    })),
  });
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
async function licenceFor(secret: string, sessionId: string, item: string): Promise<string> {
  const body = encodeLicenceChars(await hmac(secret, licenceBodyMessage(sessionId, item)), LICENCE_BODY);
  const check = encodeLicenceChars(await hmac(secret, licenceCheckMessage(body, item)), LICENCE_CHECK);
  return formatLicence(body, check);
}

async function licenceValid(secret: string, code: string, item: string): Promise<boolean> {
  const parts = splitLicence(code);
  if (!parts) return false;
  const expected = encodeLicenceChars(
    await hmac(secret, licenceCheckMessage(parts.body, item)),
    LICENCE_CHECK
  );
  // Constant time is overkill against a check this short, but comparing
  // properly costs nothing and stops the habit forming.
  let same = expected.length === parts.check.length ? 0 : 1;
  for (let i = 0; i < expected.length; i++) {
    same |= expected.charCodeAt(i) ^ parts.check.charCodeAt(i);
  }
  return same === 0;
}

/**
 * What is being bought: either a price from the catalogue, or one built here.
 *
 * The catalogue version is the better one to grow into — the price lives where
 * somebody can change it without a deploy — but making it *required* would
 * mean nobody can sell anything until they have set up a product, so the
 * built-in price stays as the path of least setup.
 */
/**
 * What the buyer sees on Stripe's own page, per item.
 *
 * German, because that is the language the app is sold in, and specific: a
 * checkout page that says only "Beerpong" leaves somebody paying €1.99 with no
 * way to tell which of thirteen things they are paying for.
 */
function describeItem(itemId: string): { title: string; body: string } {
  const item = catalogueItem(itemId);
  if (!item || item.kind === 'pro') {
    return {
      title: 'Beerpong Pro',
      body: 'Kamera-Tracking ohne Wochenlimit. Einmalig, kein Abo.',
    };
  }
  if (item.kind === 'bundle') {
    return {
      title: 'Beerpong — alle Becher-Designs',
      body: `Alle ${item.unlocks?.length ?? 0} Länder-Becher auf einmal. Einmalig, kein Abo.`,
    };
  }
  const design = CUP_DESIGNS.find((entry) => entry.id === item.design);
  return {
    title: `Beerpong — Becher ${design?.name ?? item.design}`,
    body: 'Ein Becher-Design für das Arcade-Spiel. Einmalig, kein Abo.',
  };
}

function lineItem(env: Env, itemId: string): Record<string, string> {
  // A price from the dashboard only ever stood for the camera unlock, which is
  // what STRIPE_PRICE_ID was added for. The cup designs are a dozen small
  // things priced in one list here; asking somebody to create a dozen Stripe
  // products before they can sell a sticker would be a worse trade.
  if (itemId === PRO_ITEM && env.STRIPE_PRICE_ID) {
    return { 'line_items[0][price]': env.STRIPE_PRICE_ID };
  }
  const item = catalogueItem(itemId);
  const { amount, currency } = priceOf(env);
  const cents = item && item.kind !== 'pro' ? item.cents : amount;
  const name = describeItem(itemId);
  return {
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': name.title,
    'line_items[0][price_data][product_data][description]': name.body,
  };
}

/**
 * The line on the buyer's bank statement.
 *
 * Left out entirely when nothing is configured, so Stripe falls back to the
 * account's own descriptor — which is right for an account that sells only
 * this. Set it when the account sells something else too.
 */
function statementDescriptor(env: Env): Record<string, string> {
  const suffix = (env.SHOP_STATEMENT_SUFFIX ?? '').trim();
  if (!suffix) return {};
  // Stripe rejects these outright, and a rejected session is a failed sale.
  const clean = suffix.replace(/[<>'"*]/g, '').slice(0, 22);
  return clean ? { 'payment_intent_data[statement_descriptor_suffix]': clean } : {};
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

  const body = await request
    .json<{ path?: string; item?: string }>()
    .catch(() => ({}) as { path?: string; item?: string });
  // The app says which of its routes to come back to, because the web build
  // can live under a sub-path on Pages.
  const back = typeof body.path === 'string' && body.path.startsWith('/') ? body.path : '/pro';
  // What is being bought. Priced here, never by the app: a price that came
  // off the phone would be a price anybody could edit before sending it.
  const item = catalogueItem(typeof body.item === 'string' ? body.item : PRO_ITEM);
  if (!item) return json({ error: 'item' }, 400);

  const result = await stripe(env, '/v1/checkout/sessions', {
    method: 'POST',
    body: {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      ...lineItem(env, item.id),
      success_url: `${origin}${back}?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${back}?paid=cancelled`,
      // So this is findable in a dashboard shared with another product.
      'metadata[app]': 'beerpong',
      'metadata[product]': item.kind === 'pro' ? 'pro-camera' : item.id,
      // Read back when the code is claimed, so the item cannot be swapped for
      // a dearer one on the way home.
      'metadata[item]': item.id,
      ...statementDescriptor(env),
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

  // What was actually paid for, according to Stripe rather than according to
  // the query string. A session for a €1.99 cup must not be able to ask for a
  // €4.99 code by adding &item=pro to the address bar.
  const metadata = (result.data.metadata ?? {}) as Record<string, unknown>;
  const paidFor = typeof metadata.item === 'string' ? metadata.item : PRO_ITEM;
  const item = catalogueItem(paidFor);
  if (!item) return json({ paid: true, error: 'item' }, 500);

  return json({
    paid: true,
    item: item.id,
    licence: await licenceFor(env.LICENCE_SECRET!, session, item.id),
  });
}

async function verifyLicence(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.LICENCE_SECRET) return json({ error: 'closed' }, 503);
  const body = await request
    .json<{ licence?: string; item?: string }>()
    .catch(() => ({}) as { licence?: string; item?: string });
  const code = typeof body.licence === 'string' ? body.licence : '';
  const asked = typeof body.item === 'string' ? body.item : PRO_ITEM;
  if (!catalogueItem(asked)) return json({ ok: false });
  return json({ ok: await licenceValid(env.LICENCE_SECRET, code, asked) });
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
    const code = normaliseRoomCode(url.pathname.replace(/^\/room\//, ''));

    /**
     * Made by the matchmaking queue, before either phone is told about it.
     *
     * Without this the two raced: both were sent the same code and told which
     * of them should open it, and the one joining regularly arrived first and
     * was turned away with "no such room". Reserving it here means both sides
     * only ever join something that already exists, and the order they arrive
     * in stops mattering.
     */
    if (request.method === 'POST' && url.searchParams.get('reserve') === '1') {
      const now = Date.now();
      const stale = this.record != null && now - this.record.touchedAt > ROOM_TTL_MS;
      if (this.record == null || stale) {
        const cups = Number(url.searchParams.get('cups') ?? '10');
        this.record = {
          code,
          match: createMatch(
            [6, 10, 15].includes(cups) ? cups : 10,
            ['Team 1', 'Team 2'],
            now,
            url.searchParams.get('game') === 'arcade' ? 'arcade' : 'camera'
          ),
          touchedAt: now,
        };
        await this.save();
        await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
      }
      return json({ ok: true, code });
    }

    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426, headers: CORS });
    }

    const seat: Seat = url.searchParams.get('seat') === '1' ? 1 : 0;
    const creating = url.searchParams.get('create') === '1';
    const name = url.searchParams.get('name') ?? '';
    const cups = Number(url.searchParams.get('cups') ?? '10');
    // Which game the room holds. Only read when the room is opened — whoever
    // joins gets whatever the room already is.
    const game = url.searchParams.get('game') === 'arcade' ? 'arcade' : 'camera';

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
          now,
          game
        ),
        touchedAt: now,
      };
      await this.save();
    } else {
      if (this.record == null) return refuse('missing', 4004);
      if (name.trim().length > 0) {
        this.record.match = applyAction(this.record.match, seat, { type: 'rename', name }, now);
        // Written down, not just held in memory. Sockets here hibernate: the
        // object is torn down between messages and built again from storage,
        // so a name that was only ever in memory came back as "Team 2" at the
        // first throw. It showed on the other phone first and then quietly
        // reverted, which is the sort of thing that reads as the app losing
        // track of who is playing.
        await this.save();
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
 * A scoreboard a room full of people can watch.
 *
 * The host's phone counts the game and sends what it counted; everybody else
 * gets a copy and can do nothing at all. This object keeps the last state so
 * somebody who scans the code halfway through the evening sees the score
 * immediately rather than an empty screen until the next cup goes down.
 *
 * Sockets hibernate here the same way they do in a Room, so the state lives in
 * storage rather than in a field — the object is torn down between messages and
 * rebuilt from disk, and anything held only in memory comes back empty.
 */
export class Party implements DurableObject {
  /** Long enough for a party, short enough that nothing lingers. */
  private static readonly TTL_MS = 12 * 60 * 60 * 1000;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426, headers: CORS });
    }
    const url = new URL(request.url);
    const hosting = url.searchParams.get('host') === '1';

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const refuse = (reason: 'hosted' | 'full', closeCode: number) => {
      server.accept();
      server.send(JSON.stringify({ type: 'error', reason } satisfies PartyMessage));
      server.close(closeCode, reason);
      return new Response(null, { status: 101, webSocket: client });
    };

    if (hosting && this.sockets('host').length > 0) {
      // Two phones both claiming to be the scoreboard would fight over the
      // score, and the watchers would see it flicker between two versions.
      return refuse('hosted', 4010);
    }
    if (!hosting && this.sockets('watch').length >= PARTY_WATCHER_LIMIT) {
      return refuse('full', 4011);
    }

    this.ctx.acceptWebSocket(server, [hosting ? 'host' : 'watch']);
    await this.ctx.storage.setAlarm(Date.now() + Party.TTL_MS);
    await this.tell();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES * 4) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (!isPartyAction(parsed)) return;
    if (parsed.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' } satisfies PartyMessage));
      return;
    }
    // Only the host writes. A watcher sending a score is not an error worth
    // reporting — it is somebody with the developer tools open — so it is
    // simply ignored.
    if (!this.ctx.getTags(ws).includes('host')) return;

    const stored = await this.ctx.storage.get<PartyState>('state');
    // Out of order arrivals would otherwise let an older score overwrite a
    // newer one, and the scoreboard would count backwards.
    if (stored != null && parsed.state.version < stored.version) return;
    await this.ctx.storage.put('state', parsed.state);
    await this.ctx.storage.setAlarm(Date.now() + Party.TTL_MS);
    await this.tell();
  }

  async webSocketClose(): Promise<void> {
    await this.tell();
  }

  async webSocketError(): Promise<void> {
    await this.tell();
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, 'over');
      } catch {
        // Already gone.
      }
    }
  }

  private sockets(tag: 'host' | 'watch'): WebSocket[] {
    return this.ctx.getWebSockets(tag).filter((ws) => ws.readyState === 1);
  }

  private async tell(): Promise<void> {
    const state = (await this.ctx.storage.get<PartyState>('state')) ?? null;
    const payload = JSON.stringify({
      type: 'party',
      state,
      watchers: this.sockets('watch').length,
      hosted: this.sockets('host').length > 0,
    } satisfies PartyMessage);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== 1) continue;
      try {
        ws.send(payload);
      } catch {
        // Its close event is already on the way.
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

/**
 * Whoever is waiting for an opponent, per division.
 *
 * The smallest thing that can honestly be called matchmaking: two sockets in
 * the same object get a room code and are told to go and play in it. There is
 * no rating beyond the division somebody is already in, because a rating needs
 * a history and a history needs accounts.
 *
 * What it deliberately does not do is pretend. If nobody else is waiting, it
 * says so and keeps saying so — the app then offers the computer, labelled as
 * the computer. An app with few players that fakes a human opponent is an app
 * that gets found out, and this one already has a plausible-gamertag generator
 * it can fall back to without lying about what it is.
 */
export class Queue implements DurableObject {
  /** Sockets waiting, oldest first. */
  private waiting: WebSocket[] = [];

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    // Sockets survive the object being evicted, so pick them back up on wake
    // rather than starting with an empty queue and stranding whoever is in it.
    // Order is lost when that happens, which only costs fairness about who
    // waited longest — not correctness, since the room is made before either
    // phone hears about it.
    this.waiting = this.ctx.getWebSockets();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return json({ waiting: this.waiting.length });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    // Appended rather than re-read from the runtime: `getWebSockets()` makes no
    // promise about order, and first-come-first-served is the one thing a queue
    // owes the people in it.
    this.waiting = [...this.waiting.filter((socket) => socket !== server), server];
    await this.pairUp();
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Two waiting and a room is made.
   *
   * The code is minted here rather than by either phone, so neither can pick a
   * room somebody else is already playing in. Seats are handed out with it: the
   * one who waited longest opens the room and throws first, which is as fair as
   * anything else and at least is not random twice.
   */
  private async pairUp(): Promise<void> {
    while (this.waiting.length >= 2) {
      const first = this.waiting.shift()!;
      const second = this.waiting.shift()!;
      const code = roomCode();
      // Made here, so both phones only ever join a room that already exists.
      await this.env.ROOMS.get(this.env.ROOMS.idFromName(code)).fetch(
        new Request(`https://queue/room/${code}?reserve=1&game=arcade&cups=10`, { method: 'POST' })
      );
      const tell = (socket: WebSocket, seat: 0 | 1) => {
        try {
          socket.send(JSON.stringify({ type: 'matched', code, seat, create: false }));
          socket.close(1000, 'matched');
        } catch {
          // A socket that died between the check and the send simply loses its
          // place; the other one goes back to waiting rather than into a room
          // with nobody in it.
        }
      };
      tell(first, 0);
      tell(second, 1);
    }
    // Tell whoever is left that they are alone, so the app can count seconds
    // rather than spin forever on a blank screen.
    for (const socket of this.waiting) {
      try {
        socket.send(JSON.stringify({ type: 'waiting', ahead: this.waiting.indexOf(socket) }));
      } catch {
        // Same as above: nothing to do about a socket that has gone.
      }
    }
  }

  async webSocketMessage(): Promise<void> {
    // Nothing to say while waiting. Keep-alives are ignored on purpose.
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.waiting = this.waiting.filter((socket) => socket !== ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.waiting = this.waiting.filter((socket) => socket !== ws);
  }
}

/** A room code, from the same alphabet the typed ones use. */
function roomCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}
