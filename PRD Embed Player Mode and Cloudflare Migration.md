# PRD: Embed Player Mode and Cloudflare Migration

Cineby · Product requirements · 29 Oct 2026 · Draft for review · Owner: MaheshSharan

## 1. Summary

Cineby will gain a **player mode switch** controlled by environment variables. In `native` mode the site works as it does today: providers are scraped, streams are proxied and our own player plays them. In `embed` mode the player page loads prebuilt third-party players (vixsrc, vidy and others) in an iframe, and the whole scraping and proxy pipeline switches off. In `hybrid` mode native stays the default and embed servers appear as extra choices in a side drawer.

In parallel the site moves from the VPS (Docker, SQLite, Redis) back to **Cloudflare Workers**, following Cloudflare's Workers best-practices guidance. Embed mode makes that move much smaller, because the parts that fit Workers worst (scraping, in-memory circuit breakers, large video proxying) are exactly the parts that switch off.

Nothing is deleted. Going back to native is an env change and a redeploy.

**Decisions requested from the owner** are listed in section 14.

## 2. Current state (audit findings)

Findings come from reading the repo at `main` (`65c26d5`). Items marked *confirm* need a code read during Phase 0.

1. **Native pipeline.** Four sources (`cinejoy`, `vidy`, `cinezo`, `vixsrc`) run through `lib/providers/registry.ts` with circuit breakers, single-flight de-duplication, an m3u8 fetcher pool and a signed proxy. Each has an `ENABLE_*` flag. vixsrc needs a browser-assisted Cloudflare cookie flow.
2. **Stream API.** `pages/api/stream/` holds `resolve`, `providers`, `proxy`, `m3u8`, `subtitles`, `feedback`, `canary` and `canary-script`. A separate Worker, `workers/stream-proxy`, validates signed descriptors and rewrites playlists.
3. **Player.** `PlayerContainer` plus about 20 hooks: hls.js playback, state, subtitles, skip-intro segments, hover thumbnails, keyboard shortcuts, media session, lock mode, server and quality pickers, and the Hilltop mid-roll ad system.
4. **Server picker.** It lives inside `QualityPopover` and only knows native servers.
5. **Continue watching.** `PlayerShell.handleTimeUpdate(currentTime, duration, {season, episode})` saves history (account or local guest history) with a 3 s playback gate and 5 s throttle. `ContinueWatchingRow` links with `?t=<seconds>` and `PlayerContainer` reads it. This is the integration seam for embeds.
6. **Watch page.** `getServerSideProps` already provides `tmdbId`, `imdbId`, season, episode and runtime, so sites that need either id are covered.
7. **Hosting today.** Docker image on ghcr.io deployed over SSH, Redis 7 in compose (`ioredis`), SQLite file at `/app/data/cineby.db`. `migrations/0001..0004` are D1-compatible SQL.
8. **Cloudflare readiness already in code.** `lib/db/adapter.ts` has a D1 adapter and `lib/db/connection.ts` looks for an OpenNext D1 binding before falling back to local SQLite.
9. **Headers.** `next.config.mjs` sets `X-Frame-Options` and `Referrer-Policy` for our own pages. There is no CSP, so outgoing iframes are not blocked today.
10. **Not used.** `docs/migration_plan.md` was deliberately not consulted, per the owner's earlier instruction.

## 3. Goals and non-goals

**Goals**

- G1. Switch between native, embed and hybrid from env, with no code deleted.
- G2. Let viewers pick a server from a side drawer.
- G3. Keep Continue Watching working for every embed that exposes progress, and degrade honestly for those that do not.
- G4. Run the whole site on Cloudflare Workers with D1, with a rehearsed cutover and a rollback path.
- G5. Follow the Workers best-practices checklist in section 11.

**Non-goals**

- Rebuilding native features inside third-party iframes (subtitles, quality, skip intro).
- Injecting mid-roll ads into embeds.
- Moving off Next.js.
- Changing the redesigned mobile player UI.

## 4. Player modes and env switches

