#!/usr/bin/env node
// Fixture-driven mock of the zereight/gitlab-mcp server for the mr-feedback Waza evals.
//
// - Registers EXACTLY the six read-only tools the skill is allowed to call
//   (spec specification.md §5.1 / preferences.md). No mutating tool is registered, so any
//   attempt to post a note, approve, or merge fails loudly with a method-not-found error.
// - Each tool returns its payload as MCP `text` content whose body is the JSON GitLab
//   payload, matching how zereight/gitlab-mcp returns data (spec §5.2).
// - Params are validated against the required/optional sets; a missing required param is
//   rejected by the schema the way production would reject it.
// - The server runs in registry mode: every fixture in ./fixtures/ is loaded at startup
//   and each tool call is routed to a scenario by the MR identifier in its arguments
//   (merge_request_iid, falling back to project_id). A call for an unknown MR fails loudly.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "fixtures");

// Every fixture must define a response for each of the six tools.
const REQUIRED_FIXTURE_KEYS = [
  "get_merge_request",
  "list_merge_request_changed_files",
  "get_merge_request_file_diff",
  "list_merge_request_discussions",
  "list_merge_request_pipelines",
  "list_pipelines",
];

function loadFixture(name) {
  const fixturePath = resolve(FIXTURES_DIR, `${name}.json`);
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  } catch (err) {
    console.error(
      `[mock-gitlab-mcp] Could not load fixture "${name}" at ${fixturePath}: ${err.message}. Aborting.`,
    );
    process.exit(1);
  }
  const missingKeys = REQUIRED_FIXTURE_KEYS.filter((k) => !(k in fixture));
  if (missingKeys.length > 0) {
    console.error(
      `[mock-gitlab-mcp] Fixture "${name}" is missing response keys: ${missingKeys.join(", ")}. Aborting.`,
    );
    process.exit(1);
  }
  return fixture;
}

// --- Scenario selection (registry mode) -------------------------------------
//
// Every fixture in fixtures/ is loaded at startup and each tool call is routed
// to a scenario by the MR identifier in its arguments (merge_request_iid, else
// project_id). This is the single selection mechanism: a Waza eval task picks its
// scenario through the MR URL (iid/project) in its prompt, and the standalone
// smoke test does the same by passing an iid/project on each call. Per-task env
// can't reach this subprocess, so routing by request identity is what lets one
// server serve every task deterministically.

// Registry indexed by MR iid and by project_id (raw + URL-decoded forms).
const byIid = new Map();
const byProject = new Map();

function normProject(p) {
  return decodeURIComponent(String(p)).toLowerCase();
}

function registerFixture(name, fixture) {
  const mr = fixture.get_merge_request ?? {};
  if (mr.iid != null) byIid.set(String(mr.iid), fixture);
  if (mr.project_id != null) {
    byProject.set(normProject(mr.project_id), fixture);
    // Also index by last path segment (project slug) for lenient matching.
    const slug = normProject(mr.project_id).split("/").pop();
    if (slug) byProject.set(slug, fixture);
  }
}

const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`[mock-gitlab-mcp] No fixtures found in ${FIXTURES_DIR}. Aborting.`);
  process.exit(1);
}
for (const f of files) registerFixture(f.replace(/\.json$/, ""), loadFixture(f.replace(/\.json$/, "")));

// Resolve the active fixture for a single tool call from its arguments.
function fixtureFor(args = {}) {
  if (args.merge_request_iid != null && byIid.has(String(args.merge_request_iid))) {
    return byIid.get(String(args.merge_request_iid));
  }
  if (args.project_id != null) {
    const key = normProject(args.project_id);
    if (byProject.has(key)) return byProject.get(key);
    const slug = key.split("/").pop();
    if (slug && byProject.has(slug)) return byProject.get(slug);
  }
  const tried = `iid=${args.merge_request_iid ?? "-"} project=${args.project_id ?? "-"}`;
  throw new Error(
    `[mock-gitlab-mcp] No fixture matches this MR (${tried}). Known iids: ${[...byIid.keys()].join(", ")}.`,
  );
}

// --- Helpers ----------------------------------------------------------------

// Wrap a JSON payload as MCP text content, matching zereight/gitlab-mcp's shape.
function jsonContent(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

// --- Server -----------------------------------------------------------------

const server = new McpServer({
  name: "mock-gitlab-mcp",
  version: "1.0.0",
});

// 1. get_merge_request
server.registerTool(
  "get_merge_request",
  {
    description:
      "Get a single merge request (title, description, author, state, branches, draft, labels, commit/approvals summary, merge_status).",
    inputSchema: {
      project_id: z.string(),
      merge_request_iid: z.union([z.string(), z.number()]).optional(),
      source_branch: z.string().optional(),
    },
  },
  async (args) => jsonContent(fixtureFor(args).get_merge_request),
);

// 2. list_merge_request_changed_files
server.registerTool(
  "list_merge_request_changed_files",
  {
    description:
      "List the file paths changed in a merge request (paths + add/del counts, no diff content).",
    inputSchema: {
      project_id: z.string(),
      merge_request_iid: z.union([z.string(), z.number()]).optional(),
      source_branch: z.string().optional(),
    },
  },
  async (args) => jsonContent(fixtureFor(args).list_merge_request_changed_files),
);

// 3. get_merge_request_file_diff
server.registerTool(
  "get_merge_request_file_diff",
  {
    description: "Get the per-file diff text for the requested file paths.",
    inputSchema: {
      project_id: z.string(),
      file_paths: z.array(z.string()),
      merge_request_iid: z.union([z.string(), z.number()]).optional(),
      source_branch: z.string().optional(),
      unidiff: z.boolean().optional(),
    },
  },
  async ({ file_paths, ...args }) => {
    const all = fixtureFor(args).get_merge_request_file_diff ?? {};
    // Return only the diffs for the requested paths (production filters by file_paths).
    const selected = {};
    for (const path of file_paths) {
      if (path in all) selected[path] = all[path];
    }
    return jsonContent(selected);
  },
);

// 4. list_merge_request_discussions
server.registerTool(
  "list_merge_request_discussions",
  {
    description: "List the discussion notes on a merge request.",
    inputSchema: {
      project_id: z.string(),
      merge_request_iid: z.union([z.string(), z.number()]),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
  },
  async (args) => jsonContent(fixtureFor(args).list_merge_request_discussions),
);

// 5. list_merge_request_pipelines
server.registerTool(
  "list_merge_request_pipelines",
  {
    description: "List the pipelines for a merge request (id, status, ref, sha).",
    inputSchema: {
      project_id: z.string(),
      merge_request_iid: z.union([z.string(), z.number()]),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
  },
  async (args) => jsonContent(fixtureFor(args).list_merge_request_pipelines),
);

// 6. list_pipelines
server.registerTool(
  "list_pipelines",
  {
    description: "List the pipelines for a project.",
    inputSchema: {
      project_id: z.string(),
      scope: z.string().optional(),
      status: z.string().optional(),
      ref: z.string().optional(),
      sha: z.string().optional(),
      order_by: z.string().optional(),
      sort: z.string().optional(),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
  },
  async (args) => jsonContent(fixtureFor(args).list_pipelines),
);

// --- Start ------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `[mock-gitlab-mcp] connected (registry mode; iids ${[...byIid.keys()].join(", ")})`,
);
