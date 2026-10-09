import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const vitest = join(here, "..", "node_modules", "vitest", "vitest.mjs");

const zones = [
  "Africa/Dar_es_Salaam",
  "America/Los_Angeles",
  "America/New_York",
  "Pacific/Auckland",
];

let failed = false;

for (const tz of zones) {
  console.log(`\n=== TZ=${tz} ===`);
  const result = spawnSync(process.execPath, [vitest, "run"], {
    stdio: "inherit",
    env: { ...process.env, TZ: tz },
  });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error("\nOne or more timezone runs failed.");
  process.exit(1);
}

console.log("\nAll timezone runs passed.");
