import { getStreamProxyUrl, getStreamProxyUrlPool } from "@/lib/env/server";
import { createProxyDescriptor } from "./signedProxy";
import type { ClientPublicKeyJwk } from "@/lib/security/tabCrypto";

let proxyIndex = 0;

function selectProxyBase(activePool?: readonly string[]): string {
  const pool = activePool && activePool.length > 0 ? activePool : getStreamProxyUrlPool();
  if (pool.length <= 1) {
    return pool[0] ?? getStreamProxyUrl();
  }

  // Use round-robin distribution across the edge worker pool
  const selected = pool[proxyIndex % pool.length];
  proxyIndex = (proxyIndex + 1) % pool.length;
  return selected ?? getStreamProxyUrl();
}

export function buildStreamProxyUrl(
  targetUrl: string,
  headers?: Record<string, string>,
  clientIp?: string,
  sid?: string,
  clientPublicKey?: ClientPublicKeyJwk,
  activePool?: readonly string[]
): string {
  if (!targetUrl) {
    return targetUrl;
  }

  const cleanBase = selectProxyBase(activePool);

  // Prevent double-proxying or proxying local blob/data schemes
  if (
    targetUrl.startsWith(cleanBase) ||
    targetUrl.startsWith("blob:") ||
    targetUrl.startsWith("data:") ||
    targetUrl.includes("vercel.app")
  ) {
    return targetUrl;
  }

  const params = new URLSearchParams({
    token: createProxyDescriptor(targetUrl, headers, clientIp, sid, clientPublicKey),
  });

  if (cleanBase.includes("?")) {
    return `${cleanBase}&${params.toString()}`;
  }

  if (cleanBase.startsWith("/")) {
    return `${cleanBase}?${params.toString()}`;
  }

  return `${cleanBase.replace(/\/+$/, "")}/?${params.toString()}`;
}
