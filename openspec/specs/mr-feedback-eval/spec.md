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
implemented by the installed Waza version. Pattern-based graders SHALL use regexes
broad enough to match common phrasings of required content without introducing
false negatives on valid skill output.

#### Scenario: Read-only guardrail graded

- **WHEN** the read-only task runs
- **THEN** a `tool_constraint` grader confirms only the six read tools were called and rejects any note, approve, or merge tool

#### Scenario: Anti-trigger graded

- **WHEN** the anti-trigger task runs with an unrelated request
- **THEN** a negative-mode `trigger` grader passes when the trigger probability is below threshold

#### Scenario: Testing-instructions pattern matches common phrasings

- **WHEN** a grader asserts that "testing instructions" are mentioned in the report
- **THEN** the regex matches at minimum: "testing instruction", "testing step", "testing
  guide", "testing procedure", and "how to test" (case-insensitive)

### Requirement: Reproducible run

The suite SHALL run against the pinned Node and Waza versions and SHALL pass when the
`task_completion` metric meets its threshold across all tasks.

#### Scenario: Suite passes at threshold

- **WHEN** `waza run evals/mr-feedback/eval.yaml` completes
- **THEN** the run passes when `task_completion` is at or above its configured threshold for every task

### Requirement: No-pipeline data handled gracefully

When no pipeline data exists for an MR, the suite SHALL include an eval task that
verifies the skill marks CI status as not available rather than inventing a result,
using a fixture with empty pipeline responses.

#### Scenario: Empty pipeline lists produce "not available" in report

- **WHEN** the `no-pipeline-data` eval task runs against an MR whose
  `list_merge_request_pipelines` and `list_pipelines` return empty arrays
- **THEN** the report contains "not available" (or equivalent language) for CI status
  and does NOT assert a passing, failing, or unknown pipeline result

### Requirement: Code-critique boundary enforced by eval

The suite SHALL include an eval task that verifies the skill notes hygiene markers
(TODOs, debug logs) in the diff without instructing the author on how to fix them
or referencing specific lines.

#### Scenario: Markers noted, no fix instructions given

- **WHEN** the `code-critique-boundary` eval task runs against an MR whose diff
  contains leftover TODO comments and debug log statements, with all readiness items
  otherwise satisfied
- **THEN** the report acknowledges the presence of hygiene markers and does NOT include
  specific line-level instructions or suggestions to change the code

### Requirement: Middle-tier scoring coverage

The suite SHALL include at least one fixture whose readiness falls in the middle bands
(Needs prep or Almost ready), so scoring is exercised between the extremes and not only at
Ready and Not ready.

#### Scenario: Partially-prepared MR scores mid-band

- **WHEN** the `middle-tier-scoring` eval task runs against a fixture with a good
  description and tests but no proof-of-run
- **THEN** the report lands in the Needs prep or Almost ready band and flags the missing
  proof-of-run without flagging the items that are present

### Requirement: Default output path coverage

The suite SHALL include at least one task that does not override the output path, so the
templated default (slug plus date plus timestamp) is exercised rather than always pinned.

#### Scenario: Default templated path is produced

- **WHEN** the `default-output-path` eval task omits the report-path override
- **THEN** the skill writes the report to the templated default path
  (`mr-feedback/<project-slug>-mr-<iid>-<YYYY-MM-DD>-<TIMESTAMP>.md`) and the graders
  confirm this without relying on glob support: a `file` grader asserts `report.md` does
  NOT exist (the override path was not used), and a `text` grader asserts the path the
  skill announces matches the deterministic portion of the template (slug, iid, and date),
  ignoring the non-deterministic timestamp

### Requirement: Input clarification requested when input is incomplete

The suite SHALL include at least one task that provides ambiguous or incomplete input, so
the skill's behavior of asking before fetching is verified. The task SHALL cover both a
request with no MR URL at all and a request with a bare project path and no MR iid. Because
the request is itself an MR-feedback request, the skill is expected to activate and then
ask; the graders SHALL therefore verify the absence of fetching and report-writing via a
`tool_constraint` grader (no fetch tools called) and a `file` grader (no report written),
NOT via a `forbidden_skills` invocation check.

#### Scenario: No MR URL provided

- **WHEN** the `input-clarification` task sends a request with no MR URL or iid
- **THEN** the skill asks the user for the MR URL or project details, no GitLab fetch tool
  is called, and no report file is written

#### Scenario: Bare project path with no iid

- **WHEN** the task provides a bare project path with no MR iid
- **THEN** the skill asks the user to clarify and does not fetch or guess, and the graders
  confirm via `tool_constraint` that no fetch occurred and via `file` that no report was
  written
