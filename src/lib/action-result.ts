import "server-only";
import { UnauthorizedError, ForbiddenError, type SessionPayload } from "@/lib/session";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { success: false, error, fieldErrors };
}

/**
 * Führt eine Aktion aus, nachdem die übergebene Berechtigungsprüfung bestanden wurde.
 * Wandelt Auth-Fehler und unerwartete Fehler in ein einheitliches ActionResult um,
 * damit Server Actions serialisierbare Ergebnisse statt geworfener Fehler liefern.
 */
export async function guarded<T>(
  check: () => Promise<SessionPayload>,
  fn: (session: SessionPayload) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const session = await check();
    return await fn(session);
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
      return fail(e.message);
    }
    console.error(e);
    return fail("Es ist ein unerwarteter Fehler aufgetreten.");
  }
}