All server-side, read through a new `GET /api/player/config`, so a change needs a redeploy but no rebuild (the same pattern as `/api/ads/config`).

| Variable | Values | Default | Purpose |
| --- | --- | --- | --- |
| `PLAYER_MODE` | `native`, `hybrid`, `embed` | `native` | Master switch |
| `ENABLE_EMBED_PLAYERS` | flag | `false` | Kill switch for the whole embed layer |
| `EMBED_SERVER_PRIORITY` | list | none | Order of embed servers, e.g. `vixsrc,vidy` |
| `EMBED_DEFAULT_SERVER` | embed id or `native` | `native` | Pre-selected server in hybrid mode |
| `EMBED_LOAD_TIMEOUT_MS` | int | `12000` | Time before showing "try another server" |
| `VIXSRC_EMBED_HOST` | URL | `https://vixsrc.to` | Custom embed domain (vixsrc supports this to avoid ISP blocks) |

**Validation rules** (enforced by the env manifest, failing loudly at start-up):

- `PLAYER_MODE=embed` or `hybrid` requires `ENABLE_EMBED_PLAYERS=true` and at least one valid `EMBED_SERVER_PRIORITY` entry.
- When `PLAYER_MODE=embed`, the native-only variables below become `requiredWhen` false, so they can be left empty.
- A single helper, `getPlayerModeConfig()`, returns `{mode, nativeEnabled, embedEnabled, servers}`. Every gate in sections 5 and 6 calls it. No other file reads `PLAYER_MODE`.

## 5. What turns OFF

"OFF" means: not mounted, not called, not deployed, or returning a stable "disabled" response. The code stays in the repo.

### 5.1 API routes

| Route or module | native | hybrid | embed |
| --- | --- | --- | --- |
| `/api/stream/resolve` | on | on | **off** (404, code `native_player_disabled`) |
| `/api/stream/providers` | on | on (plus embed list) | **off** (replaced by `/api/player/config`) |
| `/api/stream/proxy`, `/api/stream/m3u8` | on | on | **off** |
| `/api/stream/subtitles` | on | on | **off** |
| `/api/stream/feedback` | on | on | **off** |
| `/api/stream/canary`, `canary-script` | on | on | **off** |
| Segment markers API (introdb, skipdb) | on | on | **off** |

Disabled routes return before doing any provider, cache or database work, and log one structured info line.

### 5.2 Server libraries and infrastructure

| Item | embed |
| --- | --- |
| Provider registry, `raceProviders`, `resolveAllStreams` | not called |
| Circuit breakers, single-flight, provider allowlist | idle |
| m3u8 fetcher pool and worker pool stores (`m3u8PoolStore`, `workerPoolStore`) | idle; external fetcher pool unused |
| Signed proxy (`signedProxy.ts`) | idle |
| `workers/stream-proxy` Worker | **not deployed** in embed-only |
| Cinejoy token logic | idle |
| Stream-related cache keys | idle |
| Tab-bound ECDSA media auth and devtools canary (anti-scraping) | **off**; there is no stream to protect |

### 5.3 Environment variables that become optional in embed mode

`ENABLE_CINEJOY`, `ENABLE_CINEZO`, `ENABLE_VIDY`, `ENABLE_VIXSRC`, `STREAM_PROXY_URL`, `STREAM_PROXY_SECRET`, `INTRODB_API_URL`, `SKIPDB_API_URL`, `SEGMENT_PROVIDER_PRIORITY`, and the m3u8 fetcher pool settings *(confirm names in `m3u8PoolStore`)*. `NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED` is forced off by `getPlayerModeConfig()` in embed mode. All of them stay valid in native and hybrid.

### 5.4 Player features inside the iframe

The embedded site owns these. Our `PlayerContainer` is not mounted in embed mode.

