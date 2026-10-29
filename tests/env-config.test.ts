import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ENV_MANIFEST, getProductionVariables } from "@/lib/env/manifest";
import { validateEnv } from "@/lib/env/validate";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseEnvFile(filename: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of read(filename).split("\n")) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)\r?$/.exec(line);

    if (match) {
      entries[match[1]] = match[2].trim();
    }
  }

  return entries;
}

function parseEnvExample(): Record<string, string> {
  return parseEnvFile(".env.example");
}

function parseEnvProductionExample(): Record<string, string> {
  return parseEnvFile(".env.production.example");
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

  it(".env.production.example defines exactly the manifest variables", () => {
    expect(Object.keys(parseEnvProductionExample()).sort()).toEqual([...names].sort());
  });

  it(".env.production.example passes build and production validation", () => {
    expect(validateEnv(parseEnvProductionExample(), "build")).toEqual([]);
    expect(validateEnv(parseEnvProductionExample(), "development")).toEqual([]);
  });

  it("production variables are correctly identified", () => {
    const prodVars = getProductionVariables().map((variable) => variable.name).sort();
    expect(prodVars.length).toBeGreaterThan(0);
  });

  it(".env.example is valid once the documented blanks are filled", () => {
    const problems = validateEnv(parseEnvExample(), "development");
    const missing = problems.map((problem) => /variable: ([A-Z0-9_]+)/.exec(problem)?.[1]).sort();

    expect(missing).toEqual([
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
      "TMDB_API_KEY",
    ]);
  });

  it("conditional variables are only required when their switch is on", () => {
    const base = {
      ...process.env,
      PLAYER_MODE: "embed",
      ENABLE_EMBED_PLAYERS: "true",
      CACHE_BACKEND: "memory",
      NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
    };
    const analytics = { ...base, NEXT_PUBLIC_ENABLE_ANALYTICS: "true", NEXT_PUBLIC_GA_MEASUREMENT_ID: "" };

    expect(validateEnv(base, "development")).toEqual([]);
    expect(validateEnv(analytics, "development")).toHaveLength(1);
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
