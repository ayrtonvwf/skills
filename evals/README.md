# Evals

Automated evaluation suites for the skills in this repo, built on
[Microsoft Waza](https://github.com/microsoft/waza). Each suite lives under
`evals/<skill>/` and runs the skill against deterministic fixtures so behavior can be
checked repeatably without touching live services.

## Suites

| Suite | What it checks |
| ----- | -------------- |
| [`mr-feedback`](mr-feedback/) | Triggering, read-only tool discipline, and rubric-aligned scoring of the `mr-feedback` skill against a mocked GitLab MCP server. |

## Prerequisites

- **Waza CLI ≥ 0.34** on `PATH`. Check with `waza --version`.
  Install/upgrade: `curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash`.
  > **Do not use 0.33.0.** Its tool-permission handshake is incompatible with current
  > Copilot CLI builds — every agent tool call fails with *"unexpected user permission
  > response"*. The fix landed in 0.34.0 ("Tool permission handling now uses the SDK
  > approval kind"). This suite is verified on **0.37.0**.
- **`copilot-sdk` auth.** The executor makes real model calls via GitHub Copilot. There is
  no `waza login`; verify with `waza models` — if it lists models, auth is wired.
- **Node.js** for the mock MCP server. Install its deps once:

  ```bash
  npm --prefix evals/mr-feedback/mock-gitlab-mcp install
  ```

## Running

```bash
# Full mr-feedback suite (config sets trials_per_task: 2)
waza run evals/mr-feedback/eval.yaml --judge-model claude-haiku-4.5

# A single task, keeping the workspace + transcript for debugging
waza run evals/mr-feedback/eval.yaml \
  --task ready-mr-scores-high \
  --keep-workspace --verbose \
  --transcript-dir evals/mr-feedback/.transcripts
```

`--judge-model` is only needed for the one `prompt` (LLM-as-judge) grader in
`not-ready-mr-flags-gaps`; the other tasks use structural graders only. A run passes when
`task_completion` ≥ 0.75 across all tasks.

## How the mock GitLab MCP server works

`mr-feedback/mock-gitlab-mcp/server.mjs` is a stdio MCP server exposing **exactly** the six
read-only tools the skill is allowed to call (`get_merge_request`,
`list_merge_request_changed_files`, `get_merge_request_file_diff`,
`list_merge_request_discussions`, `list_merge_request_pipelines`, `list_pipelines`). No
mutating tool is registered, so any attempt to post/approve/merge fails loudly — this backs
the read-only guardrail test.

Scenario selection has **two modes**:

1. **Registry mode (what the eval uses).** With no `FIXTURE` env var, the server loads every
   file in `fixtures/` and routes each tool call to a scenario by the **MR identifier in the
   request** (`merge_request_iid`, falling back to `project_id`). Each eval task selects its
   scenario simply through the MR URL in its prompt:

   | Fixture | MR URL in the task prompt |
   | ------- | ------------------------- |
   | `ready-mr` | `…/acme/web-app/-/merge_requests/42` |
   | `not-ready-mr` | `…/acme/checkout-service/-/merge_requests/57` |
   | `draft-mr` | `…/acme/offline-sync/-/merge_requests/73` |

2. **Pinned mode (back-compat).** Setting `FIXTURE=<name>` pins one scenario for every call.
   The standalone smoke test uses this:

   ```bash
   node evals/mr-feedback/mock-gitlab-mcp/smoke-test.mjs   # MCP-level checks, no Waza
   ```

Registry mode exists because **per-task environment variables cannot reach the MCP
subprocess** under `copilot-sdk` (confirmed by a smoke run): `mcp_servers` is configured once
at the eval level and a task's `inputs.environment` is not propagated to it. Routing by the
MR identifier keeps a single `gitlab-mcp` server serving all tasks deterministically. See
[`specs/waza-eval/specification.md`](../specs/waza-eval/specification.md) §8 for the full
write-up.

## Gotchas worth knowing

- **`mcp_servers` entry needs `tools: ["*"]`.** Omitting it (or `[]`) registers the server
  but disables every tool — calls then return a null result. (`["*"]` = all, `[]` = none.)
- **MCP server paths must be absolute.** Waza passes `mcp_servers` config to the SDK verbatim
  with no env expansion, and the server is spawned with the agent's temp workspace as its cwd.
  `eval.yaml` therefore sets an absolute `cwd` to `mock-gitlab-mcp/`. If you clone this repo
  elsewhere, update that `cwd` (it is the one machine-specific line).
- **Exposed MCP tool names are namespaced** as `gitlab-mcp-<tool>`. The `tool_constraint`
  grader matches tool names by case-insensitive regex, so its patterns match the bare tool
  substring regardless of the prefix.
- **Report content is asserted via `file.content_patterns`, not `text`.** Each MR task pins
  the output to `report.md` (the skill lets an explicit request override its default path) so
  the `file` grader — which has no glob — can target a known path. The stable content anchors
  are the `**Overall: N/10 - <Label>**` line, the `## …` section headers, and the
  `**[important]**` / `**[nice-to-have]**` flag markers. The H1 title line is **not** asserted
  (the agent varies it).
