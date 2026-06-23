# mr-feedback Specification

## Purpose

Define the behavior of the `mr-feedback` skill: given a GitLab Merge Request, judge
how **ready it is to be reviewed** and write a paste-ready feedback report to a local
markdown file. The skill is read-only and never critiques the code itself.

## Requirements

### Requirement: Triggering

The skill SHALL activate when the user asks for MR feedback, an MR quality review, or
an MR review-readiness report, and SHALL NOT activate for unrelated requests.

#### Scenario: User requests MR feedback

- **WHEN** the user asks for feedback on a GitLab Merge Request and provides an MR URL or a project path plus iid
- **THEN** the skill activates and begins the review-readiness workflow

#### Scenario: Unrelated request

- **WHEN** the user asks a question unrelated to reviewing a Merge Request
- **THEN** the skill does not activate

### Requirement: Input parsing and clarification

The skill SHALL accept either a full MR URL or a project path plus MR iid, and SHALL
ask the user before fetching when the project or iid is missing or ambiguous.

#### Scenario: Full MR URL provided

- **WHEN** the user provides `https://gitlab.com/<group>/<subgroup>/<project>/-/merge_requests/<iid>`
- **THEN** the skill derives `project_id` (URL-encoded path) and `mergeRequestIid` from the URL

#### Scenario: Ambiguous input

- **WHEN** the project path or MR iid is missing or ambiguous
- **THEN** the skill asks the user to clarify before making any fetch

### Requirement: Preferences as source of truth

The skill SHALL read `reference/preferences.md` before acting and SHALL treat it as the
source of truth for output language, tone, fetch method, allowed tools, and output path,
overriding the defaults in `SKILL.md` but yielding to an explicit instruction in the
user's current request.

#### Scenario: Explicit request overrides preferences

- **WHEN** the user's request explicitly asks for a behavior that differs from preferences (e.g. a different report language)
- **THEN** the skill follows the user's request over the preferences file

#### Scenario: Preferences override skill defaults

- **WHEN** preferences specify a value that differs from the `SKILL.md` default and the user gave no overriding instruction
- **THEN** the skill follows the preferences value

### Requirement: Read-only tool discipline

The skill SHALL gather MR data only through the allowed read-only GitLab MCP tools and
SHALL NOT post notes, approve, or merge the MR.

#### Scenario: Only allowed tools are called

- **WHEN** the skill gathers MR metadata, changed files, diffs, discussions, and pipeline status
- **THEN** it calls only the allowed read-only tools declared in preferences and no mutating tool

#### Scenario: No mutation attempted

- **WHEN** the skill completes its evaluation
- **THEN** it has not posted a note, approved, or merged the MR, and has only written a local markdown file

### Requirement: Review-readiness scoring

The skill SHALL evaluate the MR against the rubric in `reference/rubric.md`, scoring each
category, deriving a weighted overall score from 0 to 10, and mapping it to a label of
Ready, Almost ready, Needs prep, or Not ready.

#### Scenario: Well-prepared MR scores high

- **WHEN** the MR has a Jira link, testing instructions, proof-of-run, tests, clear scope, and a green pipeline
- **THEN** the overall label is Ready or Almost ready and no required readiness item is flagged as `[important]`

#### Scenario: Weak MR flags required gaps

- **WHEN** the MR is missing the Jira link, testing instructions, or proof-of-run
- **THEN** the overall label is Needs prep or Not ready and each missing required item surfaces as an `[important]` gap with a tailored reason

### Requirement: Required readiness items

The skill SHALL treat the Jira task link, testing instructions, and proof-of-run as
high-weight required items, SHALL accept a passing test run as test coverage but NOT as
proof-of-run, and SHALL treat an item as satisfied when the description explains it is
legitimately not applicable.

#### Scenario: Passing tests are not proof-of-run

- **WHEN** the only evidence the change was run is a passing test log
- **THEN** the skill still flags proof-of-run as an `[important]` gap and does not flag the items that are present

#### Scenario: Explicitly absent Jira card

- **WHEN** the description states there is no Jira card for this change
- **THEN** the missing Jira link is treated as satisfied and does not lower the score or surface as a gap

### Requirement: Code-critique boundary

The skill SHALL point out that readiness signals exist (such as leftover TODOs or debug
markers in the diff) but SHALL NOT instruct the author how to change the code.

#### Scenario: Hygiene markers noted, not edited

- **WHEN** the diff contains leftover debug logs or TODO markers
- **THEN** the report notes that the markers are present and that resolving them before review helps, without telling the author which lines to change

### Requirement: Do not invent data

The skill SHALL mark a category as not available rather than guessing when a fetch
returns no data for it.

#### Scenario: No pipeline data

- **WHEN** no pipeline exists for the MR
- **THEN** the report marks CI status as not available rather than inventing a result

### Requirement: Report output

The skill SHALL write the report to a new markdown file at the path resolved from
preferences (creating any needed folders), using `reference/report-template.md`, and
SHALL tell the user the file path afterward.

#### Scenario: Report written and path reported

- **WHEN** the evaluation is complete
- **THEN** the skill writes the report to the resolved output path and tells the user where it was written, offering to refine tone or length

#### Scenario: Draft or no-diff MR

- **WHEN** the MR is a draft or has no diff yet
- **THEN** the skill still produces the report and states the draft or no-diff state explicitly
