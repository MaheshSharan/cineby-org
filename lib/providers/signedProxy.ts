import { createHmac, timingSafeEqual } from "node:crypto";
import { getStreamProxySecret } from "@/lib/env/server";
import type { ClientPublicKeyJwk } from "@/lib/security/tabCrypto";

export interface Descriptor {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
  ip?: string;
  sid?: string;
  pk?: ClientPublicKeyJwk;
}

const DEFAULT_TTL_MS = 6 * 60 * 60_000; // 6 hours

function sign(payload: string): string {
  return createHmac("sha256", getStreamProxySecret()).update(payload).digest("base64url");
}

export function createProxyDescriptor(
  url: string,
  headers: Record<string, string> = {},
  clientIp?: string,
  sid?: string,
  clientPublicKey?: ClientPublicKeyJwk
): string {
  const descriptor: Descriptor = {
    url,
    headers,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    ...(clientIp ? { ip: clientIp.trim() } : {}),
    ...(sid ? { sid } : {}),
    ...(clientPublicKey ? { pk: clientPublicKey } : {}),
  };
  const payload = Buffer.from(JSON.stringify(descriptor)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readProxyDescriptor(token: string): Descriptor | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const descriptor = value as Partial<Descriptor>;
    if (typeof descriptor.url !== "string" || typeof descriptor.expiresAt !== "number" || descriptor.expiresAt < Date.now()) return null;

    let pk: ClientPublicKeyJwk | undefined;
    if (
      descriptor.pk &&
      typeof descriptor.pk === "object" &&
      descriptor.pk.kty === "EC" &&
      descriptor.pk.crv === "P-256" &&
      typeof descriptor.pk.x === "string" &&
      typeof descriptor.pk.y === "string"
    ) {
      pk = {
        kty: "EC",
        crv: "P-256",
        x: descriptor.pk.x,
        y: descriptor.pk.y,
      };
    }

    return {
      url: descriptor.url,
      headers: descriptor.headers ?? {},
      expiresAt: descriptor.expiresAt,
      ip: typeof descriptor.ip === "string" ? descriptor.ip : undefined,
      sid: typeof descriptor.sid === "string" ? descriptor.sid : undefined,
      pk,
    };
  } catch { return null; }
}
