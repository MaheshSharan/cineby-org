// Validates a whole environment against the manifest. Pure (takes the source as an argument) so it
// runs the same in scripts/check-env.ts, the build wrapper and tests. It reuses the runtime
// parsers, so "valid here" means "will not throw at request time".

import {
  ENV_MANIFEST,
  type EnvKind,
  type EnvSource,
  type EnvVariable,
} from "./manifest";
import {
  EnvConfigError,
  parseEnum,
  parseFlag,
  parseList,
  parsePositiveInteger,
  parseUrl,
  parseUrlOrPath,
  requireValue,
} from "./read";

export type EnvCheckMode =
  /** Local run: every variable the app reads, secrets and the local database path included. */
  | "development"
  /** Build step: non-secret, production-applicable variables (secrets are runtime-only). */
  | "build";

function parseByKind(name: string, value: string | undefined, kind: EnvKind): void {
  if (typeof kind !== "string") {
    parseEnum(name, value, kind);
    return;
  }

  switch (kind) {
    case "url":
      parseUrl(name, value);
      return;
    case "urlOrPath":
      parseUrlOrPath(name, value);
      return;
    case "flag":
      parseFlag(name, value);
      return;
    case "int":
      parsePositiveInteger(name, value);
      return;
    case "list":
      parseList(name, value);
      return;
    case "string":
      requireValue(name, value);
  }
}

function appliesToMode(variable: EnvVariable, mode: EnvCheckMode): boolean {
  const environments = variable.environments ?? ["production", "development"];

  if (mode === "build") {
    return variable.scope !== "secret" && environments.includes("production");
  }

  return environments.includes("development");
}

/** Human-readable problems, empty when the environment is valid. */
export function validateEnv(source: EnvSource, mode: EnvCheckMode): string[] {
  const problems: string[] = [];

  for (const variable of ENV_MANIFEST) {
    if (!appliesToMode(variable, mode)) {
      continue;
    }

    if (variable.requiredWhen && !variable.requiredWhen(source)) {
      continue;
    }

    try {
      parseByKind(variable.name, source[variable.name], variable.kind);
    } catch (error) {
      if (!(error instanceof EnvConfigError)) {
        throw error;
      }

      problems.push(error.message);
    }
  }

  return problems;
}
