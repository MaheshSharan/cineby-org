// Fails with the complete list of missing or invalid variables.
//   bun scripts/check-env.ts           development (.env.local)  -> predev, `bun run check:env`
//   bun scripts/check-env.ts --build   build-time subset

import { validateEnv, type EnvCheckMode } from "../lib/env/validate";

const mode: EnvCheckMode = process.argv.includes("--build") ? "build" : "development";
const problems = validateEnv(process.env, mode);

if (problems.length > 0) {
  console.error(`\nEnvironment check failed (${mode}):\n`);

  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }

  console.error("\nSee .env.example for every variable and its development/production value.\n");
  process.exit(1);
}

console.log(`Environment check passed (${mode}).`);
