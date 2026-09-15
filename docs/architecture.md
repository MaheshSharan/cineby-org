# Cineby — Production Architecture, UX, Security, Caching & Observability

This document details the production features implemented across Cineby: Continue Watching & Resume Playback, Touch-First Rows & Keyboard Navigation, Cinematic Motion Tokens, TMDB Cache Architecture, Centralized Validation, Device/Session Management, and Structured Request Logging.

---

## 1. Cache Architecture

```text
                 Cineby
                    │
                    ▼
               CacheStore
              /          \
             /            \
      Memory LRU/TTL     Redis adapter
        (NOW)             (LATER)
```

The application depends on the `CacheStore` interface defined in `lib/cache/types.ts`:
- `get<T>(key: string): Promise<T | null>`
- `getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }>`
- `set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void>`
- `delete(key: string): Promise<boolean>`
- `clear(): Promise<void>`
- `getStats(): CacheStats`

### Backends
1. **Bounded In-Memory Cache (Active Default)**:
   - Eviction: LRU (Least Recently Used) via Javascript `Map` key iteration order.
   - Bounded size: Default 5,000 entries (configurable via `CACHE_MAX_ENTRIES`).
   - TTL expiration: Timestamp-based expiration with active cleanup on fetch.
   - Stale-while-revalidate: Returns stale value while asynchronously refreshing in background.
2. **Redis Adapter (Optional Future Backend)**:
   - Configurable via `CACHE_BACKEND=redis` and `REDIS_URL`.
   - Redis readiness: Compatible with any standard Redis client (node-redis, ioredis, @upstash/redis).
   - Graceful degradation: Never crashes the application if Redis is unreachable; logs warnings and falls back to upstream TMDB.

### Request Coalescing (Single-Flight)
- `SingleFlight` in `lib/cache/singleFlight.ts` ensures that concurrent requests for the exact same cache key share a single upstream Promise, eliminating cache stampedes.

### Centralized TTL Policies & Deterministic Keys
- Trending & Discover: 15 minutes TTL, stale after 5 minutes.
- Search: 5 minutes TTL, stale after 2 minutes.
- Movie & TV Details, Credits, Episodes, Recommendations: 24 hours TTL, stale after 12 hours.
- Keys are versioned and namespaced: `tmdb:v1:movie:<id>`, `tmdb:v1:tv:<id>`, `tmdb:v1:trending:<type>:<window>:p<page>`.

---

## 2. Centralized Validation & Error Handling

- Schemas defined in `lib/validation/` using lightweight, zero-dependency schema validation matching the `z` API (`lib/validation/schema.ts`):
  - `auth.ts`: `loginSchema`, `registerSchema`, `changePasswordSchema`
  - `history.ts`: `addHistorySchema`
  - `watchlist.ts`: `addToWatchlistSchema`
  - `profiles.ts`: `createProfileSchema`, `updateProfileSchema`
  - `sessions.ts`: `revokeSessionSchema`
- Helper `validate(schema, input)` returns strongly-typed data or structured validation issues.
- `sendValidationError(res, errors)` standardizes 400 responses with `{ error, code: "VALIDATION_ERROR", details }` without exposing server paths, database details, or stack traces.

---

## 3. Structured Request Logging & Request IDs

- `lib/logger.ts` provides centralized structured JSON logging:
  - Methods: `logger.debug`, `logger.info`, `logger.warn`, `logger.error`
  - Fields: `timestamp`, `level`, `message`, `requestId`, `route`, `method`, `status`, `durationMs`, `userId`, `error`, `meta`
  - Metadata sanitization: Automatically redacts passwords, tokens, cookies, authorization headers, and secrets.
  - Backward-compatible `logError(context, error)` delegates directly to structured logging.
- `withApiContext(routeName, handler)` wrapper:
  - Generates or normalizes client `X-Request-ID` (rejecting malformed/spoofed characters).
  - Emits `X-Request-ID` in response headers.
  - Measures request execution duration and logs structured completion logs.
  - Catches unhandled errors and returns client-safe 500 responses.

