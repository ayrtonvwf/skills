# Spec: Waza evals for `mr-feedback`

Status: draft · Owner: Ayrton · Target skill: [`mr-feedback`](../../skills/mr-feedback/SKILL.md)

## 1. Goal

Add an automated evaluation suite for the `mr-feedback` skill using
[Microsoft Waza](https://github.com/microsoft/waza), so we can verify — repeatably and
without touching a live GitLab — that the skill:

1. **Triggers** on MR-feedback requests and **does not** trigger on unrelated ones.
2. Calls **only** the allowed, read-only GitLab MCP tools (never posts, approves, or merges).
3. Reasons over realistic MR payloads and produces a report whose **score and flags match
   the rubric** ([`reference/rubric.md`](../../skills/mr-feedback/reference/rubric.md)).
4. Writes the report **file** to the configured output path.

Evaluating the skill requires its GitLab MCP dependency, so the suite ships a **mock
GitLab MCP server** whose contract is based on
[`zereight/gitlab-mcp`](https://github.com/zereight/gitlab-mcp).

## 2. Background

`mr-feedback` fetches a GitLab Merge Request via the GitLab MCP and writes a
review-readiness report. Its configurable behavior lives in
[`reference/preferences.md`](../../skills/mr-feedback/reference/preferences.md):
report language, tone, fetch method (`gitlab-mcp`), the allowed tool list, and the
output path. The skill is **read-only** — it only writes a local markdown file.

We already use Waza in a sibling repo (`blackbird-agent-plugin`, branch
`add-microsoft-waza`); this suite mirrors that convention of `.waza.yaml`,
`evals/<skill>/eval.yaml`, and `tasks/*.yaml`. This repo has no `evals/` yet — this is
the first.

## 3. Tooling

+ **Waza CLI** — installed at `/usr/local/bin/waza`. Use **≥ v0.34** (verified on
  **v0.37.0**). **Do not use v0.33.0**: its tool-permission handshake is incompatible with
  current Copilot CLI builds and every agent tool call fails with *"unexpected user
  permission response"* (fixed in 0.34.0, "Tool permission handling now uses the SDK approval
  kind"). Commands used: `waza run`.
+ **Executor** — `copilot-sdk` (makes real model calls; same as the blackbird example).
+ **Model** — `claude-sonnet-4.6` for execution; a Claude judge model via `--judge-model`
  for `prompt` graders.
+ **Mock MCP server** — Node.js (repo is already Node/ESM), stdio transport, built on
  `@modelcontextprotocol/sdk`.

## 4. File layout

```text
.waza.yaml                                  # repo-level waza config
evals/
└── mr-feedback/
    ├── eval.yaml                           # suite: config + mcp_servers + global graders + metrics
    ├── mock-gitlab-mcp/
    │   ├── server.mjs                       # stdio MCP server, 6 tools, fixture-driven
    │   ├── package.json                     # dep: @modelcontextprotocol/sdk
    │   └── fixtures/
    │       ├── ready-mr.json                # well-prepared MR
    │       ├── not-ready-mr.json            # weak MR (no Jira link, no tests, no proof)
    │       ├── proof-tests-only-mr.json     # proof-of-run is ONLY a passing test log (must still flag)
    │       ├── docs-no-jira-mr.json         # docs-only MR, explicitly no Jira card (exemptions)
    │       └── draft-mr.json                # draft / no-diff-yet edge case
    └── tasks/
        ├── ready-mr-scores-high.yaml
        ├── not-ready-mr-flags-gaps.yaml
        ├── proof-of-run-rejects-tests.yaml
        ├── exemptions-not-penalized.yaml
        ├── draft-mr-handled.yaml
        ├── read-only-no-mutations.yaml
        └── anti-trigger-non-mr.yaml
specs/waza-eval/                             # this specification
```

## 5. Mock GitLab MCP server

### 5.1 Contract (based on `zereight/gitlab-mcp`)

`project_id` = URL-encoded path (`group%2Fsubgroup%2Fproject`) or numeric id.
`merge_request_iid` = the MR internal id.

| Tool (exact name) | Required | Optional | Returns |
| ----------------- | -------- | -------- | ------- |
| `get_merge_request` | `project_id` | `merge_request_iid`, `source_branch` | MR object: title, description, author, state, source/target branch, draft (`work_in_progress`), labels, milestone, **commit summary**, approvals summary, `merge_status`, behind-count |
| `list_merge_request_changed_files` | `project_id` | `merge_request_iid`, `source_branch` | array of changed file **paths only** + add/del counts, no diff content |
| `get_merge_request_file_diff` | `project_id`, `file_paths` | `merge_request_iid`, `source_branch`, `unidiff` | per-file diff text for the requested paths |
| `list_merge_request_discussions` | `project_id`, `merge_request_iid` | `page`, `per_page` | array of discussion notes |
| `list_merge_request_pipelines` | `project_id`, `merge_request_iid` | `page`, `per_page` | array of pipeline summaries (id, status, ref, sha) |
| `list_pipelines` | `project_id` | `scope`, `status`, `ref`, `sha`, `order_by`, `sort`, `page`, `per_page`, … | array of pipelines |

### 5.2 Behavior requirements

+ Register **exactly** these six tools by their exact names — the skill calls them by name.
+ **Do not** register any mutating tool (create note, approve, merge). If the skill ever
  attempts one, the call must fail loudly — this backs the read-only guardrail test.
+ Each tool wraps its payload as MCP `content` of `type: "text"` whose body is the JSON
  GitLab payload, matching how `zereight/gitlab-mcp` returns data (so the skill parses
  identically to production).
+ Validate incoming params against the required/optional sets above; a missing required
  param fails the way production would.
+ The server runs in **registry mode**: it loads every fixture in `fixtures/` and routes
  each tool call to a scenario by the MR identifier in its arguments (`merge_request_iid`,
  falling back to `project_id`). Each task therefore selects its scenario deterministically
  through the MR URL in its prompt — there is no per-scenario env var (see §8.1 for why).

### 5.3 Fixture shape

One file per scenario holding the per-tool response map:

```json
{
  "get_merge_request": { "title": "...", "description": "...", "work_in_progress": false, "...": "..." },
  "list_merge_request_changed_files": [ { "path": "src/foo.ts", "additions": 12, "deletions": 3 } ],
  "get_merge_request_file_diff": { "src/foo.ts": "@@ ... @@" },
  "list_merge_request_discussions": [],
  "list_merge_request_pipelines": [ { "id": 1, "status": "failed", "ref": "feature/x", "sha": "abc123" } ],
  "list_pipelines": [ { "id": 1, "status": "failed" } ]
}
```

Fixtures must be internally consistent with what they intend to test (e.g. `not-ready-mr`
has an empty/template description, no test files in the changed-file list, no proof-of-run
in the description, and a failed pipeline).

## 6. `eval.yaml` design

```yaml
name: mr-feedback-eval
description: Review-readiness scoring + read-only guardrails for the mr-feedback skill, against mocked GitLab MCP fixtures.
skill: mr-feedback
version: "1.0"
config:
  trials_per_task: 2          # variance signal on LLM-judged tasks
  timeout_seconds: 180
  parallel: false
  executor: copilot-sdk
  model: claude-sonnet-4.6
  mcp_servers:
    gitlab-mcp:               # name the skill's preferences expect
      command: node
      args: ["server.mjs"]
      cwd: <ABSOLUTE path to mock-gitlab-mcp/>   # RESOLVED: paths are passed verbatim with
                                                 # no env expansion; the server is spawned in
                                                 # the agent's temp workspace, so cwd must be
                                                 # absolute (§8.1).
      tools: ["*"]            # RESOLVED: required — omitted/[] registers but DISABLES all
                              # tools (calls return null). "*" = all, [] = none.
      # No per-task env reaches the MCP subprocess (§8.1), so the mock has a single mode:
      # it loads every fixture and routes each call to a scenario by the MR iid/project in
      # the request. Each task selects its scenario via the MR URL in its prompt.
graders:                      # global, every task
  - type: text
    name: no-fatal-errors
    config:
      regex_not_match:
        - "(?i)traceback|exception|command not found"
metrics:
  - name: task_completion
    weight: 1.0
    threshold: 0.75
tasks:
  - "tasks/*.yaml"
```

## 7. Grading strategy

Cheap structural graders are the backbone; the `prompt` (LLM-as-judge) grader is the
optional qualitative layer. **Exact, verified config syntax for every grader type used is
in Appendix A (§11) — use it, do not guess field names.** Key facts that shape the
strategy:

+ The `text` grader checks the agent's **final output text only**, not files on disk.
+ The `file` grader has **no glob support**; `must_exist` / `content_patterns.path` need
  **exact** workspace-relative paths.
+ The skill's default output path ends in a unix timestamp, so its exact name is unknown
  ahead of time. **Resolution: each eval task prompt pins a deterministic output path** —
  see §7.1. This is what makes report-content grading possible.

Grader roles:

+ `trigger` — `mode: positive` on MR requests, `mode: negative` on unrelated requests.
+ `skill_invocation` — `required_skills: [mr-feedback]` for positive cases;
  `forbidden_skills: [mr-feedback]` for the anti-trigger case.
+ `tool_constraint` / `behavior` — only the six read tools called; any note/approve/merge
  rejected. See §8 for the open question of how MCP tool names surface to these graders.
+ `file` — report written at the **pinned** path (`content_patterns` asserts its contents).
+ `text` — assertions on the agent's final chat response (e.g. it told the user the path).
+ `prompt` — qualitative: no code critique, collaborative tone, score consistent with rubric.

Per-task grader assignment lives in [`tasks.md`](./tasks.md).

### 7.1 Deterministic output path for evals

The skill's precedence (rule #1 in [`SKILL.md`](../../skills/mr-feedback/SKILL.md)) lets an
explicit instruction in the user's request override the preferences output path. Each eval
task therefore appends an instruction to its prompt, e.g.:

> Write the report to `report.md` in the current working directory.

This yields a fixed, known path (`report.md`) the `file` grader can target with
`must_exist` and `content_patterns`. Without this, report contents are ungradeable by the
`file` grader (no glob) and only partially observable via the `text` grader (final output
only).

### 7.2 Report-content contract (strings to assert)

Report-content graders must match the actual strings the skill emits, defined by
[`report-template.md`](../../skills/mr-feedback/reference/report-template.md). The stable
anchors a fresh implementer can assert on:

+ ~~Title line: `# MR Review-Readiness -`~~ — **NOT reliable in practice.** The agent varies
  the H1 (e.g. `# MR !42 - <title>` vs `# MR Review-Readiness - <title>`); do **not** assert
  it. Use the Overall line + a `## …` section header as the structural anchor instead.
+ Overall line: `**Overall: <n>/10 - <Label>**` where `<Label>` ∈
  `Ready | Almost ready | Needs prep | Not ready`.
+ The per-area table row label `Required readiness items`.
+ Section headers `## What's working`, `## To raise readiness`, `## Suggested next steps`,
  `## AI Transparency`.
+ Flag markers `**[important]**` and `**[nice-to-have]**`.

Map per scenario:

+ **ready-mr** → label `Ready` or `Almost ready`; **no** `**[important]**` line for the
  three required items.
+ **not-ready-mr** → label `Needs prep` or `Not ready`; `**[important]**` lines naming the
  missing Jira link, testing instructions, and proof-of-run, each with a tailored
  "why it matters".
+ **proof-tests-only-mr** → Jira link, testing instructions, tests, and green pipeline are
  all present, but the only proof-of-run is a passing test log; report must still flag
  proof-of-run as an `**[important]**` gap (a passing test run is not proof the real code
  ran) and must **not** flag the items that are present.
+ **docs-no-jira-mr** → docs-only MR that explicitly states it has no Jira card; label
  `Ready`/`Almost ready` with **no** `**[important]**` line — the missing Jira link is
  exempted (explained in the description) and test coverage is not applicable.
+ **draft-mr** → report still produced; text explicitly notes the draft / no-diff state.

> The implementer must read `report-template.md` and `rubric.md` in full before writing
> content graders — the strings above are anchors, not the complete template.

## 8. Open items — RESOLVED during build

All four were settled by smoke runs on waza 0.37.0. Outcomes:

1. **`mcp_servers` wiring + per-task `FIXTURE`** — RESOLVED, but **not** as originally
   imagined. Findings: (a) `mcp_servers` is **eval-level only**; tasks cannot override it.
   (b) A task's `inputs.environment` does **not** propagate to the MCP subprocess (verified:
   a config-level `FIXTURE` won over a task-level one). (c) Server config paths are passed
   verbatim with **no env expansion**, and the server is spawned with the agent's **temp
   workspace** as cwd, so a relative `args` path fails silently — an absolute `cwd` is
   required. (d) Each server entry needs **`tools: ["*"]`** or all its tools are disabled.
   The per-fixture-server fallback was rejected (every server's tools would be exposed to
   every task, and the skill expects one `gitlab-mcp`). **Adopted instead:** the mock runs in
   *registry mode* — it loads all fixtures and routes each call by the MR `iid`/`project_id`
   in the request; each task picks its scenario through the MR URL in its prompt. This is the
   server's only selection mechanism (the standalone smoke test drives it the same way, by
   passing an iid/project per call).
