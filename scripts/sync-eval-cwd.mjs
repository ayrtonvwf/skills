#!/usr/bin/env node
// Renders the per-checkout Waza eval configs from their committed templates.
//
// Why this exists: Waza passes each `mcp_servers` entry to the SDK verbatim - no env
// expansion - and spawns the server with the agent's temp workspace as its cwd. So the
// `cwd:` for a mock MCP server must be an *absolute* path (see evals/README.md "Gotchas"),
// which is machine-specific and must not be committed.
//
// So each suite commits `evals/<suite>/eval.template.yaml` (the source of truth, with a
// *relative* `cwd:` like `./mock-gitlab-mcp`). This script scans for those templates and, for
// each, writes a sibling `eval.yaml` - a GENERATED, gitignored artifact - with every `cwd:`
// resolved to an absolute path for *this* checkout. `eval.yaml` is what you point `waza run`
// at; it is never tracked, so no personal path lands in git history.
//
// New suites are picked up automatically as long as they ship an `eval.template.yaml` with a
// relative `cwd:`; nothing here is hard-coded to mr-feedback.
//
// Idempotent: skips rewriting when the generated file is already current. Runs automatically
// via the repo-root `postinstall` hook; also safe to run by hand or in CI before `waza run`:
//
//   npm run sync-eval-cwd
//   node scripts/sync-eval-cwd.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url)); // .../scripts
const repoRoot = resolve(scriptDir, "..");
const evalsDir = resolve(repoRoot, "evals");

if (!existsSync(evalsDir)) {
  console.log(`No evals/ directory at ${evalsDir}; nothing to render.`);
  process.exit(0);
}

// Discover every evals/<suite>/eval.template.yaml.
const templates = readdirSync(evalsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(evalsDir, entry.name, "eval.template.yaml"))
  .filter((path) => existsSync(path));

if (templates.length === 0) {
  console.log("No evals/*/eval.template.yaml found; nothing to render.");
  process.exit(0);
}

// Match every indented `cwd:` line. Preserve leading whitespace so YAML indentation is kept,
// and resolve the basename of the (relative) value against the suite directory.
const cwdLine = /^(\s*cwd:\s*)(\S+)(.*)$/gm;

let rendered = 0;
for (const template of templates) {
  const suiteDir = dirname(template);
  const outPath = resolve(suiteDir, "eval.yaml");
  const source = readFileSync(template, "utf8");

  const body = source.replace(cwdLine, (_match, prefix, value, trailing) => {
    const absolute = resolve(suiteDir, basename(value));
    return `${prefix}${absolute}${trailing}`;
  });

  const header =
    "# GENERATED FILE — DO NOT EDIT. Edit eval.template.yaml and run `npm run sync-eval-cwd`.\n" +
    "# The cwd: below is an absolute path for THIS checkout (machine-specific; gitignored).\n";
  const output = header + body;

  const relOut = outPath.slice(repoRoot.length + 1);
  const relTpl = template.slice(repoRoot.length + 1);
  if (existsSync(outPath) && readFileSync(outPath, "utf8") === output) {
    console.log(`${relOut}: already current — no change.`);
  } else {
    writeFileSync(outPath, output);
    console.log(`${relOut}: rendered from ${relTpl}`);
    rendered += 1;
  }
}
