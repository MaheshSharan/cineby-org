import path from "node:path";
import fs from "node:fs";

// Direct test runs to an isolated real SQLite DB in data/test.db
const testDbPath = path.join(process.cwd(), "data", "test.db");
process.env.DATABASE_PATH = testDbPath;

// Test-only values. The app has no fallbacks, so every variable it reads must be defined here.
// Fake ids and keys on purpose: nothing in this file is a real credential.
Object.assign(process.env, {
  NEXT_PUBLIC_SITE_URL: "https://cineby.group",
  NEXT_PUBLIC_CONTACT_EMAIL: "contact@example.test",
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: "legal@example.test",
  TMDB_API_URL: "https://tmdb.test/3",
  TMDB_API_KEY: "test-tmdb-key",
  NEXT_PUBLIC_TMDB_DEFAULT_LANGUAGE: "en",
  NEXT_PUBLIC_IMAGE_MODE: "worker",
  NEXT_PUBLIC_IMAGE_PROXY_URL: "https://assets.cineby.group",
  NEXT_PUBLIC_TMDB_IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
  STREAM_PROXY_URL: "/api/stream/proxy",
  STREAM_PROXY_SECRET: "test-stream-proxy-secret",
  M3U8_FETCHER_URL: "https://m3u8.test/fetch",
  NEXT_PUBLIC_TRAILER_API_URL: "https://trailers.test/getOldestTrailer",
  ENABLE_CINEZO: "true",
  ENABLE_VIDY: "true",
  ENABLE_VIXSRC: "false",
  INTRODB_API_URL: "https://introdb.test",
  INTRODB_API_KEY: "test-introdb-key",
  SKIPDB_API_URL: "https://skipdb.test",
  SKIPDB_API_KEY: "test-skipdb-key",
  SEGMENT_PROVIDER_PRIORITY: "introdb,skipdb",
  CACHE_BACKEND: "memory",
  CACHE_MAX_ENTRIES: "5000",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  NEXT_PUBLIC_FLAGS_API_BASE_URL: "https://flags.test",
  NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
  CORS_ALLOWED_ORIGINS: "https://cineby.group",
  LOG_LEVEL: "debug",
});

// Reset test database cleanly before test session starts
if (fs.existsSync(testDbPath)) {
  try {
    fs.unlinkSync(testDbPath);
  } catch {
    // Ignore if file lock or already cleaned
  }
}
