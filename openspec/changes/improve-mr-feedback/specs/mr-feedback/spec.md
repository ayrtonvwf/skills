## MODIFIED Requirements

### Requirement: Required readiness items

The skill SHALL treat the issue/ticket tracker link, testing instructions, and
proof-of-run as high-weight required items, SHALL accept a passing test run as test
coverage but NOT as proof-of-run, SHALL treat an item as satisfied when the description
explains it is legitimately not applicable, and SHALL apply a proof-of-run expectation
appropriate to the change type rather than only a frontend/backend binary.

The tracker is configurable via a `tracker` preference (defaulting to Jira); the skill
SHALL require a link to the configured tracker rather than hardcoding "Jira". For changes
that are not application code (infra, config, schema, or docs), proof-of-run SHALL be
either a sensible artifact for that change type (e.g. a plan/apply output, a migration
run, a rendered doc) or an explicit exemption, not an automatic gap.

#### Scenario: Passing tests are not proof-of-run

- **WHEN** the only evidence the change was run is a passing test log
- **THEN** the skill still flags proof-of-run as an `[important]` gap and does not flag the items that are present

#### Scenario: Explicitly absent tracker card

- **WHEN** the description states there is no tracker card for this change
- **THEN** the missing tracker link is treated as satisfied and does not lower the score or surface as a gap

#### Scenario: Configured tracker other than Jira

- **WHEN** the `tracker` preference names a tracker other than Jira (e.g. Linear)
- **THEN** the skill requires a link to that tracker and refers to it by name rather than demanding "Jira"

#### Scenario: Proof-of-run for a non-application change

- **WHEN** the MR changes infra, config, schema, or docs rather than application code
- **THEN** the skill expects a proof-of-run artifact appropriate to that change type or an explicit exemption, and does not flag the frontend/backend proof-of-run as missing

## ADDED Requirements

### Requirement: Flag prioritization in the report

The skill SHALL lead the report with the top 2-3 highest-impact `[important]` items and
SHALL group or summarize any remaining items, so that even a weak MR receives a motivating
report rather than an exhaustive checklist of failures.

#### Scenario: Weak MR with many gaps

- **WHEN** an MR has more than three `[important]` gaps
- **THEN** the report surfaces the top 2-3 highest-impact gaps first and groups or summarizes the rest, keeping the tone collaborative and encouraging
