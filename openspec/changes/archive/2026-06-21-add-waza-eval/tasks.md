## 1. Mock GitLab MCP server

- [x] 1.1 Build a stdio MCP server registering exactly the six read-only tools by exact name
- [x] 1.2 Implement registry mode: load all fixtures, route each call by MR iid/project_id
- [x] 1.3 Author fixtures (ready, not-ready, draft, and edge cases) in the per-tool response shape
- [x] 1.4 Add a standalone smoke test that drives the server by iid/project per call

## 2. Eval suite wiring

- [x] 2.1 Add repo-level `.waza.yaml`
- [x] 2.2 Add `evals/mr-feedback/eval.yaml` with config, mcp_servers, global graders, metrics
- [x] 2.3 Set `tools: ["*"]` and an absolute `cwd` for the mock server entry

## 3. Tasks and graders

- [x] 3.1 Add positive tasks (ready scores high, not-ready flags gaps, draft handled)
- [x] 3.2 Add the read-only guardrail task with a `tool_constraint` grader
- [x] 3.3 Add the anti-trigger task with a negative-mode `trigger` grader
- [x] 3.4 Pin a deterministic report path per task for `file`-grader content assertions

## 4. Verify

- [x] 4.1 Run a single-task smoke test with `--keep-workspace --verbose` to confirm wiring
- [x] 4.2 Run the full suite and confirm `task_completion` meets its threshold
