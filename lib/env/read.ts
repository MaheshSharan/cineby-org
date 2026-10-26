// Pure parsing and validation for configuration values. No process.env access here, so the same
// rules run at request time, in scripts/check-env.ts and in tests.
//
// A missing value never falls back to a default: it throws. Optional behaviour is switched off
// only by an explicit "false" flag.

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvConfigError";
  }
}

const MISSING_HINT =
  "Set it in .env.local (development) or in wrangler.jsonc vars / wrangler secrets (production). See .env.example.";

export function requireValue(name: string, value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new EnvConfigError(`Missing required environment variable: ${name}. ${MISSING_HINT}`);
  }

  return trimmed;
}

function invalid(name: string, expected: string, received: string): EnvConfigError {
  return new EnvConfigError(
    `Invalid environment variable ${name}: expected ${expected}, received "${received}".`
  );
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Absolute http(s) URL without a trailing slash. */
export function parseUrl(name: string, value: string | undefined): string {
  const raw = requireValue(name, value);

  if (!isHttpUrl(raw)) {
    throw invalid(name, "an absolute http(s) URL", raw);
  }

  return stripTrailingSlashes(raw);
}

/** Absolute http(s) URL or a root-relative path such as /api/stream/proxy. */
export function parseUrlOrPath(name: string, value: string | undefined): string {
  const raw = requireValue(name, value);

  if (raw.startsWith("/") || isHttpUrl(raw)) {
    return raw.length > 1 ? stripTrailingSlashes(raw) : raw;
  }

  throw invalid(name, "an absolute http(s) URL or a path starting with /", raw);
}

/** Exactly "true" or "false". Anything else, including a missing value, is an error. */
export function parseFlag(name: string, value: string | undefined): boolean {
  const raw = requireValue(name, value);

  if (raw !== "true" && raw !== "false") {
    throw invalid(name, '"true" or "false"', raw);
  }

  return raw === "true";
}

export function parsePositiveInteger(name: string, value: string | undefined): number {
  const raw = requireValue(name, value);
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw invalid(name, "a positive integer", raw);
  }

  return parsed;
}

export function parseNonNegativeNumber(name: string, value: string | undefined): number {
  const raw = requireValue(name, value);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw invalid(name, "a non-negative number", raw);
  }

  return parsed;
}

export function parseEnum<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[]
): T {
  const raw = requireValue(name, value);
  const match = allowed.find((option) => option === raw);

  if (!match) {
    throw invalid(name, `one of ${allowed.join(", ")}`, raw);
  }

  return match;
}

/** Comma-separated list with at least one entry. */
export function parseList(name: string, value: string | undefined): string[] {
  const items = requireValue(name, value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw invalid(name, "a comma-separated list with at least one entry", value ?? "");
  }

  return items;
}
