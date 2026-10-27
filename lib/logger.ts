import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { getLogLevel, type LogLevel } from "@/lib/env/server";

export type { LogLevel };

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "cookie",
  "authorization",
  "secret",
  "pin",
  "pinhash",
  "passwordhash",
  "apikey",
  "api_key",
  "stream_proxy_secret",
]);

export function sanitizeLogMetadata(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV === "production" ? undefined : data.stack,
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogMetadata(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, "");
    if (
      REDACTED_KEYS.has(lowerKey) ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token")
    ) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeLogMetadata(val, depth + 1);
    }
  }
  return sanitized;
}

export interface StructuredLogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  userId?: number;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export class Logger {
  // Resolved on first use so importing the logger never reads configuration.
  private activePriority: number | null = null;

  private shouldLog(level: LogLevel): boolean {
    const active = LOG_LEVEL_PRIORITY[getLogLevel()] ?? LOG_LEVEL_PRIORITY.info;
    return LOG_LEVEL_PRIORITY[level] >= active;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown): void {
    if (!this.shouldLog(level)) return;

    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (meta) {
      if ("requestId" in meta && typeof meta.requestId === "string") {
        record.requestId = meta.requestId;
      }
      if ("route" in meta && typeof meta.route === "string") {
        record.route = meta.route;
      }
      if ("method" in meta && typeof meta.method === "string") {
        record.method = meta.method;
      }
      if ("status" in meta && typeof meta.status === "number") {
        record.status = meta.status;
      }
      if ("durationMs" in meta && typeof meta.durationMs === "number") {
        record.durationMs = meta.durationMs;
      }
      if ("userId" in meta && typeof meta.userId === "number") {
        record.userId = meta.userId;
      }
      record.meta = sanitizeLogMetadata(meta) as Record<string, unknown>;
    }

    if (error !== undefined) {
      record.error = sanitizeLogMetadata(error);
    }

    const output = JSON.stringify(record);
    if (level === "error" || level === "warn") {
      process.stderr.write(`${output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>, error?: unknown): void {
    this.write("warn", message, meta, error);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.write("error", message, meta, error);
  }
}

export const logger = new Logger();

/**
 * Standard request-id extraction or generation.
 * Validates incoming client request-id (alphanumeric/hyphens only, max 64 chars)
 * to avoid log injection or spoofing; otherwise generates a secure random UUID.
 */
export function getOrGenerateRequestId(req: IncomingMessage): string {
  const incoming = req.headers["x-request-id"];
  if (typeof incoming === "string") {
    const trimmed = incoming.trim();
    if (/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return randomUUID();
}

/**
 * Attaches the X-Request-ID header to the response.
 */
export function attachRequestId(res: ServerResponse, requestId: string): void {
  if (!res.headersSent) {
    res.setHeader("X-Request-ID", requestId);
  }
}

/**
 * Backwards compatibility helper for existing codebase callers.
 * Delegates cleanly to the structured logger without leaking raw secrets or stack traces.
 */
export function logError(context: string, error: unknown): void {
  logger.error(`Error in ${context}`, error, { route: context });
}