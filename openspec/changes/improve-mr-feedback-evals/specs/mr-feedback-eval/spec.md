## ADDED Requirements

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
- **THEN** the skill writes the report to a path matching the templated default and the
  grader asserts a file matching that pattern exists

### Requirement: Input clarification requested when input is incomplete

The suite SHALL include at least one task that provides ambiguous or incomplete input, so
the skill's behavior of asking before fetching is verified. The task SHALL cover both a
request with no MR URL at all and a request with a bare project path and no MR iid.

#### Scenario: No MR URL provided

- **WHEN** the `input-clarification` task sends a request with no MR URL or iid
- **THEN** the skill asks the user for the MR URL or project details and does NOT invoke
  the full review workflow or write a report file

#### Scenario: Bare project path with no iid

- **WHEN** the task provides a bare project path with no MR iid
- **THEN** the skill asks the user to clarify and does not fetch or guess, and the grader
  confirms no fetch occurred and no report was written

## MODIFIED Requirements

### Requirement: Graders cover triggering, tool discipline, and scoring

The suite SHALL grade triggering (positive and negative), skill invocation, read-only
tool constraints, report file contents, and final-output assertions, using only graders
implemented by the installed Waza version. Pattern-based graders SHALL use regexes
broad enough to match common phrasings of required content without introducing
false negatives on valid skill output.

#### Scenario: Read-only guardrail graded

- **WHEN** the read-only task runs
- **THEN** a `tool_constraint` grader confirms only the six read tools were called and
  rejects any note, approve, or merge tool

#### Scenario: Anti-trigger graded

- **WHEN** the anti-trigger task runs with an unrelated request
- **THEN** a negative-mode `trigger` grader passes when the trigger probability is below
  threshold

#### Scenario: Testing-instructions pattern matches common phrasings

- **WHEN** a grader asserts that "testing instructions" are mentioned in the report
- **THEN** the regex matches at minimum: "testing instruction", "testing step", "testing
  guide", "testing procedure", and "how to test" (case-insensitive)
