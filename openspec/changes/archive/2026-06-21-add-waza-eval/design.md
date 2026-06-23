## Context

`mr-feedback` fetches a GitLab MR through the GitLab MCP and writes a review-readiness
report. Evaluating it requires that MCP dependency, so the suite ships a mock server based
on the `zereight/gitlab-mcp` contract. The suite mirrors the `.waza.yaml` +
`evals/<skill>/eval.yaml` + `tasks/*.yaml` convention used in a sibling repo. Verified on
Waza v0.37.0 with the `copilot-sdk` executor and `claude-sonnet-4.6`.

## Goals / Non-Goals

**Goals:**

- Verify triggering, read-only tool discipline, rubric-aligned scoring, and report writing
  against deterministic fixtures.
- Prove the read-only guarantee by construction (no mutating tool exists to call).

**Non-Goals:**

- Simulating the GitLab API beyond what the skill reads.
- Testing posting/approving/merging (the skill never does this; the mock cannot).

## Decisions

### Decision: Registry routing instead of per-task fixture selection

Smoke runs on Waza 0.37.0 established that `mcp_servers` is eval-level only, a task's
`inputs.environment` does not propagate to the MCP subprocess, server config paths get no
env expansion, the server is spawned in the agent's temp workspace (so an absolute `cwd` is
required), and each server entry needs `tools: ["*"]` or its tools are disabled. A
per-fixture-server fallback was rejected because every server's tools would be exposed to
every task and the skill expects a single `gitlab-mcp`. Adopted instead: the mock runs in
registry mode, loading all fixtures and routing each call by the MR `iid`/`project_id`; each
task selects its scenario through the MR URL in its prompt.

### Decision: Pinned output path so report contents are gradeable

The skill's default output path ends in a unix timestamp, and the `file` grader has no glob
support. Each task therefore pins a deterministic path (e.g. `report.md`) so `must_exist`
and `content_patterns` can target it.

### Decision: Structural graders as the backbone, LLM-judge as a layer

Cheap `trigger`, `skill_invocation`, `tool_constraint`, `file`, and `text` graders carry the
suite; the `prompt` (LLM-as-judge) grader adds the qualitative layer. The judge runs with
`continue_session: true` so it inherits the executor session and can read the written report.

## Risks / Trade-offs

- [The `copilot-sdk` executor and `prompt` graders make real model calls] → cost and
  model-availability dependency; structural graders remain useful if judging is skipped.
- [An absolute `cwd` in `eval.yaml` is machine-specific] → addressed by a sync script that
  rewrites it from a checked-in template on install.

## Migration Plan

Additive; no runtime migration. Install the mock server deps, run a single-task smoke test
with `--keep-workspace --verbose` to confirm wiring and tool names, then the full suite.
