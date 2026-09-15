import { createHmac, timingSafeEqual } from "node:crypto";

export interface Descriptor {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
  ip?: string;
}

const DEFAULT_TTL_MS = 6 * 60 * 60_000; // 6 hours

let devFallbackSecret: string | null = null;

function secret(): string {
  // 1. Check process.env
  const value = process.env.STREAM_PROXY_SECRET?.trim();
  if (value) {
    return value;
  }

  // 2. Check OpenNext Cloudflare ALS context
  try {
    const cfContext = (globalThis as unknown as Record<symbol, { env?: Record<string, unknown> }>)[
      Symbol.for("__cloudflare-context__")
    ];
    const cfSecret = cfContext?.env?.STREAM_PROXY_SECRET;
    if (typeof cfSecret === "string" && cfSecret.trim()) {
      return cfSecret.trim();
    }
  } catch {
    // Continue
  }

  // 4. Check global env
  const globalEnv = (globalThis as unknown as { env?: Record<string, unknown> })?.env;
  if (typeof globalEnv?.STREAM_PROXY_SECRET === "string" && globalEnv.STREAM_PROXY_SECRET.trim()) {
    return globalEnv.STREAM_PROXY_SECRET.trim();
  }

  // 5. Check direct globalThis
  const directSecret = (globalThis as unknown as Record<string, unknown>).STREAM_PROXY_SECRET;
  if (typeof directSecret === "string" && directSecret.trim()) {
    return directSecret.trim();
  }

  // In production, an absent secret must fail fast rather than signing with an insecure static key.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[signedProxy] STREAM_PROXY_SECRET is required in production! Set it via Cloudflare secrets or environment variables."
    );
  }

  if (!devFallbackSecret) {
    console.warn(
      "[signedProxy] No STREAM_PROXY_SECRET found. Generated an ephemeral in-memory secret for local development."
    );
    // Ephemeral random secret for local development (not a static guessable string)
    devFallbackSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return devFallbackSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createProxyDescriptor(
  url: string,
  headers: Record<string, string> = {},
  clientIp?: string
): string {
  const descriptor: Descriptor = {
    url,
    headers,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    ...(clientIp ? { ip: clientIp.trim() } : {}),
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
    return {
      url: descriptor.url,
      headers: descriptor.headers ?? {},
      expiresAt: descriptor.expiresAt,
      ip: typeof descriptor.ip === "string" ? descriptor.ip : undefined,
    };
  } catch { return null; }
}
