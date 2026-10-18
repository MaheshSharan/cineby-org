import path from "node:path";
import fs from "node:fs";

// Direct test runs to an isolated real SQLite DB in data/test.db
const testDbPath = path.join(process.cwd(), "data", "test.db");
process.env.DATABASE_PATH = testDbPath;
process.env.NEXT_PUBLIC_SITE_URL = "https://cineby.group";
process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";
process.env.NEXT_PUBLIC_FLAGS_API_BASE_URL = "https://flagsapi.com";
process.env.TRAILER_API_URL = "https://trailers.wecollege.net/getOldestTrailer";
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "710500048793-55rctnc4coj15s1jvao7l2ouejvpftpn.apps.googleusercontent.com";

// Reset test database cleanly before test session starts
if (fs.existsSync(testDbPath)) {
  try {
    fs.unlinkSync(testDbPath);
  } catch {
    // Ignore if file lock or already cleaned
  }
}
