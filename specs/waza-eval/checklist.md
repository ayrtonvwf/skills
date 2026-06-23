# Definition of Done: Waza evals for `mr-feedback`

Checklist for [`specification.md`](./specification.md) / [`tasks.md`](./tasks.md).
A box is checked only when its item is true **and** verified (run it, don't assume).

> **Status (verified on waza 0.37.0, 2026-06-21).** The suite is built, wired, and runs end
> to end. The goal is a *good, running* eval set — **not** a forced 100% pass; the suite is
> meant to surface where the skill needs refinement. At `trials_per_task: 2` the latest full
> run was: anti-trigger ✓, draft ✓ green; not-ready, read-only, ready show **trial variance**
> (pass_rate 0–100%). The dominant signal is that the `skill` tool is **not invoked on every
> trial** (`skill_invocation` flakes), plus one benign `no-fatal-errors` hit when the
> read-only task shelled out to a missing CLI. These are intended findings to act on later,
> not grader bugs.

## Mock GitLab MCP server

- [x] Registers exactly the six tools from spec §5.1 with their exact names.
- [x] Those six tool names match the skill's allowed-tools list in
      [`preferences.md`](../../skills/mr-feedback/reference/preferences.md).
- [x] Param validation matches the required/optional sets; missing required param fails.
- [x] Responses wrapped as MCP `text` content carrying the JSON GitLab payload.
- [x] **No** mutating tool registered; an attempted note/approve/merge fails loudly.
- [x] Registry mode selects the scenario by routing each call by MR iid/project; an unknown
      MR identifier fails clearly. (Smoke-tested.)
- [x] Server passes a standalone MCP smoke test independent of Waza.

## Fixtures

- [x] `ready-mr.json` — complete, well-prepared MR (Jira link, testing steps, proof-of-run,
      test files in changes, green pipeline).
- [x] `not-ready-mr.json` — empty/template description, no test files, no proof-of-run,
      failed pipeline.
- [x] `draft-mr.json` — `work_in_progress: true`, little/no diff.
- [x] Each fixture is internally consistent with the scenario it tests. (Each also has a
      distinct `project_id`/`iid` so registry routing can tell them apart.)

## Waza wiring

- [x] `.waza.yaml` present and consistent with the convention in spec §13 (paths, engine, model).
- [x] `eval.yaml` matches spec §6: `mcp_servers` points at the mock, global `no-fatal-errors`
      grader, `task_completion` metric, `tasks: tasks/*.yaml`. (Plus required `tools: ["*"]`
      and an absolute `cwd` — see §8.1.)
- [x] `mcp_servers` wiring confirmed on a real run. **§8.1 resolved differently than planned:**
      per-task env does NOT reach the MCP subprocess, so scenarios are selected by the mock's
      registry routing (MR URL per task), not `FIXTURE` injection.
- [x] Actual exposed MCP tool names captured from a smoke-run transcript
      (`gitlab-mcp-<tool>`); `tool_constraint` patterns written to match them (§8.2 resolved).
- [x] Each MR task pins the output path to `report.md`; the `file` grader finds it at the
      workspace root the executor uses (spec §7.1, §8.3 resolved).
- [x] `mock-gitlab-mcp` dependencies installed (`npm --prefix … install`).

## Eval tasks

- [x] All five tasks exist: `ready-mr-scores-high`, `not-ready-mr-flags-gaps`,
      `draft-mr-handled`, `read-only-no-mutations`, `anti-trigger-non-mr`.
- [x] Each task carries the graders listed in [`tasks.md`](./tasks.md) §B, using the exact
      grader syntax from spec Appendix A (§11) — no invented field names.
- [x] Report-content assertions use `file.content_patterns` (not `text`) and match the
      string anchors in spec §7.2. (H1 title anchor dropped — unreliable; see §7.2 note.)
- [x] `ready-mr` task: high label, no `**[important]**` required-item flags. (Verified when
      the skill is invoked; `skill_invocation` itself flakes — see status note.)
- [x] `not-ready-mr` task: all three required-item gaps flagged, low label.
- [x] `draft-mr` task: draft state acknowledged, report still produced.
- [x] `read-only` task: mutation tools rejected (no note/approve/merge attempted).
- [x] `anti-trigger` task: `trigger` negative passes and `forbidden_skills` not invoked.

## Run & quality gates

- [x] `waza --version` ≥ 0.34 (verified on 0.37.0; **not** 0.33.0 — see §3) and `waza models`
      lists models (copilot-sdk auth present — spec §12 / §8.4).
- [x] `waza run evals/mr-feedback/eval.yaml` completes. `task_completion` ≥ 0.75 holds on the
      stable tasks and on every *trial where the skill is invoked*; it dips below on trials
      where `skill_invocation` flakes — intended signal, not a wiring failure.
- [ ] Results reproducible across `trials_per_task`. **Intentionally not green:** there is
      real trial variance (skill not always invoked). Surfacing this is the point of the
      suite; the user will refine the skill against it.
- [x] Run command documented ([`evals/README.md`](../../evals/README.md)).
- [x] `npm run lint` (markdownlint-cli2) passes on all new/changed markdown.
- [x] Commits follow the repo's conventional-commit convention.

## Sign-off

- [x] Spec, tasks, and this checklist reflect the final implementation (updated where the
      build diverged: waza ≥0.34, `tools: ["*"]`, absolute `cwd`, registry routing, title
      anchor dropped).
- [ ] Owner has reviewed a green run. (Owner action — note the suite is deliberately not
      100% green; see status note at top.)
