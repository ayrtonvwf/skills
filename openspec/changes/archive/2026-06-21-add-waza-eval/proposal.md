## Why

The `mr-feedback` skill needed its behavior verified repeatably without touching a live
GitLab: that it triggers correctly, calls only read-only tools, scores in line with the
rubric, and writes its report. No `evals/` existed yet. This change established the first
evaluation suite for the repo.

## What Changes

- Add a Microsoft Waza eval suite for `mr-feedback` under `evals/mr-feedback/`.
- Ship a **mock GitLab MCP server** that registers exactly the six read-only tools the
  skill is allowed to call and no mutating tool, so the read-only guardrail is proven by
  the harness.
- Drive scenarios by **registry routing**: the server loads every fixture and routes each
  call by the MR identifier in the request, because per-task environment variables do not
  reach the MCP subprocess under `copilot-sdk`.
- Grade triggering, skill invocation, read-only tool discipline, report file contents, and
  final-output assertions, using only the graders the installed Waza version implements.

## Capabilities

### New Capabilities

- `mr-feedback-eval`: the automated evaluation suite and its mock GitLab MCP boundary for
  the `mr-feedback` skill.

### Modified Capabilities

<!-- none -->

## Impact

- New `evals/` tree: `eval.yaml`, `mock-gitlab-mcp/` (server, fixtures), and `tasks/`.
- Repo-level `.waza.yaml`.
- No change to the skill itself.
