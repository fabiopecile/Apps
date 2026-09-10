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

export interface Env {
  ROOMS: DurableObjectNamespace;
}

/** A room with nothing happening in it is gone by the next evening. */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Anything longer than this is not one of our messages. */
const MAX_MESSAGE_BYTES = 1024;

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

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

    const code = normaliseRoomCode(url.pathname.replace(/^\/room\//, ''));
    if (!url.pathname.startsWith('/room/') || !isRoomCode(code)) {
      return new Response('not found', { status: 404, headers: CORS });
    }

    // The code *is* the address. Two phones typing the same four characters
    // reach the same object, wherever in the world they are.
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
};

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