2. **MCP tool names to graders** — RESOLVED. The `copilot-sdk` executor exposes MCP tools as
   **`gitlab-mcp-<tool>`** (e.g. `gitlab-mcp-get_merge_request`). The read-only guardrail uses
   `tool_constraint` (case-insensitive regex), whose patterns match the bare tool substring
   regardless of the namespace prefix.
3. **`file` grader target** — RESOLVED. The pinned `report.md` lands at the workspace root the
   `file` grader inspects; `must_exist: ["report.md"]` works directly.
4. **`copilot-sdk` authentication** — RESOLVED. `waza models` lists models in this
   environment; no extra auth step was needed.

## 9. Out of scope

+ Testing GitLab API fidelity beyond what the skill reads.
+ Posting/approving/merging behavior (the skill never does this; the mock can't).
+ Evaluating other skills in the repo.

## 10. Risks / notes

+ `copilot-sdk` + `prompt` graders make **real model calls** — there is a cost and a
  model-availability dependency. Structural graders remain useful even if judging is skipped.
+ Mocks are **scenario-driven**, not a GitLab API simulation — the right altitude for a
  skill eval (we test the skill's reasoning and tool discipline, not GitLab).

## 11. Appendix A — Grader reference (verified field names)

Field names below were verified against the Waza source
(`github.com/microsoft/waza/docs/graders`). Use these exactly. Implemented graders only —
`llm`, `llm_comparison`, `human`, `human_calibration`, `script`, and `tool_calls` are
**not implemented**; do not use them (use `prompt` for LLM-as-judge).

### `trigger`

```yaml
- type: trigger
  name: triggers-on-mr
  config:
    skill_path: skills/mr-feedback/SKILL.md
    mode: positive        # positive = pass when score >= threshold; negative = pass when < threshold
    threshold: 0.6
```

### `skill_invocation`

```yaml
- type: skill_invocation
  name: mr-feedback-ran
  config:
    required_skills: ["mr-feedback"]   # must be invoked
    mode: any_order                    # or in_order
    allow_extra: true
# Anti-trigger form:
- type: skill_invocation
  name: mr-feedback-not-invoked
  config:
    forbidden_skills: ["mr-feedback"]  # fails (0.0) if invoked
```

### `tool_constraint` (regex matching — preferred for the read-only guardrail)

```yaml
- type: tool_constraint
  name: read-only-tools
  config:
    expect_tools:                      # each entry = one check
      - tool: "get_merge_request"
    reject_tools:
      - tool: "create_merge_request_note"
      - tool: "approve_merge_request"
      - tool: "merge_merge_request"
# Sub-fields per entry: tool (name regex, case-insensitive),
# command_pattern (bash/powershell), skill_pattern (skill name), path_pattern (file path).
# NOTE: adjust `tool` values to the ACTUAL exposed tool names — see §8 item 2.
```

### `behavior` (exact-match tool names; metrics)

```yaml
- type: behavior
  name: efficiency-and-tools
  config:
    max_tool_calls: 20
    max_tokens: 60000
    max_duration_ms: 180000
    required_tools: ["get_merge_request"]      # EXACT names, no regex/wildcards
    forbidden_tools: ["create_merge_request_note"]
```

### `file` (no glob — exact workspace-relative paths)

```yaml
- type: file
  name: report-written
  config:
    must_exist: ["report.md"]          # pinned path from §7.1
    must_not_exist: []
    content_patterns:
      - path: "report.md"
        must_match:
          - "# MR Review-Readiness -"
          - "\\*\\*Overall: \\d+/10 - (Needs prep|Not ready)\\*\\*"
          - "\\*\\*\\[important\\]\\*\\*"
        must_not_match: []
```

### `text` (checks the agent's FINAL OUTPUT text, not files)

```yaml
- type: text
  name: mentions-report-path
  config:
    contains: ["report.md"]            # case-insensitive
    not_contains: ["posted the note", "approved"]
    contains_cs: []                    # case-sensitive variants
    not_contains_cs: []
    regex_match: []
    regex_not_match: ["(?i)traceback|exception|command not found"]
```

### `prompt` (LLM-as-judge — the only implemented judging grader)

```yaml
- type: prompt
  name: tone-and-no-code-critique
  config:
    model: claude-haiku-4.5            # or omit and pass --judge-model on the CLI
    # MUST be true when grading an artifact the skill wrote (e.g. report.md): it reuses
    # the executor session by ID so the judge inherits that workspace and can read the
    # file. With continue_session: false the judge starts blank, has no report to read,
    # calls neither grade tool, and the task resolves to score 0 / passed false.
    continue_session: true
    prompt: |
      In this session you just wrote an MR review-readiness report to `report.md`.
      Read that file and grade it.
      PASS only if ALL hold:
      - It does NOT critique the code or suggest code/logic changes.
      - Tone is collaborative and encouraging.
      - The overall label matches the rubric given the fixture (a weak MR is "Needs prep"
        or "Not ready").
      Call set_waza_grade_pass(description, reason) if all hold,
      else set_waza_grade_fail(description, reason).
```

Score = `passes / (passes + failures)`; `passed` is true only with ≥1 pass and 0 fails.

## 12. Prerequisites & how to run

### Prerequisites

+ **Waza CLI** on PATH (`/usr/local/bin/waza`, **≥ v0.34** — 0.33.0's permission handshake is
  broken; see §3). Verify: `waza --version`.
  Upgrade: `curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash`.
+ **Node.js** (repo `.nvmrc` pins the version) for the mock server. Run
  `npm install` inside `evals/mr-feedback/mock-gitlab-mcp/` to fetch
  `@modelcontextprotocol/sdk`.
+ **`copilot-sdk` auth** — the executor makes real model calls and needs GitHub Copilot
  credentials present in the environment. There is **no** `waza login`/`waza auth` command.
  Verify access with `waza models` — if it lists models, auth is wired; if it errors,
  resolve Copilot auth in the environment before running (open item §8 item 4).

### Commands

```bash
# 0. Mock server deps
npm --prefix evals/mr-feedback/mock-gitlab-mcp install

# 1. Vertical-slice smoke test (one task), keep workspace + transcript for wiring/tool names
waza run evals/mr-feedback/eval.yaml \
  --task ready-mr-scores-high \
  --keep-workspace --verbose \
  --transcript-dir evals/mr-feedback/.transcripts

# 2. Full suite
waza run evals/mr-feedback/eval.yaml

# Optionally override the judge model for prompt graders
waza run evals/mr-feedback/eval.yaml --judge-model claude-haiku-4.5
```

A run passes when `task_completion` ≥ its threshold (0.75) across all tasks.

## 13. Appendix B — Reference snippets (inlined for self-containment)

These come from the sibling `blackbird-agent-plugin` repo (branch `add-microsoft-waza`),
inlined so this spec stands alone if that repo is unavailable. Adapt names/paths to this repo.

### `.waza.yaml` (repo root)

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/microsoft/waza/main/schemas/config.schema.json
paths:
  skills: skills/
  evals: evals/
  results: evals/results/
files:
  evalFile: eval.yaml
  taskGlob: tasks/*.yaml
  taskFileSuffix: .yaml
defaults:
  engine: copilot-sdk
  model: claude-sonnet-4.6
  timeout: 300
  parallel: false
  workers: 4
  verbose: false
  sessionLog: false
cache:
  enabled: false
  dir: .waza-cache
server:
  port: 3000
  resultsDir: evals/results/
graders:
  programTimeout: 30
```

> Note: this repo nests skills at `skills/<name>/` (see repo README). If `paths.skills`
> must point at the directory that *contains* skill folders, set it to `skills/`
> accordingly and confirm during the smoke run.

### Example `eval.yaml` (pattern reference)

```yaml
name: search-latest-dependency-version-eval
description: Evaluation suite for the search-latest-dependency-version skill.
skill: search-latest-dependency-version
version: "1.0"
config:
  trials_per_task: 2
  timeout_seconds: 120
  parallel: true
  executor: copilot-sdk
  model: claude-sonnet-4.6
graders:
  - type: code
    name: has-output
    config:
      assertions:
        - "len(output) > 0"
  - type: text
    name: no-fatal-errors
    config:
      regex_not_match:
        - "(?i)traceback|exception|command not found|fatal error"
metrics:
  - name: task_completion
    weight: 1.0
    threshold: 0.75
tasks:
  - "tasks/*.yaml"
```

### Example task YAML (pattern reference)

```yaml
id: npm-express-latest
description: Look up the latest stable version of the 'express' npm package.
inputs:
  prompt: |
    I'm working on a Node.js project. What is the latest stable version of 'express' on npm?
  files:
    - path: package.json
graders:
  - type: text
    name: contains-semver
    config:
      regex_match:
        - "v?\\d+\\.\\d+\\.\\d+"
  - type: skill_invocation
    name: skill-invoked
    config:
      required_skills:
        - search-latest-dependency-version
      mode: any_order
```
