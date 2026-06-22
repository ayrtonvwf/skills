#!/usr/bin/env node
// Makes the Waza eval suites portable across machines and CI.
//
// Waza passes each `mcp_servers` entry to the SDK verbatim - no env expansion - and spawns
// the server with the agent's temp workspace as its cwd. So the `cwd:` for any mock MCP
// server in an eval.yaml must be an *absolute* path (see evals/README.md "Gotchas"). That
// makes the committed eval.yaml machine-specific.
//
// This script scans every `evals/*/eval.yaml`, finds each `cwd:` line, and rewrites it to an
// absolute path for *this* checkout. The target directory is the basename of whatever the
// line currently points at, resolved against that suite's own folder - e.g. a suite whose
// eval.yaml says `cwd: .../mock-gitlab-mcp` is repointed at `evals/<suite>/mock-gitlab-mcp`.
// New suites are picked up automatically as long as they follow that layout; nothing here is
// hard-coded to mr-feedback.
//
// Idempotent: on the machine that last committed an eval.yaml it is a no-op. Run it after
// cloning (or in CI) before `waza run`. It is also wired into the root `postinstall` hook, so
// a plain `npm install` keeps the suites pointed at the local checkout.
//
//   node scripts/sync-eval-cwd.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url)); // .../scripts
const repoRoot = resolve(scriptDir, "..");
const evalsDir = resolve(repoRoot, "evals");

if (!existsSync(evalsDir)) {
  console.log(`No evals/ directory at ${evalsDir}; nothing to sync.`);
  process.exit(0);
}

// Discover every evals/<suite>/eval.yaml.
const evalYamls = readdirSync(evalsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(evalsDir, entry.name, "eval.yaml"))
  .filter((path) => existsSync(path));

if (evalYamls.length === 0) {
  console.log("No evals/*/eval.yaml found; nothing to sync.");
  process.exit(0);
}

// Match every indented `cwd:` line. Preserve the leading whitespace so YAML indentation is
// kept, and resolve the basename of the existing value against the suite directory.
const cwdLine = /^(\s*cwd:\s*)(\S+)(.*)$/gm;

let changedFiles = 0;
let suitesWithCwd = 0;

for (const evalYaml of evalYamls) {
  const suiteDir = dirname(evalYaml);
  const original = readFileSync(evalYaml, "utf8");

  let sawCwd = false;
  const updated = original.replace(cwdLine, (_match, prefix, value, trailing) => {
    sawCwd = true;
    const absolute = resolve(suiteDir, basename(value));
    return `${prefix}${absolute}${trailing}`;
  });

  if (!sawCwd) continue; // suite has no mock MCP server cwd to repair
  suitesWithCwd += 1;

  const rel = evalYaml.slice(repoRoot.length + 1);
  if (updated === original) {
    console.log(`${rel}: cwd already correct - no change.`);
  } else {
    writeFileSync(evalYaml, updated);
    console.log(`${rel}: updated cwd -> ${suiteDir}`);
    changedFiles += 1;
  }
}

if (suitesWithCwd === 0) {
  console.log("No eval.yaml contained a `cwd:` line; nothing to sync.");
}
