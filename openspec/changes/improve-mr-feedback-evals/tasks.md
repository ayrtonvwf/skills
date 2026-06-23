## 1. New fixtures

- [ ] 1.1 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/no-pipeline-mr.json` — iid 91, project `acme/payments-api`, all six required fixture keys present, `list_merge_request_pipelines` and `list_pipelines` return empty arrays, everything else well-formed
- [ ] 1.2 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/hygiene-markers-mr.json` — iid 95, project `acme/catalog-service`, diff contains TODO comments and `console.log` statements, description has Jira link, testing instructions, and proof-of-run
- [ ] 1.3 Create `evals/mr-feedback/mock-gitlab-mcp/fixtures/middle-tier-mr.json` — iid 84, project `acme/billing-service`, good description and test files in the diff but no proof-of-run

## 2. New eval tasks

- [ ] 2.1 Create `evals/mr-feedback/tasks/no-pipeline-data.yaml` — prompt references iid 91 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting `(?i)not available` and no invented pipeline result
- [ ] 2.2 Create `evals/mr-feedback/tasks/code-critique-boundary.yaml` — prompt references iid 95 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting hygiene markers are mentioned + `prompt` grader with `continue_session: true` verifying no line-level fix instructions
- [ ] 2.3 Create `evals/mr-feedback/tasks/middle-tier-scoring.yaml` — prompt references iid 84 MR, pins `report.md`, `skill_invocation` grader + `file` grader asserting a `Needs prep`/`Almost ready` band and that proof-of-run is flagged while present items are not
- [ ] 2.4 Create `evals/mr-feedback/tasks/default-output-path.yaml` — prompt references the existing ready-mr (iid 42) but OMITS the output-path override, `skill_invocation` grader + `file` grader asserting a file matching the templated default path (slug + date + timestamp) exists
- [ ] 2.5 Create `evals/mr-feedback/tasks/input-clarification.yaml` — incomplete input (no MR URL; also covers bare project path with no iid), `skill_invocation` grader with `forbidden_skills` (or no full-workflow invocation) + `file` grader asserting no report file exists + `text` grader asserting the output asks for the MR URL / project details

## 3. Grader hardening in existing tasks

- [ ] 3.1 In `evals/mr-feedback/tasks/not-ready-mr-flags-gaps.yaml`, broaden the `(?i)testing instruction` pattern to `(?i)testing (instruction|step|guide|procedure|how to test)`
- [ ] 3.2 In `evals/mr-feedback/tasks/proof-of-run-rejects-tests.yaml`, apply the same broadening to any `testing instruction` pattern present

## 4. Grader-signal documentation

- [ ] 4.1 In `evals/README.md`, document the no-verdict signature: a judge result that reports "All prompts passed" alongside score 0 (the blind/no-verdict case), and how to recognize it
- [ ] 4.2 In `evals/README.md`, document that a negative-mode `trigger` grader's aggregate score is its raw probability, not its pass rate

## 5. Eval config update

- [ ] 5.1 In `evals/mr-feedback/eval.template.yaml`, raise `trials_per_task` from `2` to `3`
- [ ] 5.2 Regenerate `evals/mr-feedback/eval.yaml` by running `npm run sync-eval-cwd` from the repo root

## 6. Validate

- [ ] 6.1 Run `waza run evals/mr-feedback/eval.yaml` and confirm the new tasks pass and `task_completion` stays at or above its threshold
- [ ] 6.2 Run `npm run lint:fix` then `npm run lint` and resolve any remaining markdown errors
