# Autonomous Streaming & Edge Proxy Runbook

This guide documents Cineby's **Autonomous Cryptographically-Secure Streaming Architecture**.

---

## 1. How the Autonomous Edge Proxy Works

The stream proxy uses **HMAC-SHA256 Cryptographic Authentication** combined with **Private Network (SSRF) Isolation**:

```
[ Cineby Resolver ] 
        │ 
        │ (Finds stream from Vidy / Vidking / Vixsrc + exact headers)
        ▼
[ Signs HMAC Token with STREAM_PROXY_SECRET ]
        │
        ▼
[ Edge Proxy Worker ]
   1. Validates HMAC signature & TTL (Cryptographically authenticates token origin)
   2. Validates Target is NOT a private IP (Blocks localhost, 10.0.0.0/8, 169.254.169.254, ::1)
   3. ✅ PROXIES IMMEDIATELY (Autonomous: No hardcoded domain allowlist needed!)
   4. Rewrites M3U8 child segments/keys dynamically and re-signs them recursively
```

---

## 2. Key Protections

1. **Zero Downtime on CDN Rotations:** When providers rotate from `quietridge.top` $\rightarrow$ `quietraven.top` $\rightarrow$ `stillhaven.top` $\rightarrow$ any new domain, streams play automatically with **zero code edits and zero deployments**.
2. **Ironclad SSRF Defense:** `isPrivateHost` filters all private IPv4/IPv6 ranges, loopback (`127.0.0.0/8`), link-local, AWS/GCP instance metadata (`169.254.169.254`), and CGNAT ranges.
3. **Exact Header Delivery:** Provider `Referer` and `Origin` headers are cryptographically sealed in the token descriptor and forwarded directly to the upstream CDN.

---

## 3. Key Files

- [`workers/stream-proxy/worker.ts`](file:///d:/ProjectsDesk/cineby/workers/stream-proxy/worker.ts) — Cloudflare Edge Stream Proxy Worker.
- [`pages/api/stream/proxy.ts`](file:///d:/ProjectsDesk/cineby/pages/api/stream/proxy.ts) — Next.js Serverless Stream Proxy fallback.
- [`pages/api/stream/m3u8.ts`](file:///d:/ProjectsDesk/cineby/pages/api/stream/m3u8.ts) — M3U8 Playlist fetcher & rewriter.
- [`lib/providers/allowlist.ts`](file:///d:/ProjectsDesk/cineby/lib/providers/allowlist.ts) — SSRF and Private Host validation filter.
- [`components/player/providers/index.ts`](file:///d:/ProjectsDesk/cineby/components/player/providers/index.ts) — Client-assisted browser fetcher.

---

## 4. Deploying Updates

```bash
# 1. Deploy the proxy worker
bun run deploy:proxy

# 2. Deploy the Next.js app on Cloudflare Workers
bun run deploy:app
```
