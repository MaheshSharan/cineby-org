import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "./schema";
import { type DbClient, LocalSqliteAdapter } from "./adapter";
import { logger } from "@/lib/logger";
import { getDatabasePath } from "@/lib/env/server";

export function getLocalSqliteDb(): DbClient {
  const dbPath = getDatabasePath();
  try {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec("PRAGMA journal_mode = WAL;");
    rawDb.exec("PRAGMA foreign_keys = ON;");

    initializeSchema(rawDb);

    return new LocalSqliteAdapter(rawDb);
  } catch (err) {
    logger.error("[DB] Failed to initialize local SQLite database", err);
    throw new Error("[DB] Database initialization failed: local filesystem unavailable and no D1 binding provided.");
  }
}