---

## 4. Device / Session Management

- Database schema extended in `lib/db/schema.ts`:
  - `sessions` table includes `user_agent` (TEXT) and `last_active_at` (TEXT) with safe migrations for existing SQLite databases.
- Throttled Activity Tracking:
  - `touchSessionActivity` updates `last_active_at` only if more than 5 minutes have elapsed since the previous activity, avoiding SQLite lock contention.
- Session Management API (`pages/api/auth/sessions.ts`):
  - `GET /api/auth/sessions`: Lists active sessions for current authenticated user (id, userAgent, createdAt, lastActiveAt, expiresAt, isCurrent). Never exposes session tokens.
  - `DELETE /api/auth/sessions?id=<sessionId>` or `POST` with `{ sessionId }`: Revokes an individual session server-side.
  - `DELETE /api/auth/sessions?allOthers=true` or `POST` with `{ revokeOthers: true }`: Revokes all sessions for the user except the current session.

---

## 5. Continue Watching & Resume Playback

- Home page (`components/home/ContinueWatchingRow.tsx`):
  - Surfaces in-progress items (1% <= progress < 95%) from the existing `watch_history` table.
  - Re-fetches on profile change (`cineby:profile-change` and storage events).
  - Cards compute resume timestamp and link with query parameter `?t=<seconds>`.
- Details page (`components/detail/DetailPage.tsx`):
  - Inspects user's watch history for the current movie or TV show, and re-syncs on profile change events (`cineby:profile-change` and storage events).
  - When in-progress watch history exists, renders a prominent **Resume** action (`Resume at 14:32` or `Resume (45%)`) with start timestamp query param (`?t=<seconds>`), alongside a secondary "Start Over" action.
- Player (`components/player/PlayerContainer.tsx` & `usePlayerState.ts`):
  - Parses `t` query parameter on mount and initializes player time to the resumed position upon video metadata availability.

---

## 6. Touch-First Rows & Accessible Keyboard Navigation

- `components/content/ContentRow.tsx`:
  - Fluid touch momentum swipe with `overscroll-x-contain` ensuring vertical page scrolling remains unimpeded on mobile devices.
  - Keyboard navigation: Left and Right arrow keys move focus through focusable cards inside the row and automatically scroll them smoothly into view.
  - Accessible semantics: Row wrapper exposes `role="region"` and `aria-labelledby` linked to the row title heading.
  - Focus indicators: Focusable scroller and cards have clear `focus-visible:ring-2 focus-visible:ring-primary` outlines without breaking mouse clicks.

---

## 7. Cinematic Motion & Design Tokens

- Design tokens in `tailwind.config.ts` and `styles/globals.css`:
  - `--motion-fast`: 120ms (`duration-fast`)
  - `--motion-normal`: 200ms (`duration-normal`)
  - `--motion-slow`: 300ms (`duration-slow`)
  - `--ease-cinematic`: `cubic-bezier(0.16, 1, 0.3, 1)`
- Restrained card hover:
  - Scaled strictly to `<= 1.03` (`group-hover:scale-[1.03]`) using smooth `ease-out duration-normal` transitions to prevent jarring jumps or layout shift.
- Accessibility:
  - `@media (prefers-reduced-motion: reduce)` resets animations and transitions for users requesting reduced motion.

---

## 8. Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CACHE_BACKEND` | Cache backend (`memory` or `redis`) | `memory` |
| `CACHE_MAX_ENTRIES` | Maximum LRU entries in memory cache | `5000` |
| `REDIS_URL` | Optional Redis connection URL (when `CACHE_BACKEND=redis`) | undefined |
| `LOG_LEVEL` | Minimum log level (`debug`, `info`, `warn`, `error`) | `debug` (dev) / `info` (prod) |
