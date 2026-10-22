import { getStreamProxyUrl } from "@/lib/env/server";
import { createProxyDescriptor } from "./signedProxy";

export function buildStreamProxyUrl(
  targetUrl: string,
  headers?: Record<string, string>,
  clientIp?: string,
  sid?: string
): string {
  if (!targetUrl) {
    return targetUrl;
  }

  const cleanBase = getStreamProxyUrl();

  // Prevent double-proxying or proxying local blob/data schemes
  if (
    targetUrl.startsWith(cleanBase) ||
    targetUrl.startsWith("blob:") ||
    targetUrl.startsWith("data:")
  ) {
    return targetUrl;
  }

  const params = new URLSearchParams({ token: createProxyDescriptor(targetUrl, headers, clientIp, sid) });

  if (cleanBase.includes("?")) {
    return `${cleanBase}&${params.toString()}`;
  }

  if (cleanBase.startsWith("/")) {
    return `${cleanBase}?${params.toString()}`;
  }

  return `${cleanBase}/?${params.toString()}`;
}
