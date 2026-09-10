import { useCallback, useEffect, useRef, useState } from 'react';

import { ONLINE_AVAILABLE, roomSocketUrl } from './onlineConfig';
import type { OnlineAction, OnlineMatch, Seat, ServerMessage } from './onlineProtocol';

/**
 * One phone's end of an online match.
 *
 * The room is the only thing that decides anything, so this is deliberately
 * dumb: send what happened at this table, draw whatever comes back. There is no
 * local guess at the score to reconcile later, which is why a phone that spent
 * a minute in someone's pocket comes back correct rather than plausible.
 *
 * What it does have to handle is a party: phones sleep, wifi drops, someone
 * walks out of range. So a socket that closes without being told to reconnects
 * on its own, and takes the same seat back — the room holds the score and hands
 * it straight back.
 */

export type RoomStatus =
  /** No address configured, so there is nothing to connect to. */
  | 'off'
  | 'connecting'
  /** Connected, and the room has told us where things stand. */
  | 'open'
  /** The room said no. `refusal` says why, and retrying will not help. */
  | 'refused'
  | 'reconnecting';

export type Refusal = 'full' | 'missing' | 'taken' | 'badCode';

export interface RoomParams {
  code: string;
  seat: Seat;
  /** Opens the room rather than joining it. */
  create: boolean;
  name: string;
  cups?: number;
}

export interface RoomSession {
  status: RoomStatus;
  match: OnlineMatch | null;
  present: [boolean, boolean];
  seat: Seat;
  refusal: Refusal | null;
  send: (action: OnlineAction) => void;
}

/** Backs off to eight seconds and stays there — a party can last a while. */
const RETRY_STEPS_MS = [700, 1500, 3000, 6000, 8000];
/** Phone networks drop an idle socket surprisingly fast. */
const PING_INTERVAL_MS = 25000;

export function useOnlineRoom(params: RoomParams | null): RoomSession {
  const [status, setStatus] = useState<RoomStatus>(ONLINE_AVAILABLE ? 'connecting' : 'off');
  const [match, setMatch] = useState<OnlineMatch | null>(null);
  const [present, setPresent] = useState<[boolean, boolean]>([false, false]);
  const [refusal, setRefusal] = useState<Refusal | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  /** Set while the effect is tearing down, so a close is not treated as a drop. */
  const leavingRef = useRef(false);
  const attemptRef = useRef(0);
  /**
   * The name is sent once when the socket opens; letting it into the effect's
   * dependencies would drop the connection on every keystroke.
   */
  const nameRef = useRef(params?.name ?? '');
  nameRef.current = params?.name ?? '';

  const code = params?.code ?? '';
  const seat: Seat = params?.seat ?? 0;
  const create = params?.create ?? false;
  const cups = params?.cups;

  useEffect(() => {
    if (!ONLINE_AVAILABLE) {
      setStatus('off');
      return;
    }
    if (!code) return;

    leavingRef.current = false;
    attemptRef.current = 0;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    /**
     * The room is opened once. A reconnect that asked to create it again would
     * be refused as "code in use" — by itself.
     */
    let opening = create;

    const connect = () => {
      setStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting');
      const url = roomSocketUrl(code, {
        seat,
        create: opening,
        name: nameRef.current,
        cups,
      });
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        // Whatever happens after this, the room exists.
        opening = false;
      };

      socket.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.type === 'error') {
          setRefusal(message.reason);
          setStatus('refused');
          // A refusal is final: no seat, no room, no point retrying.
          leavingRef.current = true;
          return;
        }
        if (message.type === 'state') {
          attemptRef.current = 0;
          setRefusal(null);
          setMatch((current) =>
            // Out-of-order delivery is not supposed to happen over one socket,
            // but a reconnect can overlap with the old socket's last message.
            current != null && message.match.version < current.version ? current : message.match
          );
          setPresent(message.present);
          setStatus('open');
        }
      };

      const dropped = () => {
        if (leavingRef.current) return;
        const wait = RETRY_STEPS_MS[Math.min(attemptRef.current, RETRY_STEPS_MS.length - 1)];
        attemptRef.current += 1;
        setStatus('reconnecting');
        retryTimer = setTimeout(connect, wait);
      };

      socket.onclose = dropped;
      socket.onerror = () => {
        // A failed connection fires error and then close on every platform we
        // run on; the close handler is the one that schedules the retry.
      };
    };

    connect();

    pingTimer = setInterval(() => {
      if (socketRef.current?.readyState === 1) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL_MS);

    return () => {
      leavingRef.current = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (pingTimer) clearInterval(pingTimer);
      const open = socketRef.current;
      socketRef.current = null;
      // Leaving on purpose frees the seat straight away, so the same phone can
      // come back without waiting for a timeout.
      open?.close(1000, 'left');
    };
  }, [code, seat, create, cups]);

  const send = useCallback((action: OnlineAction) => {
    const socket = socketRef.current;
    if (socket?.readyState !== 1) return;
    socket.send(JSON.stringify(action));
  }, []);

  return { status, match, present, seat, refusal, send };
}
