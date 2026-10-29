import { type DbClient, D1DbAdapter, type D1DatabaseBinding } from "./adapter";
import { getLocalSqliteDb } from "./nodeSqlite";

let clientInstance: DbClient | null = null;

/**
 * Obtain the active database client.
 * Returns Cloudflare D1 adapter if D1 binding is present, otherwise returns Local SQLite adapter.
 */
export function getDb(): DbClient {
  if (clientInstance) {
    return clientInstance;
  }

  // OpenNext Cloudflare ALS context (stored under Symbol.for("__cloudflare-context__"))
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
    // OpenNext ALS context not available outside Cloudflare runtime; safely continue to fallback checks per §16
  }

  // Cloudflare D1 binding on global context or process.env
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

  // Fallback to Local SQLite for Node / Bun development.
  // Never attempt DatabaseSync if running on Cloudflare Workers / Edge
  if (typeof navigator !== "undefined" && navigator.userAgent === "CloudFlare-Workers") {
    throw new Error("[DB] D1 Database binding 'DB' was not found in Cloudflare Worker context.");
  }

  clientInstance = getLocalSqliteDb();
  return clientInstance;
}


/**
 * Allow explicit injection of D1 binding (e.g. from Cloudflare Pages / Workers request context)
 */
export function setDbClient(client: DbClient): void {
  clientInstance = client;
}