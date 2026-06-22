#!/usr/bin/env node
// Makes evals/mr-feedback/eval.yaml portable.
//
// Waza passes mcp_servers config to the SDK verbatim - no env expansion, and the server
// is spawned with the agent's temp workspace as its cwd - so the `cwd:` for the mock
// GitLab MCP server must be an absolute path (see evals/README.md "Gotchas"). That makes
// the committed eval.yaml machine-specific. This script derives the correct absolute path
// from its own location and rewrites the single `cwd:` line to match, so any clone or CI
// runner can repair the suite with one command instead of hand-editing.
//
// Idempotent: on the machine that last committed eval.yaml it is a no-op. Run it after
// cloning (or in CI) before `waza run`:
//
//   node evals/mr-feedback/mock-gitlab-mcp/sync-eval-cwd.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url)); // .../mock-gitlab-mcp
const evalYaml = resolve(scriptDir, "..", "eval.yaml");

const original = readFileSync(evalYaml, "utf8");

// Match the indented `cwd:` line inside the gitlab-mcp server block. There is exactly one
// `cwd:` in this spec; keep the leading whitespace so YAML indentation is preserved.
const cwdLine = /^(\s*cwd:\s*).*$/m;
if (!cwdLine.test(original)) {
  console.error(`No 'cwd:' line found in ${evalYaml}; nothing to sync.`);
  process.exit(1);
}

const updated = original.replace(cwdLine, `$1${scriptDir}`);

if (updated === original) {
  console.log(`eval.yaml cwd already points at ${scriptDir} - no change.`);
} else {
  writeFileSync(evalYaml, updated);
  console.log(`Updated eval.yaml cwd -> ${scriptDir}`);
}
