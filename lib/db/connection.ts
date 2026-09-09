import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { initializeSchema } from "./schema";
import { type DbClient, D1DbAdapter, LocalSqliteAdapter, type D1DatabaseBinding } from "./adapter";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "cineby.db");

let clientInstance: DbClient | null = null;

/**
 * Obtain the active database client.
 * Returns Cloudflare D1 adapter if D1 binding is present, otherwise returns Local SQLite adapter.
 */
export function getDb(): DbClient {
  if (clientInstance) {
    return clientInstance;
  }

  // 1. Check for Cloudflare D1 binding on global context or process.env
  const globalWithD1 = globalThis as unknown as {
    __D1_DB?: D1DatabaseBinding;
    env?: { DB?: D1DatabaseBinding };
    DB?: D1DatabaseBinding;
  };

  const d1Binding = globalWithD1.__D1_DB || globalWithD1.env?.DB || globalWithD1.DB;
  if (d1Binding && typeof d1Binding.prepare === "function") {
    clientInstance = new D1DbAdapter(d1Binding);
    return clientInstance;
  }

  // 2. Fallback to Local SQLite for Node / Bun development
  const dbPath = process.env.DATABASE_PATH?.trim() || DEFAULT_DB_PATH;
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const rawDb = new DatabaseSync(dbPath);
  rawDb.exec("PRAGMA journal_mode = WAL;");
  rawDb.exec("PRAGMA foreign_keys = ON;");

  initializeSchema(rawDb);

  clientInstance = new LocalSqliteAdapter(rawDb);
  return clientInstance;
}

/**
 * Allow explicit injection of D1 binding (e.g. from Cloudflare Pages / Workers request context)
 */
export function setDbClient(client: DbClient): void {
  clientInstance = client;
}