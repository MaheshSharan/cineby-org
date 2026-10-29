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
  NEXT_PUBLIC_TRAILER_API_URL: "https://trailers.test/getOldestTrailer",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  NEXT_PUBLIC_FLAGS_API_BASE_URL: "https://flags.test",
  NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "",
  CORS_ALLOWED_ORIGINS: "https://cineby.group",
  LOG_LEVEL: "debug",
  PLAYER_MODE: "embed",
  ENABLE_EMBED_PLAYERS: "true",
  EMBED_SERVER_PRIORITY: "vixsrc,vidy",
  EMBED_DEFAULT_SERVER: "vixsrc",
  EMBED_LOAD_TIMEOUT_MS: "12000",
  VIXSRC_EMBED_HOST: "https://vixsrc.to",
  VIDY_EMBED_HOST: "https://vidy.st",
  CACHE_BACKEND: "memory",
  CACHE_MAX_ENTRIES: "5000",
});

// Reset test database cleanly before test session starts
if (fs.existsSync(testDbPath)) {
  try {
    fs.unlinkSync(testDbPath);
  } catch {
    // Ignore if file lock or already cleaned
  }
}
