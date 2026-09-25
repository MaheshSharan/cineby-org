import type { DatabaseSync } from "node:sqlite";

export function initializeSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      active_profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
      user_agent TEXT,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      pin_hash TEXT,
      movie_genres TEXT NOT NULL DEFAULT '[]',
      tv_genres TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL,
      media_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      poster_path TEXT,
      backdrop_path TEXT,
      added_at TEXT NOT NULL,
      UNIQUE (profile_id, media_type, media_id)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      media_type TEXT NOT NULL,
      media_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      season_number INTEGER,
      episode_number INTEGER,
      poster_path TEXT,
      backdrop_path TEXT,
      duration TEXT,
      progress INTEGER,
      progress_seconds INTEGER,
      watched_at TEXT NOT NULL,
      UNIQUE (profile_id, media_type, media_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_user ON watch_history(user_id, watched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_profile_watched ON watch_history(user_id, profile_id, watched_at DESC);
  `);

  // Safe migration for existing databases: add avatar_url column if not present
  try {
    const userColumns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const hasAvatarUrl = userColumns.some((col) => col.name === "avatar_url");
    if (!hasAvatarUrl) {
      database.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
    }

    // Ensure all existing users have a valid ISO created_at timestamp
    database.exec(`
      UPDATE users
      SET created_at = datetime('now')
      WHERE created_at IS NULL OR created_at = '' OR created_at = 'undefined';
    `);

    const historyColumns = database.prepare("PRAGMA table_info(watch_history)").all() as { name: string }[];
    if (!historyColumns.some((col) => col.name === "poster_path")) {
      database.exec("ALTER TABLE watch_history ADD COLUMN poster_path TEXT;");
    }
    if (!historyColumns.some((col) => col.name === "backdrop_path")) {
      database.exec("ALTER TABLE watch_history ADD COLUMN backdrop_path TEXT;");
    }
    if (!historyColumns.some((col) => col.name === "duration")) {
      database.exec("ALTER TABLE watch_history ADD COLUMN duration TEXT;");
    }
    if (!historyColumns.some((col) => col.name === "progress")) {
      database.exec("ALTER TABLE watch_history ADD COLUMN progress INTEGER;");
    }
    if (!historyColumns.some((col) => col.name === "progress_seconds")) {
      database.exec("ALTER TABLE watch_history ADD COLUMN progress_seconds INTEGER;");
    }

    const sessionColumns = database.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (!sessionColumns.some((col) => col.name === "user_agent")) {
      database.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT;");
    }
    if (!sessionColumns.some((col) => col.name === "last_active_at")) {
      database.exec("ALTER TABLE sessions ADD COLUMN last_active_at TEXT;");
    }

    database.exec(`
      DELETE FROM watch_history
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM watch_history
        GROUP BY profile_id, media_type, media_id
      );
    `);
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_history_profile_media ON watch_history(profile_id, media_type, media_id);");
    database.exec("CREATE INDEX IF NOT EXISTS idx_history_profile_watched ON watch_history(user_id, profile_id, watched_at DESC);");
  } catch {
    // Migration checks are best-effort during schema init
  }
}
