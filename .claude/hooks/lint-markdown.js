#!/usr/bin/env node
// Stop hook: block the agent from finishing while markdown lint fails, but give
// up after MAX_RETRIES so a fix it cannot make won't loop forever. Auto-fixable
// issues should already be resolved (run `npm run lint:fix`); anything left is
// reported back so the agent can fix it by hand.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_RETRIES = 3;

const projectDir = process.env.CLAUDE_PROJECT_DIR;
if (!projectDir) process.exit(0);

// Read and parse the hook payload from stdin.
let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // Malformed/empty input: fall back to defaults below.
}

const sessionId = input.session_id || "default";
// stop_hook_active is false on the first stop attempt of a streak and true on
// continuations our own block caused - so it marks where to reset the counter.
const isContinuation = Boolean(input.stop_hook_active);
const counterFile = join(tmpdir(), `claude-mdlint-${sessionId}.count`);

const clearCounter = () => {
  try {
    rmSync(counterFile);
  } catch {
    // Already absent - nothing to do.
  }
};

const allowStop = () => process.exit(0);
const blockStop = (message) => {
  console.error(message);
  process.exit(2);
};

// Fresh stop attempt (not a continuation of a prior block): reset the budget.
if (!isContinuation) clearCounter();

// Run markdown lint. If it passes, clear the streak and let the agent stop.
let lintOutput = "";
try {
  execSync("npm run --silent lint", {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  clearCounter();
  allowStop();
} catch (err) {
  // Lint failed -> fall through with its combined output.
  lintOutput = `${err.stdout || ""}${err.stderr || ""}`.trim();
}

// Increment the per-session attempt counter.
let count = 0;
if (existsSync(counterFile)) {
  count = parseInt(readFileSync(counterFile, "utf8"), 10) || 0;
}
count += 1;
writeFileSync(counterFile, String(count));

// Cap reached: stop blocking so we don't loop on an unfixable error.
if (count > MAX_RETRIES) {
  clearCounter();
  console.error(
    `Markdown lint still failing after ${MAX_RETRIES} fix attempts - not blocking further. Please resolve the remaining errors manually.`,
  );
  allowStop();
}

// Otherwise block and feed the errors back so the agent fixes them.
blockStop(
  [
    `Markdown lint failed (fix attempt ${count}/${MAX_RETRIES}) - resolve before finishing.`,
    "Run 'npm run lint:fix' for auto-fixable rules, then fix the rest by hand.",
    "MD060 (table column style) is NOT auto-fixable and must be fixed manually.",
    "",
    lintOutput,
  ].join("\n"),
);
