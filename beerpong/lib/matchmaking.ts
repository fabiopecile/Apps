import { useCallback, useEffect, useRef, useState } from 'react';

import { ONLINE_AVAILABLE, ONLINE_SERVER_URL } from './onlineConfig';
import type { Seat } from './onlineProtocol';

/**
 * Looking for somebody to play against.
 *
 * One socket to the queue for your division; when a second phone turns up, both
 * are told the same room code and which seat to take. Everything after that is
 * the online match screen, unchanged — the queue's whole job is to hand out a
 * code that neither side had to read out loud.
 *
 * The part worth being careful about is what happens when nobody is there,
 * which at the start is every time. This counts the seconds and says so, and
 * the screen offers the computer instead — named as the computer. A young app
 * that dresses up its AI as a stranger is an app somebody works out in an
 * evening, and then nothing it says is worth anything.
 */

export type SearchState =
  | { status: 'off' }
  | { status: 'idle' }
  | { status: 'searching'; seconds: number }
  | { status: 'matched'; code: string; seat: Seat; create: boolean }
  | { status: 'failed' };

/** After this long alone, the screen stops promising and offers the computer. */
export const SEARCH_PATIENCE_SECONDS = 25;

export function useMatchmaking(division: number) {
  const [state, setState] = useState<SearchState>(
    ONLINE_AVAILABLE ? { status: 'idle' } : { status: 'off' }
  );
  const socketRef = useRef<WebSocket | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close(1000, 'left');
  }, []);

  const search = useCallback(() => {
    if (!ONLINE_AVAILABLE) return;
    stop();
    setState({ status: 'searching', seconds: 0 });

    const base = ONLINE_SERVER_URL.replace(/^http/, 'ws');
    const socket = new WebSocket(`${base}/queue?division=${division}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      let message: { type?: string; code?: string; seat?: number; create?: boolean };
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type !== 'matched' || typeof message.code !== 'string') return;
      // The room is made by the queue, so the seat comes with it: whoever
      // waited longest opens it and throws first.
      setState({
        status: 'matched',
        code: message.code,
        seat: message.seat === 1 ? 1 : 0,
        create: message.create === true,
      });
      stop();
    };

    socket.onclose = () => {
      // Closed by the queue once a match is made, which is not a failure. Only
      // a close while still searching is.
      setState((current) => (current.status === 'searching' ? { status: 'failed' } : current));
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
    socket.onerror = () => {
      // The close handler decides; a failed connection fires both.
    };

    tickRef.current = setInterval(() => {
      setState((current) =>
        current.status === 'searching'
          ? { status: 'searching', seconds: current.seconds + 1 }
          : current
      );
    }, 1000);
  }, [division, stop]);

  const cancel = useCallback(() => {
    stop();
    setState({ status: 'idle' });
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, search, cancel };
}
