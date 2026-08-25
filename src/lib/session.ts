import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "nwp_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

export type SessionPayload = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET fehlt oder ist zu kurz. Bitte in .env setzen (mind. 16 Zeichen).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id === "string" &&
      typeof payload.name === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role as Role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Innerhalb einer Anfrage nur einmal ausgewertet.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

export function canEdit(role: Role | undefined) {
  return role === "EDITOR" || role === "ADMIN";
}

export function canAdmin(role: Role | undefined) {
  return role === "ADMIN";
}

export class UnauthorizedError extends Error {
  constructor(message = "Nicht angemeldet.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Keine Berechtigung für diese Aktion.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Für Server Actions/DAL: wirft, wenn kein gültiger Benutzer angemeldet ist. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Für Server Actions/DAL: wirft, wenn der Benutzer keine Bearbeitungsrechte hat. */
export async function requireEditor(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canEdit(session.role)) throw new ForbiddenError("Nur Bearbeiter und Administratoren dürfen das.");
  return session;
}

/** Für Server Actions/DAL: wirft, wenn der Benutzer kein Administrator ist. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canAdmin(session.role)) throw new ForbiddenError("Nur Administratoren dürfen das.");
  return session;
}
