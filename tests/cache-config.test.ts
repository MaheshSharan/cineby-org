import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Keeps cache configuration in one place. Every cache header and TTL is defined in `lib/cache/profiles.ts`;
 * a literal anywhere else would let a route promise a lifetime the cache does not keep.
 */

const ROOT = path.resolve(__dirname, "..");
const SCANNED_DIRECTORIES = ["pages", "components", "hooks", "lib"];
const SCANNED_FILES = ["worker.ts"];
const CENTRAL_DIRECTORY = path.join("lib", "cache");

const FORBIDDEN_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "a Cache-Control directive", pattern: /s-maxage|stale-while-revalidate|max-age=|public, |no-store/ },
  { name: "a numeric ISR interval", pattern: /revalidate:\s*\d/ },
  { name: "a data-cache TTL option", pattern: /\b(?:ttlSeconds|staleSeconds)\s*:/ },
];

function listSourceFiles(directory: string): string[] {
  return readdirSync(path.join(ROOT, directory)).flatMap((entry) => {
    const relative = path.join(directory, entry);
    if (relative === CENTRAL_DIRECTORY) return [];
    if (statSync(path.join(ROOT, relative)).isDirectory()) return listSourceFiles(relative);
    return /\.(ts|tsx)$/.test(entry) ? [relative] : [];
  });
}

describe("cache configuration", () => {
  const files = [...SCANNED_DIRECTORIES.flatMap(listSourceFiles), ...SCANNED_FILES];

  it("scans the application source", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    it(`defines ${name} only in lib/cache`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(path.join(ROOT, file), "utf8")));

      expect(offenders).toEqual([]);
    });
  }
});
