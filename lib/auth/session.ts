import { randomBytes } from "node:crypto";
import { LOGGED_IN_COOKIE_NAME } from "./loggedInFlag";

export const SESSION_COOKIE = "cineby_session";
export const LOGGED_IN_COOKIE = LOGGED_IN_COOKIE_NAME;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildSessionCookie(token: string): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function buildLoggedInCookie(): string {
  const parts = [
    `${LOGGED_IN_COOKIE}=1`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function clearLoggedInCookie(): string {
  return `${LOGGED_IN_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function buildAuthCookies(token: string): string[] {
  return [buildSessionCookie(token), buildLoggedInCookie()];
}

export function clearAuthCookies(): string[] {
  return [clearSessionCookie(), clearLoggedInCookie()];
}

export interface CookieRequest {
  headers: {
    cookie?: string | string[] | undefined;
  };
}

export function getSessionToken(req: CookieRequest): string | null {
  const header = req.headers.cookie;

  if (!header) {
    return null;
  }

  const cookieHeader = Array.isArray(header) ? header.join("; ") : header;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    const name = separatorIndex === -1 ? part.trim() : part.slice(0, separatorIndex).trim();

    if (name === SESSION_COOKIE) {
      return separatorIndex === -1 ? null : part.slice(separatorIndex + 1).trim() || null;
    }
  }

  return null;
}