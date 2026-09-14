import { useCallback, useEffect, useRef, useState } from 'react';

import { ONLINE_AVAILABLE, partySocketUrl } from './onlineConfig';
import type { PartyMessage, PartyState } from './partyProtocol';

/**
 * One phone's end of a party scoreboard — either the one counting, or one of
 * the ones watching.
 *
 * The same socket either way, because the difference is entirely the server's
 * business: it decides who may write, and a watcher that tried to send a score
 * would simply be ignored. Keeping both on one hook means there is one place
 * where reconnecting is handled, and reconnecting is most of what this does.
 *
 * A party is the worst network a phone ever sees. Screens lock, people walk
 * into the garden, a router with forty devices on it gives up on idle sockets.
 * So a socket that closes without being told to comes back on its own and the
 * scoreboard is resent, which is why a watcher who missed ten minutes sees the
 * current score rather than the one from before their phone slept.
 */

export type PartyStatus = 'off' | 'connecting' | 'open' | 'reconnecting' | 'refused';

/** Backs off to eight seconds and stays there — a party lasts a while. */
const RETRY_STEPS_MS = [700, 1500, 3000, 6000, 8000];
/** Phone networks drop an idle socket surprisingly fast. */
const PING_INTERVAL_MS = 25000;

export interface PartySession {
  status: PartyStatus;
  state: PartyState | null;
  watchers: number;
  /** False when nobody is counting — the host's phone has gone. */
  hosted: boolean;
  refusal: 'hosted' | 'full' | null;
  /** Host only. Sends the score; ignored for a watcher by the server. */
  publish: (state: PartyState) => void;
}

export function useParty(code: string | null, hosting: boolean): PartySession {
  const [status, setStatus] = useState<PartyStatus>(ONLINE_AVAILABLE ? 'connecting' : 'off');
  const [state, setState] = useState<PartyState | null>(null);
  const [watchers, setWatchers] = useState(0);
  const [hosted, setHosted] = useState(false);
  const [refusal, setRefusal] = useState<'hosted' | 'full' | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const leavingRef = useRef(false);
  const attemptRef = useRef(0);
  /**
   * The last thing the host published.
   *
   * Held so a reconnect can resend it immediately. Without this, a host whose
   * phone locked and woke up would show every watcher the score from before it
   * slept until the next cup went down.
   */
  const lastRef = useRef<PartyState | null>(null);

  const publish = useCallback((next: PartyState) => {
    lastRef.current = next;
    const socket = socketRef.current;
    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({ type: 'score', state: next }));
    }
  }, []);

  useEffect(() => {
    if (!ONLINE_AVAILABLE || !code) {
      setStatus('off');
      return;
    }
    leavingRef.current = false;
    attemptRef.current = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let ping: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (leavingRef.current) return;
      const socket = new WebSocket(partySocketUrl(code, hosting));
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setStatus('open');
        setRefusal(null);
        // A host that has already been counting resends where it got to.
        if (hosting && lastRef.current) {
          socket.send(JSON.stringify({ type: 'score', state: lastRef.current }));
        }
        ping = setInterval(() => {
          if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'ping' }));
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        let message: PartyMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.type === 'party') {
          setState(message.state);
          setWatchers(message.watchers);
          setHosted(message.hosted);
        } else if (message.type === 'error') {
          if (message.reason === 'hosted' || message.reason === 'full') {
            setRefusal(message.reason);
            setStatus('refused');
            // Retrying will not help: somebody else is the scoreboard, or the
            // room is as full as it goes.
            leavingRef.current = true;
          }
        }
      };

      socket.onclose = () => {
        if (ping) clearInterval(ping);
        ping = null;
        if (leavingRef.current) return;
        setStatus('reconnecting');
        const wait = RETRY_STEPS_MS[Math.min(attemptRef.current, RETRY_STEPS_MS.length - 1)];
        attemptRef.current += 1;
        retry = setTimeout(connect, wait);
      };

      socket.onerror = () => {
        // The close handler decides; a failed connection fires both.
      };
    };

    connect();

    return () => {
      leavingRef.current = true;
      if (retry) clearTimeout(retry);
      if (ping) clearInterval(ping);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close(1000, 'left');
    };
  }, [code, hosting]);

  return { status, state, watchers, hosted, refusal, publish };
}