| Feature | In embed mode |
| --- | --- |
| hls.js / DASH playback, `usePlayerSource`, `useHlsPlayback` | off |
| Quality selector, playback speed, native server popover | off (replaced by the server drawer) |
| Audio and subtitles popover, subtitle search and upload, subtitle styling | off |
| Skip intro / outro and auto next-episode from segments | off (next episode only via the embed's `ended` event if offered, otherwise manual button) |
| Hover thumbnails and seek previews | off |
| Our controls: seek bar, ±10 s, double-tap seek, volume, keyboard shortcuts | off |
| Lock mode, the redesigned touch control bar and glass buttons | off |
| Media session, wake lock | off (cannot reach into the iframe) |
| Hilltop mid-roll ads (IMA) | **off** (cannot pause or time a third-party iframe); optional pre-roll in Phase E4 |
| `media_start`, milestone and `stream_error` analytics | replaced by `embed_*` events |

### 5.5 User settings that become inert

| Setting | In embed mode |
| --- | --- |
| Default quality, seek time, hover thumbnails, auto subtitles, subtitle appearance | disabled, with a note in settings |
| Autoplay | mapped to the embed's `autoplay` parameter where supported |
| Preferred language | mapped to `lang` where supported |
| Theme colour | mapped to `primaryColor` and `secondaryColor` where supported |

### 5.6 What stays ON in every mode

TMDB browsing, search, detail pages, auth and profiles, watchlist, history and Continue Watching, settings, SEO and sitemaps, PWA, geo gating, the ad config route and consent rules.

## 6. What turns ON (embed layer)

- `lib/embeds/` registry mirroring `lib/providers/`: `types.ts`, `registry.ts`, one file per site, and `docs/embeds/<site>.md` with that site's parameters.
- `GET /api/player/config`: mode, ordered server list, default server, timeouts. Never includes secrets.
- `EmbedPlayer` component: our header and back button, the iframe, a loading overlay, and a "not loading? try another server" fallback.
- `ServerDrawer`: side panel listing Default (native) and each embed server; the choice is saved in settings and can be forced with `?server=`.
- `useEmbedBridge`: validates and forwards `postMessage` events to `PlayerShell.handleTimeUpdate`.
- `PlayerShell` chooses `PlayerContainer` or `EmbedPlayer` from `getPlayerModeConfig()`. `PlayerContainer` is untouched.

## 7. Embed provider contract

Each site implements one interface (summary):

- `id`, `name`, `capabilities`: `startAt`, `events` (`postMessage` or none), `theme`, `autoplay`, `lang`, `idType` (tmdb, imdb or both).
- `buildUrl({tmdbId, imdbId, type, season, episode, startAtSec, theme, lang, autoplay})` returns the iframe URL.
- `allowedOrigins`: exact origins for message validation (derived from the configured host).
- `parseEvent(origin, data)` returns a normalised `{event, currentTime, duration, videoId}` or `null`.
- `iframe`: `allow` list, `referrerPolicy`, and an optional `sandbox` string (many players refuse sandboxing, so it is per site).

**Site capability sheet: vixsrc (from its documentation)**

| Need | Support |
| --- | --- |
| Movie URL | `/movie/{tmdbId or imdbId}` |
| TV URL | `/tv/{id}/{season}/{episode}` (season and episode required) |
| Resume | `startAt=<seconds>` |
| Autoplay, language | `autoplay=false`, `lang=<code>` |
| Theme | `primaryColor`, `secondaryColor` (hex without `#`) |
| Progress events | `postMessage` `PLAYER_EVENT` with `play`, `pause`, `seeked`, `ended`, `timeupdate`, plus `currentTime`, `duration`, `video_id` |
| Custom domain | supported, via the owner's domain |

Other sites (vidy and more) are **TBD**: each needs the same sheet filled from its documentation before it is enabled (Phase E0).

## 8. Continue watching with embeds

1. **Resume:** pass `startAt` from `?t=` when the site supports it. If not, show a one-line hint ("Resume at 42:10") and no seeking.
2. **Progress:** forward events into `handleTimeUpdate`, reusing the existing gate, throttle and `saveHistory` path, so accounts, guests, profiles and the home row work unchanged.
3. **Message safety:** accept a message only if `event.origin` is in the site's allowed origins, `event.source` is our iframe's `contentWindow`, and `video_id` matches the title. Anything else is dropped.
4. **No events:** create the history entry after the player has been open for 60 seconds with no progress value. The title appears in Continue Watching without a resume position.
5. **Partial support:** a site with `startAt` but no events is flagged "resume only". Its resume position is never refreshed, so the capability sheet marks it clearly.
6. **Episodes:** season and episode changes rebuild the iframe URL, and the key change remounts it. Next episode uses `ended` when available, otherwise the header button.
7. **Completion:** progress of 95% or more, or `ended`, marks the title watched.
8. **Analytics:** `embed_loaded`, `embed_first_play`, `embed_error` (timeout), `embed_server_switch`, each with the server id.

## 9. UX requirements

- Side drawer opens from the player header, lists servers with status, and switches without leaving the page.
- In embed mode the header keeps our back button and title. The mobile glass styling applies to the header only.
- Loading overlay with the title backdrop, then a timeout message offering the next server in priority order.
- A short notice that embedded servers have their own ads and controls.
- Accessibility: drawer is keyboard-operable, iframes have a `title`, and focus returns to the trigger.

## 10. Cloudflare target architecture

### 10.1 Component mapping

| Today (VPS) | Cloudflare | Notes |
| --- | --- | --- |
| Next.js in Docker | **Worker `cineby-web`** via OpenNext, static assets via Workers Static Assets | Needs `nodejs_compat` |
| SQLite file | **D1** binding `DB`, schema from `migrations/` | Adapter already exists |
| Redis (`ioredis`, TCP) | **KV** and the Cache API behind the existing `CacheStore` interface | `ioredis` cannot run on Workers |
| `workers/stream-proxy` (already a Worker) | Kept for native and hybrid; server-to-Worker calls use a **service binding** | Browser-facing proxy keeps a public route |
| Docker, ghcr.io, SSH deploy | **GitHub Actions + `wrangler deploy`** |  |
| `process.env` secrets file | **`wrangler secret put`** for secrets, `vars` for non-secrets | No secrets in config |
| Country from reverse proxy | **`cf-ipcountry`** header, native on Cloudflare | Used by the ad geo gate |
| Docker logs | **Workers Logs and Traces** |  |

### 10.2 Configuration standards (from the Workers best-practices skill)

- `wrangler.jsonc`, not `wrangler.toml`. Convert `workers/stream-proxy/wrangler.toml`.
- `compatibility_date` set to the deployment date and reviewed regularly (the proxy Worker is pinned to `2026-03-01`). `compatibility_flags: ["nodejs_compat"]`.
- Generate the `Env` type with `wrangler types`. Never hand-write it. Use `satisfies ExportedHandler<Env>` on Worker entry points.
- Observability on for both Workers: `observability.enabled`, `logs.enabled`, and `traces.enabled` (the proxy Worker currently has it disabled). Sample traces at about 1%. Logs are structured JSON, with `console.error` for errors.
- Secrets only through `wrangler secret put` (`TMDB_API_KEY`, `STREAM_PROXY_SECRET`, API keys). `.dev.vars` is gitignored.

### 10.3 Platform limits that shape the design

From Cloudflare's current limits documentation: Workers Free allows 10 ms of CPU per request and Paid allows up to 5 minutes (30 s default); memory is 128 MB per isolate on every plan; subrequests are 50 per request on Free and 10,000 on Paid; Worker size is 3 MB on Free and 10 MB on Paid after compression. **Requirement: Workers Paid.** Re-verify numbers at implementation time.

### 10.4 Code changes required (known)

| Area | Change |
| --- | --- |
| `lib/db/connection.ts` | Top-level `node:fs` and `node:sqlite` imports will not bundle for Workers. Move the SQLite fallback behind a Node-only entry so the Workers build excludes it. |
| `lib/cache` | Add `kv` (and Cache API) stores. `CACHE_BACKEND` allows `memory`, `redis`, `kv`. `redis` is rejected on Workers. |
| Password hashing (`bcryptjs`) | Measure CPU per login on Workers. If too heavy, move to PBKDF2 via Web Crypto with upgrade-on-login. |
| In-memory state (breakers, single-flight, canary store, memory cache) | Each isolate has its own copy. Accept as best-effort, move to KV, or use a Durable Object. Moot in embed mode. |
| Stream proxy Worker | Verify HMAC with `crypto.subtle.timingSafeEqual` on hashed values, stream bodies without buffering, put logging inside `ctx.waitUntil`, no floating promises. |
| Env reading (`lib/env/*`) | Confirm `process.env` is populated from Worker vars and secrets. Keep validation, feed it from bindings. |
| Headers | Confirm OpenNext applies `X-Frame-Options` and `Referrer-Policy`. Add a CSP later with a `frame-src` allowlist for embed hosts. |

### 10.5 CI/CD

GitHub Actions: typecheck, lint, unit tests, OpenNext build, a bundle-size check against the 10 MB limit, then `wrangler d1 migrations apply` and `wrangler deploy`. Each pull request gets a preview version. A scoped API token and account id live in repository secrets. Docker files and the SSH deploy job are removed only after the stabilisation window.

## 11. Workers best-practices compliance checklist

Each item is a gate in the migration pull requests.

| Practice | Repo-specific check |
| --- | --- |
| Current compatibility date and `nodejs_compat` | Both Workers |
| Logs and traces enabled | Both Workers; proxy Worker currently off |
| Types from `wrangler types`, no hand-written `Env`, no `any` or `as unknown as` on `Env` | New Worker code; the D1 context cast in `connection.ts` should use generated types |
| No secrets in config or source | Move every secret to `wrangler secret` |
| No buffering of unbounded bodies | Proxy streams; playlist rewrite stays bounded text; provider HTML fetches capped |
| No floating promises; background work via `ctx.waitUntil` and never destructured | Proxy Worker logging and cache writes |
| No module-level mutable request state | Review breakers, single-flight, cache singletons, `getDb()` cache |
| Bindings over REST API | D1 and KV from the Worker, never `api.cloudflare.com` calls |
| Service bindings for Worker-to-Worker | Web Worker to proxy Worker internal calls |
| Web Crypto for tokens, constant-time secret comparison | Proxy signature check, session and token generation |
| Explicit error handling, no `passThroughOnException` | Both Workers |
| Tests in the Workers runtime | `@cloudflare/vitest-pool-workers` for the proxy Worker and D1 code; existing Node tests stay |
| Zod 4.5.0 or later if Zod is added | Currently not used (`zod` appears only in validation code *confirm*) |

## 12. Delivery plan

**Recommended order: embed first, then migrate.** Embed mode behind a flag can ship on the VPS with low risk. Once embed is the default, the Workers migration no longer needs to port the native pipeline immediately, which removes its hardest parts.

### Track A: Embed mode

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| E0 | Capability sheet for each site; decide the first servers | Sheets reviewed by the owner |
| E1 | Env manifest, `getPlayerModeConfig()`, `/api/player/config`, `lib/embeds/*`, route gating, tests | `PLAYER_MODE=native` behaves identically to today |
| E2 | `EmbedPlayer`, `PlayerShell` switch, `ServerDrawer`, timeout fallback | Hybrid works on desktop and mobile |
| E3 | Event bridge, resume, history, `embed_*` analytics, settings notes | Continue Watching verified per site |
| E4 (optional) | Pre-roll for embeds using the existing ad controller; native-to-embed auto fallback | Ad and bounce guardrails met |

### Track B: Cloudflare migration

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| M0 | Build proof: OpenNext build, bundle size, `node:` imports removed, cache and password-hash decisions | Go or no-go gate |
| M1 | Staging on `workers.dev`: D1 staging, KV, secrets, observability, preview deploys | Smoke tests pass |
| M2 | Data rehearsal: export SQLite, import to D1, row-count and sample checks, login test | Two clean rehearsals |
| M3 | Cutover: read-only window, final export and import, custom domain switch, verification | Rollback tested |
| M4 | Stabilise for 14 days, then retire the VPS, Redis and Docker pipeline | Error and cost targets met |

**Cutover and rollback.** Announce a short read-only window. Freeze writes, export the final SQLite dump, import it into D1, verify counts, then switch the domain to the Worker. Sessions are not migrated, so users sign in again. The VPS stays running and untouched for 14 days. Rollback within the first hours means pointing the domain back; after meaningful new writes on D1, rollback would lose them, so that is the commit point.

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Embed sites change URLs, go down, or block our domain | Priority list, load timeout, quick server switch, kill switch, hybrid default |
| Embedded ads and popups annoy users or get the domain flagged | Per-site sandbox testing, clear notice, ability to disable a site by env |
| Sandboxing breaks players | Sandbox is optional per site and tested before enabling |
| Continue Watching is inaccurate for sites without events | Honest states: tracked, resume-only, started-only; prefer event-capable sites |
| Revenue falls because mid-roll cannot run in embeds | Keep native as the default in hybrid; evaluate pre-roll in E4; compare revenue per 1,000 sessions |
| Workers limits (CPU, bundle size, memory) block the Next.js app | M0 build proof before any other migration work; Workers Paid |
| D1 import errors or data loss | Two rehearsals, count and checksum verification, VPS kept for 14 days |
| Password hashing too slow on Workers | Measure in M0; Web Crypto migration plan |
| Loss of shared in-memory state | Accept, move to KV, or Durable Object per item |
| Hosting or abuse-policy exposure | Review Cloudflare's terms and abuse handling before cutover; embed mode removes proxied video bytes from our side, but embedding does not change copyright exposure |

## 14. Decisions requested

1. Roll out `hybrid` first with native as the default? (Recommended.)
2. Which embed sites go live first? Send each site's documentation for the E0 sheet. vixsrc is ready.
3. Is Workers Paid approved? (Required.)
4. Keep Hilltop ads native-only, or fund a pre-roll for embed mode?
5. Does the domain stay with the current DNS provider or move fully to Cloudflare?
6. Is a short read-only window acceptable for cutover, and when?

## 15. Success metrics

- Playback start success rate by server; time to first play.
- Embed timeout rate per site; server-switch rate.
- Continue Watching accuracy: share of resumes within 5 s of the saved position, per site.
- Worker error rate (including CPU limit errors), D1 latency p95, cost per 1,000 sessions.
- Revenue per 1,000 sessions by mode, and `/watch` bounce rate.
- VPS bandwidth and proxy requests avoided.

## Appendix A: Files to add or change

**Add:** `lib/embeds/{types,registry}.ts`, `lib/embeds/sites/*.ts`, `lib/player/modeConfig.ts`, `pages/api/player/config.ts`, `components/player/EmbedPlayer.tsx`, `components/player/ui/ServerDrawer.tsx`, `components/player/hooks/useEmbedBridge.ts`, `docs/embeds/*.md`, `wrangler.jsonc` (web and proxy), `open-next.config.ts`, `lib/cache/kv.ts`, Worker tests.

**Change:** `lib/env/manifest.ts` (new variables, `requiredWhen` for native-only ones), `components/player/PlayerShell.tsx`, `pages/api/stream/*` (gating), `lib/db/connection.ts` (Node-only fallback), `lib/cache/index.ts`, `.env.example`, `.github/workflows/deploy.yml`, `workers/stream-proxy` (config and checks), settings UI notes.

## Appendix B: Sources

- Cloudflare skills repository, Workers best practices: `SKILL.md`, `references/configuration.md`, `references/runtime-patterns.md` (github.com/cloudflare/skills).
- Cloudflare Workers platform limits: developers.cloudflare.com/workers/platform/limits.
- vixsrc embed documentation as supplied by the owner.
- Repository audit of `main` at `65c26d5`.


Make sure to fix GitHub auto flow and workdflows too as project isn't anymore being deployed on vps ! 
