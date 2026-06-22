#!/usr/bin/env node
// Standalone MCP smoke test for the mock GitLab MCP server — does NOT use Waza.
// Spawns server.mjs over stdio, lists tools, makes a sample call, and checks that
// missing-required-param / unknown-tool / unknown-MR-identifier all fail loudly.
// The server has a single mode (registry): each call routes to a scenario by the
// MR iid/project in its arguments, exactly as the Waza eval drives it.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, "server.mjs");

const EXPECTED_TOOLS = [
  "get_merge_request",
  "list_merge_request_changed_files",
  "get_merge_request_file_diff",
  "list_merge_request_discussions",
  "list_merge_request_pipelines",
  "list_pipelines",
];

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

async function connect() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER],
    env: { ...process.env },
  });
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport };
}

async function main() {
  console.log("== 1. lists exactly the six tools ==");
  const { client, transport } = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  const expected = [...EXPECTED_TOOLS].sort();
  if (JSON.stringify(names) === JSON.stringify(expected)) {
    ok(`tool names match exactly: ${names.join(", ")}`);
  } else {
    bad(`tool names differ.\n    got:      ${names.join(", ")}\n    expected: ${expected.join(", ")}`);
  }

  console.log("== 2. get_merge_request returns the fixture payload as text JSON ==");
  const res = await client.callTool({
    name: "get_merge_request",
    arguments: { project_id: "acme%2Fweb-app", merge_request_iid: 42 },
  });
  const block = res.content?.[0];
  if (block?.type === "text") {
    const payload = JSON.parse(block.text);
    if (payload.iid === 42 && payload.title?.includes("CSV export")) {
      ok(`text content parsed; title="${payload.title}", merge_status="${payload.merge_status}"`);
    } else {
      bad(`payload not the ready-mr fixture: ${block.text.slice(0, 120)}`);
    }
  } else {
    bad(`expected text content, got: ${JSON.stringify(block)}`);
  }

  console.log("== 3. file-diff filters by requested file_paths ==");
  const diff = await client.callTool({
    name: "get_merge_request_file_diff",
    arguments: { project_id: "acme%2Fweb-app", file_paths: ["src/reports/export.ts"] },
  });
  const diffPayload = JSON.parse(diff.content[0].text);
  const keys = Object.keys(diffPayload);
  if (keys.length === 1 && keys[0] === "src/reports/export.ts") {
    ok("returned only the requested path's diff");
  } else {
    bad(`expected only requested path, got keys: ${keys.join(", ")}`);
  }

  // An error surfaces either as a thrown protocol error or as an isError result with the
  // message in its text content. Both count as "failed loudly".
  const failedLoudly = async (call) => {
    try {
      const r = await call();
      if (r?.isError) return { failed: true, msg: r.content?.[0]?.text ?? "isError" };
      return { failed: false, msg: JSON.stringify(r).slice(0, 120) };
    } catch (err) {
      return { failed: true, msg: String(err.message ?? err) };
    }
  };

  console.log("== 4. missing required param fails loudly ==");
  {
    const r = await failedLoudly(() =>
      client.callTool({ name: "get_merge_request", arguments: {} }),
    );
    if (r.failed) ok(`rejected missing project_id: ${r.msg.split("\n")[0]}`);
    else bad(`call with no project_id should have errored: ${r.msg}`);
  }

  console.log("== 5. unknown / mutating tool fails loudly ==");
  {
    const r = await failedLoudly(() =>
      client.callTool({
        name: "create_merge_request_note",
        arguments: { project_id: "acme%2Fweb-app", merge_request_iid: 42, body: "hi" },
      }),
    );
    if (r.failed) ok(`rejected create_merge_request_note: ${r.msg.split("\n")[0]}`);
    else bad(`unregistered mutating tool should have errored: ${r.msg}`);
  }

  console.log("== 6. unknown MR identifier fails loudly ==");
  {
    const r = await failedLoudly(() =>
      client.callTool({
        name: "get_merge_request",
        arguments: { project_id: "acme%2Fdoes-not-exist", merge_request_iid: 99999 },
      }),
    );
    if (r.failed) ok(`rejected unknown MR: ${r.msg.split("\n")[0]}`);
    else bad(`call for an unregistered MR should have errored: ${r.msg}`);
  }

  await transport.close();

  console.log("");
  if (failures === 0) {
    console.log("SMOKE TEST: ALL CHECKS PASSED");
    process.exit(0);
  } else {
    console.log(`SMOKE TEST: ${failures} CHECK(S) FAILED`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("smoke test crashed:", err);
  process.exit(1);
});
