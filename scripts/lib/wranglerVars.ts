import { readFileSync } from "node:fs";

/** Removes // and /* *\/ comments without touching string contents (the schema URL contains "//"). */
export function stripJsonComments(text: string): string {
  let result = "";
  let inString = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (inString) {
      result += char;

      if (char === "\\") {
        result += next ?? "";
        index += 2;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
    } else if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);

      index = end === -1 ? text.length : end + 2;
    } else {
      result += char;
      index += 1;
    }
  }

  // Trailing commas are valid in wrangler.jsonc.
  return result.replace(/,(\s*[}\]])/g, "$1");
}

/** The `vars` block of a wrangler.jsonc file as plain strings. */
export function parseWranglerVars(jsonc: string): Record<string, string> {
  const parsed = JSON.parse(stripJsonComments(jsonc)) as { vars?: Record<string, unknown> };
  const vars: Record<string, string> = {};

  for (const [name, value] of Object.entries(parsed.vars ?? {})) {
    vars[name] = String(value);
  }

  return vars;
}

export function readWranglerVars(path: string): Record<string, string> {
  return parseWranglerVars(readFileSync(path, "utf8"));
}
