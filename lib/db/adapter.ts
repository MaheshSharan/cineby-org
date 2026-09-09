import type { DatabaseSync } from "node:sqlite";

/**
 * Universal Database Client Interface
 * Compatible with both local Node/Bun SQLite and Cloudflare D1
 */
export interface DbClient {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
  exec(sql: string): Promise<void>;
}

/**
 * Minimal D1 Database interface declaration matching Cloudflare Workers runtime
 */
export interface D1DatabaseBinding {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
    };
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
  };
  exec(query: string): Promise<unknown>;
}

/**
 * Cloudflare D1 Database Adapter
 */
export class D1DbAdapter implements DbClient {
  constructor(private d1: D1DatabaseBinding) {}

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = params.length > 0 ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql);
    const result = await stmt.first<T>();
    return result ?? null;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = params.length > 0 ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql);
    const result = await stmt.all<T>();
    return result.results || [];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const stmt = params.length > 0 ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql);
    const res = await stmt.run();
    return {
      lastInsertRowid: res.meta?.last_row_id ?? 0,
      changes: res.meta?.changes ?? 0,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }
}

/**
 * Local SQLite Database Adapter (for dev / node server fallback)
 */
export class LocalSqliteAdapter implements DbClient {
  constructor(private db: DatabaseSync) {}

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...(params as (string | number | bigint | null | Uint8Array)[]));
    return (row as T) ?? null;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...(params as (string | number | bigint | null | Uint8Array)[]));
    return (rows as T[]) || [];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...(params as (string | number | bigint | null | Uint8Array)[]));
    return {
      lastInsertRowid: Number(res.lastInsertRowid),
      changes: Number(res.changes),
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}
