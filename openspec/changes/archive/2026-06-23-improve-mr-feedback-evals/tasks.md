## 1. New fixtures

- [x] 1.1 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/no-pipeline-mr.json` — iid 91, project `acme/payments-api`, all six required fixture keys present, `list_merge_request_pipelines` and `list_pipelines` return empty arrays, everything else well-formed
- [x] 1.2 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/hygiene-markers-mr.json` — iid 95, project `acme/catalog-service`, diff contains TODO comments and `console.log` statements, description has Jira link, testing instructions, and proof-of-run
- [x] 1.3 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/middle-tier-mr.json` — iid 84, project `acme/billing-service`, good description and test files in the diff but no proof-of-run

## 2. New eval tasks

- [x] 2.1 Create `evals/mr-feedback/tasks/no-pipeline-data.yaml` — prompt references iid 91 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting `(?i)not available` and no invented pipeline result
- [x] 2.2 Create `evals/mr-feedback/tasks/code-critique-boundary.yaml` — prompt references iid 95 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting hygiene markers are mentioned + `prompt` grader with `continue_session: true` verifying no line-level fix instructions
- [x] 2.3 Create `evals/mr-feedback/tasks/middle-tier-scoring.yaml` — prompt references iid 84 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting a `Needs prep`/`Almost ready` band and that proof-of-run is flagged while present items are not
- [x] 2.4 Create `evals/mr-feedback/tasks/default-output-path.yaml` — prompt references the existing ready-mr (iid 42) but OMITS the output-path override, `skill_invocation` grader + `file` grader with `must_not_exist: ["report.md"]` (override path unused) + `text` grader asserting the announced path matches the deterministic template portion `mr-feedback/web-app-mr-42-<YYYY-MM-DD>-` (slug + iid + date; timestamp not asserted, file grader has no glob)
- [x] 2.5 Create `evals/mr-feedback/tasks/input-clarification.yaml` — incomplete input (no MR URL; also covers bare project path with no iid); the skill is expected to activate then ask, so do NOT use `forbidden_skills`. Use a `tool_constraint` grader asserting zero GitLab fetch tools were called + `file` grader with `must_not_exist: ["report.md"]` + `text` grader asserting the output asks for the MR URL / project iid

## 3. Grader hardening in existing tasks

- [x] 3.1 In `evals/mr-feedback/tasks/not-ready-mr-flags-gaps.yaml`, broaden the `(?i)testing instruction` pattern to `(?i)testing (instruction|step|guide|procedure|how to test)`
- [x] 3.2 In `evals/mr-feedback/tasks/proof-of-run-rejects-tests.yaml`, apply the same broadening to any `testing instruction` pattern present — no grader regex uses `testing instruction` (it appears only in prompt-judge prose), so no change needed

## 4. Grader-signal documentation (verify-only — already present)

- [x] 4.1 In `evals/README.md` (Gotchas section), verify the no-verdict signature is documented — a judge result that reports "All prompts passed" alongside score 0 (the blind/no-verdict case) — and update wording only if it has drifted from observed behavior
- [x] 4.2 In `evals/README.md` (Gotchas section), verify the documented note that a negative-mode `trigger` grader's aggregate score is its raw probability, not its pass rate, still matches observed behavior; update wording only if drifted

## 5. Eval config update

- [x] 5.1 In `evals/mr-feedback/eval.template.yaml`, raise `trials_per_task` from `2` to `3`
- [x] 5.2 Regenerate `evals/mr-feedback/eval.yaml` by running `npm run sync-eval-cwd` from the repo root

## 6. Validate

- [x] 6.1 Run `waza run evals/mr-feedback/eval.yaml` and confirm the new tasks pass and `task_completion` stays at or above its threshold — full suite aggregate 0.94 (≥ 0.75); new tasks code-critique-boundary / default-output-path / input-clarification passed 100%; no-pipeline-data and middle-tier-scoring needed grader-regex fixes (over-strict "not available" match and cross-item false positives), now passing 100% on confirmation re-runs
- [x] 6.2 Run `npm run lint:fix` then `npm run lint` and resolve any remaining markdown errors — 0 errors
