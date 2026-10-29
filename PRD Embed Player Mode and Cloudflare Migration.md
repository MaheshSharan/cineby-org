# PRD: Cloudflare Workers Native Architecture & Pure Embed Player Mode

Cineby · Product Requirements & Architecture · Workers_Dev Branch · Owner: MaheshSharan

## 1. Summary

The `Workers_Dev` branch has pivoted Cineby to be **100% Cloudflare Workers native and strictly embed-only**:
1. **Embed Player Exclusively**: All legacy native playback complexity (HLS/DASH streaming, video proxies, m3u8 playlist parsers, chunk rewriters, IMA player ads, segment skip databases, and scraping providers) has been eliminated. The player page loads prebuilt third-party embed players (vixsrc, vidy) in an accessible iframe with responsive server switching and cross-origin postMessage progress telemetry.
2. **Pure Cloudflare Edge Runtime**: Cineby runs on Cloudflare Workers via OpenNext (`nodejs_compat`), utilizing Cloudflare D1 as the primary database storage engine, Cloudflare KV for edge caching, and GitHub Actions with Wrangler for automated edge deployments.
3. **Zero Dead Code**: Removed unneeded native player packages (`hls.js`, `@alugha/ima`, `ioredis`), dead API endpoints (`/api/stream/*`, `/api/ads/*`, `/api/segments`), and provider scrapers (`lib/providers/*`).

---

## 2. Architecture & Tech Stack

| Layer | Implementation | Notes |
| --- | --- | --- |
| **Compute / Edge Runtime** | Cloudflare Workers (`cineby-web`) | OpenNext Next.js Pages Router wrapper with `nodejs_compat` |
| **Database** | Cloudflare D1 (`cineby-prod`) | Native Cloudflare SQL binding (`DB`), schema in `migrations/` |
| **Cache Store** | Cloudflare KV (`CACHE_KV`) / Memory | KV cache store with memory fallback for development |
| **Player Architecture** | `EmbedPlayer` & `ServerDrawer` | Responsive iframe player, postMessage event bridge, server switcher |
| **Telemetry & Telemetry Bridge** | `useEmbedBridge` | Ingests playback progress from iframe origins to sync Continue Watching |
| **CI / CD Deployment** | GitHub Actions (`deploy.yml`) + Wrangler | Automated tests, TypeScript check, D1 migration apply, Wrangler deploy |

---

## 3. Player & Embed Integration

### 3.1 Embed Provider Contract
All streaming sources implement the clean `EmbedProvider` interface in `lib/embeds/types.ts`:
- **vixsrc**: Supports movies (`/movie/{id}`), TV series (`/tv/{id}/{s}/{e}`), resume timestamp (`startAt`), autoplay, language, theme coloring, and two-way progress telemetry via `window.postMessage` (`PLAYER_EVENT`).
- **vidy**: Supports movies (`/embed/movie/{id}`) and TV (`/embed/tv/{id}/{s}/{e}`) with timestamp resume (`t=<seconds>`).

### 3.2 Continue Watching Seam
- Progress events received across the postMessage bridge are forwarded directly into `PlayerShell.handleTimeUpdate`, writing progress to Cloudflare D1 for logged-in accounts and guest browser local history.
- For providers without telemetry events, a 60-second viewing gate automatically marks the item as started.

---

## 4. Environment Configuration

Variables are validated against `lib/env/manifest.ts` during build and start-up:

| Variable | Target Values | Purpose |
| --- | --- | --- |
| `PLAYER_MODE` | `embed` | Enforces pure embed player mode |
| `ENABLE_EMBED_PLAYERS` | `true` | Embed feature master switch |
| `EMBED_SERVER_PRIORITY` | `vixsrc,vidy` | Server drawer priority order |
| `EMBED_DEFAULT_SERVER` | `vixsrc` | Default preselected embed server |
| `EMBED_LOAD_TIMEOUT_MS` | `12000` | Timeout threshold before showing server switch fallback |
| `CACHE_BACKEND` | `kv` (prod) / `memory` (dev) | Edge cache store backend |
| `DATABASE_PATH` | `data/cineby.db` | Local fallback path when running outside Cloudflare D1 context |

---

## 5. Cleaned Up Subsystems

The following components and subsystems were removed from the Workers architecture:
1. **Scraping & Stream Resolvers**: `lib/providers/*` (`cinejoy`, `vidy`, `cinezo`, `vixsrc` native scrapers, WASM decoders, circuit breakers, worker pools).
2. **Native Streaming API**: `pages/api/stream/*` (`resolve`, `providers`, `proxy`, `m3u8`, `subtitles`, `feedback`, `canary`, `canary-script`).
3. **Stream Proxy Worker**: `workers/stream-proxy` (HMAC token signing and video chunk proxying).
4. **Custom HLS Player**: `PlayerContainer.tsx`, `hls.js` loader, touch control overlays, quality selector, subtitle parser.
5. **IMA Video Ads**: `@alugha/ima`, ad controllers, VAST parsers, ad skip buttons.
6. **TCP Redis**: `ioredis` package and `lib/cache/redis.ts` (unsupported on Workers isolate runtime).

---

## 6. Verification & Quality Gates

Every build on the `Workers_Dev` branch must cleanly pass:
1. `bun run test` (100% passing across all 15 active test suites).
2. `bun run typecheck` (`tsc --noEmit` with zero errors).
3. GitHub Actions `deploy.yml` triggers automated D1 migrations and `wrangler deploy` to Cloudflare Workers.
