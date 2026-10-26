import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ENV_MANIFEST, getWranglerVariables } from "@/lib/env/manifest";
import { validateEnv } from "@/lib/env/validate";
import { ALL_PROVIDERS } from "@/lib/providers/sources";
import { parseImageWorkerConfig } from "@/workers/assets/params";
import { parseWranglerVars } from "../scripts/lib/wranglerVars";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseEnvExample(): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of read(".env.example").split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)\r?$/.exec(line);

    if (match) {
      entries[match[1]] = match[2].trim();
    }
  }

  return entries;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(path.join(ROOT, directory)).flatMap((entry) => {
    const relative = path.join(directory, entry);

    if (statSync(path.join(ROOT, relative)).isDirectory()) {
      return sourceFiles(relative);
    }

    return /\.(ts|tsx)$/.test(entry) ? [relative] : [];
  });
}

const APP_DIRECTORIES = ["lib", "components", "pages", "hooks"];
const names = ENV_MANIFEST.map((variable) => variable.name);

describe("environment configuration is unified", () => {
  it("lists every variable once", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it(".env.example defines exactly the manifest variables", () => {
    expect(Object.keys(parseEnvExample()).sort()).toEqual([...names].sort());
  });

  it("wrangler.jsonc vars are exactly the non-secret production variables", () => {
    const wranglerNames = Object.keys(parseWranglerVars(read("wrangler.jsonc"))).sort();

    expect(wranglerNames).toEqual(getWranglerVariables().map((variable) => variable.name).sort());
  });

  it("production vars from wrangler.jsonc pass validation", () => {
    expect(validateEnv(parseWranglerVars(read("wrangler.jsonc")), "build")).toEqual([]);
  });

  it(".env.example is valid once the documented blanks are filled", () => {
    const problems = validateEnv(parseEnvExample(), "development");
    const missing = problems.map((problem) => /variable: ([A-Z0-9_]+)/.exec(problem)?.[1]).sort();

    expect(missing).toEqual([
      "INTRODB_API_KEY",
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
      "SKIPDB_API_KEY",
      "STREAM_PROXY_SECRET",
      "TMDB_API_KEY",
    ]);
  });

  it("conditional variables are only required when their switch is on", () => {
    const base = { ...process.env, CACHE_BACKEND: "memory", NEXT_PUBLIC_ENABLE_ANALYTICS: "false" };
    const redis = { ...base, CACHE_BACKEND: "redis", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" };
    const analytics = { ...base, NEXT_PUBLIC_ENABLE_ANALYTICS: "true", NEXT_PUBLIC_GA_MEASUREMENT_ID: "" };

    expect(validateEnv(base, "development")).toEqual([]);
    expect(validateEnv(redis, "development")).toHaveLength(2);
    expect(validateEnv(analytics, "development")).toHaveLength(1);
  });

  it("the application only reads variables that are in the manifest", () => {
    const allowedOutsideManifest = new Set(["NODE_ENV"]);
    const readPattern = /process\.env\.([A-Z][A-Z0-9_]*)|(?:readServerEnv|requireValue)\(\s*"([A-Z][A-Z0-9_]*)"/g;
    const unknown = new Set<string>();

    for (const file of APP_DIRECTORIES.flatMap(sourceFiles)) {
      for (const match of read(file).matchAll(readPattern)) {
        const name = match[1] ?? match[2];

        if (!names.includes(name) && !allowedOutsideManifest.has(name)) {
          unknown.add(`${name} (${file})`);
        }
      }
    }

    expect([...unknown]).toEqual([]);
  });

  it("every registered stream provider has its own ENABLE_ switch", () => {
    for (const provider of ALL_PROVIDERS) {
      expect(names).toContain(`ENABLE_${provider.id.toUpperCase()}`);
    }
  });

  it("the worker configs carry the variables their workers require", () => {
    const assetsVars = parseWranglerVars(read("workers/assets/wrangler.jsonc"));
    const proxyVars = parseWranglerVars(read("workers/stream-proxy/wrangler.jsonc"));

    expect(parseImageWorkerConfig(assetsVars).ok).toBe(true);
    expect(proxyVars.CORS_ALLOWED_ORIGINS).toBeTruthy();
    expect(proxyVars.CORS_ALLOWED_ORIGINS).not.toMatch(/localhost/);
    expect(proxyVars).not.toHaveProperty("STREAM_PROXY_SECRET");
  });
});

describe("no hardcoded deployment values in application code", () => {
  const deploymentHosts = [/cineby\.group/, /image\.tmdb\.org/, /wsrv\.nl/, /wecollege\.net/, /upstash\.io/];

  it("keeps own domains and TMDB/proxy hosts out of lib, components, pages and hooks", () => {
    const offenders: string[] = [];

    for (const file of APP_DIRECTORIES.flatMap(sourceFiles)) {
      // Provider sources legitimately name their upstream protocol hosts (constants, not deployment config).
      if (file.startsWith(path.join("lib", "providers", "sources"))) {
        continue;
      }

      const code = read(file);

      for (const host of deploymentHosts) {
        if (host.test(code)) {
          offenders.push(`${file}: ${host}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
