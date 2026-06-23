# mr-feedback-eval Specification

## Purpose

Define the behavior of the automated evaluation suite for the `mr-feedback` skill. The
suite uses Microsoft Waza to verify, repeatably and without touching a live GitLab, that
the skill triggers correctly, calls only read-only tools, scores in line with the rubric,
and writes its report. It ships a mock GitLab MCP server so evaluation needs no live
service.

## Requirements

### Requirement: Mock GitLab MCP contract

The suite SHALL provide a mock GitLab MCP server that registers exactly the six
read-only tools the skill is allowed to call, by their exact names, and SHALL NOT
register any mutating tool.

#### Scenario: Allowed read-only tools registered

- **WHEN** the eval harness starts the mock server
- **THEN** the server registers `get_merge_request`, `list_merge_request_changed_files`, `get_merge_request_file_diff`, `list_merge_request_discussions`, `list_merge_request_pipelines`, and `list_pipelines`

#### Scenario: Mutating tool call fails loudly

- **WHEN** the skill attempts to create a note, approve, or merge through the mock server
- **THEN** the call fails because no such tool is registered, backing the read-only guardrail

### Requirement: Fixture-driven scenarios via registry routing

The mock server SHALL load every fixture and route each tool call to a scenario by the
MR identifier in the request, because per-task environment variables do not reach the MCP
subprocess under the `copilot-sdk` executor.

#### Scenario: Scenario selected by MR identifier

- **WHEN** a task prompt references a specific MR URL or iid
- **THEN** the mock server routes each tool call for that request to the matching fixture by `merge_request_iid` (falling back to `project_id`)

### Requirement: Deterministic output path for grading

Each eval task SHALL pin a deterministic report output path in its prompt so the `file`
grader can assert report contents, since the skill's default path ends in a timestamp.

#### Scenario: Task pins report path

- **WHEN** a task needs to grade report contents
- **THEN** its prompt instructs the skill to write the report to a fixed path such as `report.md`, which the `file` grader targets directly

### Requirement: Graders cover triggering, tool discipline, and scoring

The suite SHALL grade triggering (positive and negative), skill invocation, read-only
tool constraints, report file contents, and final-output assertions, using only graders
implemented by the installed Waza version.

#### Scenario: Read-only guardrail graded

- **WHEN** the read-only task runs
- **THEN** a `tool_constraint` grader confirms only the six read tools were called and rejects any note, approve, or merge tool

#### Scenario: Anti-trigger graded

- **WHEN** the anti-trigger task runs with an unrelated request
- **THEN** a negative-mode `trigger` grader passes when the trigger probability is below threshold

### Requirement: Reproducible run

The suite SHALL run against the pinned Node and Waza versions and SHALL pass when the
`task_completion` metric meets its threshold across all tasks.

#### Scenario: Suite passes at threshold

- **WHEN** `waza run evals/mr-feedback/eval.yaml` completes
- **THEN** the run passes when `task_completion` is at or above its configured threshold for every task
