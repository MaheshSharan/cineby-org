import { getEnvVar } from "@/lib/env";
import { createProxyDescriptor } from "./signedProxy";

export function buildStreamProxyUrl(
  targetUrl: string,
  headers?: Record<string, string>,
  clientIp?: string
): string {
  if (!targetUrl) {
    return targetUrl;
  }

  const proxyBase =
    getEnvVar("STREAM_PROXY_URL")?.trim() ||
    getEnvVar("NEXT_PUBLIC_STREAM_PROXY_URL")?.trim() ||
    "/api/stream/proxy";

  const cleanBase = proxyBase.replace(/\/+$/, "");

  // Prevent double-proxying or proxying local blob/data schemes
  if (
    targetUrl.startsWith(cleanBase) ||
    targetUrl.startsWith("blob:") ||
    targetUrl.startsWith("data:")
  ) {
    return targetUrl;
  }

  const params = new URLSearchParams({ token: createProxyDescriptor(targetUrl, headers, clientIp) });

  if (cleanBase.includes("?")) {
    return `${cleanBase}&${params.toString()}`;
  }

  if (cleanBase.startsWith("/")) {
    return `${cleanBase}?${params.toString()}`;
  }

  return `${cleanBase}/?${params.toString()}`;
}

export function isStreamProxyConfigured(): boolean {
  return true;
}
