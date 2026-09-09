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

  // 1. Check OpenNext Cloudflare ALS context (stored under Symbol.for("__cloudflare-context__"))
  try {
    const cfContext = (globalThis as unknown as Record<symbol, { env?: { DB?: D1DatabaseBinding } }>)[
      Symbol.for("__cloudflare-context__")
    ];
    const d1 = cfContext?.env?.DB;
    if (d1 && typeof d1.prepare === "function") {
      clientInstance = new D1DbAdapter(d1);
      return clientInstance;
    }
  } catch {
    // Continue to fallback checks
  }

  // 3. Check for Cloudflare D1 binding on global context or process.env
  const globalWithD1 = globalThis as unknown as {
    __D1_DB?: D1DatabaseBinding;
    env?: { DB?: D1DatabaseBinding };
    DB?: D1DatabaseBinding;
  };

  const d1Binding =
    globalWithD1.__D1_DB ||
    globalWithD1.env?.DB ||
    globalWithD1.DB ||
    (process.env as unknown as { DB?: D1DatabaseBinding })?.DB;

  if (d1Binding && typeof d1Binding.prepare === "function") {
    clientInstance = new D1DbAdapter(d1Binding);
    return clientInstance;
  }

  // 4. Fallback to Local SQLite for Node / Bun development
  // Never attempt DatabaseSync if running on Cloudflare Workers / Edge
  if (typeof navigator !== "undefined" && navigator.userAgent === "CloudFlare-Workers") {
    throw new Error("[DB] D1 Database binding 'DB' was not found in Cloudflare Worker context.");
  }

  const dbPath = process.env.DATABASE_PATH?.trim() || DEFAULT_DB_PATH;
  try {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const rawDb = new DatabaseSync(dbPath);
    rawDb.exec("PRAGMA journal_mode = WAL;");
    rawDb.exec("PRAGMA foreign_keys = ON;");

    initializeSchema(rawDb);

    clientInstance = new LocalSqliteAdapter(rawDb);
    return clientInstance;
  } catch (err) {
    console.error("[DB] Failed to initialize local SQLite database:", err);
    throw new Error("[DB] Database initialization failed: local filesystem unavailable and no D1 binding provided.");
  }
}

/**
 * Allow explicit injection of D1 binding (e.g. from Cloudflare Pages / Workers request context)
 */
export function setDbClient(client: DbClient): void {
  clientInstance = client;
}