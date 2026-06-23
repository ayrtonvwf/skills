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
  > Copilot CLI builds - every agent tool call fails with *"unexpected user permission
  > response"*. The fix landed in 0.34.0 ("Tool permission handling now uses the SDK
  > approval kind"). This suite is verified on **0.37.0**.
- **`copilot-sdk` auth.** The executor makes real model calls via GitHub Copilot. There is
  no `waza login`; verify with `waza models` - if it lists models, auth is wired.
- **Node.js** for the mock MCP server. Install its deps once, then point the suite at this
  clone's copy of the server (see the `cwd` gotcha below):

  ```bash
  npm --prefix evals/mr-feedback/mock-gitlab-mcp install
  npm run sync-eval-cwd   # from the repo root
  ```

  `sync-eval-cwd` (the repo-root [`scripts/sync-eval-cwd.mjs`](../scripts/sync-eval-cwd.mjs))
  **renders** each suite's running config: it reads the committed `evals/<suite>/eval.template.yaml`
  (source of truth, with a *relative* `cwd:`) and writes a sibling `eval.yaml` with the `cwd:`
  resolved to an absolute path for this checkout. That generated `eval.yaml` is **gitignored** -
  the machine-specific path never enters git. It is idempotent (a no-op if already current) and
  runs automatically via the repo-root `postinstall` hook, so a plain `npm install` keeps the
  suites pointed at the local checkout. New suites are covered automatically as long as they ship
  an `eval.template.yaml` with a relative `cwd:`.

  > **Edit `eval.template.yaml`, never `eval.yaml`.** The latter is a generated artifact;
  > changes to it are lost on the next render (and it is untracked anyway).

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
`not-ready-mr-flags-gaps`; the other tasks use structural graders only.

**Judge the suite by pass rate, not the aggregate `avg` score.** waza reports both
`pass_rate` and `avg`; pin success on `pass_rate` - every grader passing across all tasks -
and treat `avg`/`min_score`/`stddev` as diagnostics only. The aggregate is deliberately not
the gate because a passing `negative`-mode `trigger` grader still reports a low raw number
that drags `avg` down without meaning anything went wrong (see Gotchas). The
`task_completion` metric's `threshold: 0.75` is a coarse floor, not the real bar.

## Executor model

The suite runs the skill against a **single executor model, `claude-sonnet-4.6`** (set in
`eval.yaml` `config.model`). This is deliberate for now: it keeps runs cheap and the signal
stable. The trade-off is that **cross-model robustness is untested** - whether the skill still
follows the rubric under a weaker or different model is an open question. A multi-model matrix
(`waza run … --model A --model B`) is a possible future addition, not a current requirement.

## How the mock GitLab MCP server works

`mr-feedback/mock-gitlab-mcp/server.mjs` is a stdio MCP server exposing **exactly** the six
read-only tools the skill is allowed to call (`get_merge_request`,
`list_merge_request_changed_files`, `get_merge_request_file_diff`,
`list_merge_request_discussions`, `list_merge_request_pipelines`, `list_pipelines`). No
mutating tool is registered, so any attempt to post/approve/merge fails loudly - this backs
the read-only guardrail test.

Scenario selection has a **single mode - registry routing**. The server loads every file in
`fixtures/` and routes each tool call to a scenario by the **MR identifier in the request**
(`merge_request_iid`, falling back to `project_id`). Each eval task selects its scenario
simply through the MR URL in its prompt:

| Fixture | MR URL in the task prompt |
| ------- | ------------------------- |
| `ready-mr` | `…/acme/web-app/-/merge_requests/42` |
| `not-ready-mr` | `…/acme/checkout-service/-/merge_requests/57` |
| `proof-tests-only-mr` | `…/acme/api-service/-/merge_requests/70` |
| `docs-no-jira-mr` | `…/acme/docs-site/-/merge_requests/88` |
| `draft-mr` | `…/acme/offline-sync/-/merge_requests/73` |

The standalone smoke test drives the server the same way - passing an iid/project per call,
no env var needed:

```bash
node evals/mr-feedback/mock-gitlab-mcp/smoke-test.mjs   # MCP-level checks, no Waza
```

Registry routing is the only mechanism because **per-task environment variables cannot reach
the MCP subprocess** under `copilot-sdk` (confirmed by a smoke run): `mcp_servers` is
configured once at the eval level and a task's `inputs.environment` is not propagated to it.
Routing by the MR identifier keeps a single `gitlab-mcp` server serving all tasks
deterministically. See the archived OpenSpec change
[`add-waza-eval/design.md`](../openspec/changes/archive/2026-06-21-add-waza-eval/design.md)
for the full write-up.

## Gotchas worth knowing

- **`mcp_servers` entry needs `tools: ["*"]`.** Omitting it (or `[]`) registers the server
  but disables every tool - calls then return a null result. (`["*"]` = all, `[]` = none.)
- **MCP server paths must be absolute.** Waza passes `mcp_servers` config to the SDK verbatim
  with no env expansion, and the server is spawned with the agent's temp workspace as its cwd.
  The running `eval.yaml` therefore needs an absolute `cwd` to `mock-gitlab-mcp/` - the one
  machine-specific line. That is why `eval.yaml` is generated, not committed: edit the relative
  `cwd` in `eval.template.yaml` and run `npm run sync-eval-cwd` (from the repo root) to render
  `eval.yaml` with the absolute path for your checkout (idempotent; safe in CI before `waza
  run`, and also wired into `postinstall`).
- **Exposed MCP tool names are namespaced** as `gitlab-mcp-<tool>`. The `tool_constraint`
  grader matches tool names by case-insensitive regex, so its patterns match the bare tool
  substring regardless of the prefix.
- **A `prompt` grader at `score: 0, passed: false` with feedback `"All prompts passed"`
  means the judge never graded - it is not a real pass.** That feedback string is the
  signature of a judge that returned no `set_waza_grade_pass`/`set_waza_grade_fail` verdict
  (e.g. it had no report to read). Per waza's scoring (`score = passes / (passes + failures)`,
  so `0/0 → 0`), an ungraded prompt grader always resolves to score 0. If you see a 0-score
  "passed" prompt grader, suspect a blind judge, not a flaky model - confirm the grader sets
  `continue_session: true` (or otherwise feeds the report to the judge) so it actually reads
  the artifact it is grading.
- **A passing `negative` trigger grader reports raw probability, not a pass score.** The
  `does-not-trigger` grader in `anti-trigger-non-mr` (mode `negative`, threshold 0.60)
  **passes** when the trigger probability is below the threshold, but it contributes that raw
  probability (e.g. 0.125) to the task's aggregate - pulling the task `avg` down (~0.78) and
  inflating suite `stddev`/lowering `min_score`. The classification is correct; the number is
  misleading. Interpret this grader as pass/fail, not by its averaged score (this is why suite
  success is pinned on `pass_rate`, not `avg` - see Running).
- **Report content is asserted via `file.content_patterns`, not `text`.** Each MR task pins
  the output to `report.md` (the skill lets an explicit request override its default path) so
  the `file` grader - which has no glob - can target a known path. The stable content anchors
  are the `**Overall: N/10 - <Label>**` line, the `## …` section headers, and the
  `**[important]**` / `**[nice-to-have]**` flag markers. The H1 title line is **not** asserted
  (the agent varies it).
