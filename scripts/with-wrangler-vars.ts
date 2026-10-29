// Runs a command with wrangler.jsonc `vars` injected into its environment.
//   bun scripts/with-wrangler-vars.ts bunx next build
//
// NEXT_PUBLIC_* values are inlined at build time, but `next build` cannot see wrangler.jsonc.
// Injecting the vars here keeps wrangler.jsonc the single source of truth for production
// configuration, so CI needs no duplicated build variables. Injected values win over any local
// .env file, so a developer's .env.local can never leak into a production build.

import { spawnSync } from "node:child_process";
import path from "node:path";

import { validateEnv } from "../lib/env/validate";
import { readWranglerVars } from "./lib/wranglerVars";

const WRANGLER_CONFIG_PATH = path.join(process.cwd(), "wrangler.jsonc");

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: bun scripts/with-wrangler-vars.ts <command> [args...]");
  process.exit(1);
}

const env = { ...process.env, ...readWranglerVars(WRANGLER_CONFIG_PATH) };
const problems = validateEnv(env, "build");

if (problems.length > 0) {
  console.error("\nBuild environment check failed (wrangler.jsonc vars):\n");

  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }

  console.error("");
  process.exit(1);
}

const result = spawnSync(command, args, { stdio: "inherit", env });

process.exit(result.status ?? 1);
