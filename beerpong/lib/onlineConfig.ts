/**
 * Where the rooms live.
 *
 * The app has no server of its own and does not want one. The online mode
 * needs exactly one address — a Cloudflare Worker (`server/`) that holds a room
 * per code — and it is set at build time so nothing has to be configured on the
 * phone.
 *
 * Unset is a perfectly good state: the online screen then says so and explains
 * what to set, instead of failing at a socket nobody can see.
 */

/**
 * Written out in full rather than read from a variable: Metro replaces
 * `process.env.EXPO_PUBLIC_*` at build time only when it can see the name.
 */
const configured = (process.env.EXPO_PUBLIC_ONLINE_URL ?? '').trim().replace(/\/+$/, '');

export const ONLINE_SERVER_URL = configured;
export const ONLINE_AVAILABLE = configured.length > 0;

export interface RoomUrlOptions {
  seat: 0 | 1;
  /** Opens the room. Only the side that shares the code passes this. */
  create?: boolean;
  name?: string;
  cups?: number;
}

/** `https://…` becomes `wss://…`, and `http://` stays plain for local testing. */
export function roomSocketUrl(code: string, options: RoomUrlOptions): string {
  const base = ONLINE_SERVER_URL.replace(/^http/, 'ws');
  const query = new URLSearchParams({ seat: String(options.seat) });
  if (options.create) query.set('create', '1');
  if (options.name) query.set('name', options.name);
  if (options.cups) query.set('cups', String(options.cups));
  return `${base}/room/${code}?${query.toString()}`;
}

export function healthUrl(): string {
  return `${ONLINE_SERVER_URL}/health`;
}
