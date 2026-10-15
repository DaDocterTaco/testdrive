/** Run the current guided-interaction regressions; all input/media is synthetic. */
import { spawnSync } from "node:child_process";
import path from "node:path";

const env = { ...process.env };
if (env.TD_QA_URL) env.TD_E2E_BASE_URL = env.TD_QA_URL;
const result = spawnSync(
  process.execPath,
  [
    path.resolve("node_modules/@playwright/test/cli.js"),
    "test",
    "tests/e2e/automation.spec.ts",
    "--project=desktop-chromium",
  ],
  { env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
