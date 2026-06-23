## ADDED Requirements

### Requirement: Middle-tier scoring coverage

The suite SHALL include at least one fixture whose readiness falls in the middle bands
(Needs prep or Almost ready), so scoring is exercised between the extremes and not only at
Ready and Not ready.

#### Scenario: Partially-prepared MR scores mid-band

- **WHEN** the suite runs against a fixture with a good description and tests but no proof-of-run
- **THEN** the report lands in the Needs prep or Almost ready band and flags the missing proof-of-run without flagging the items that are present

### Requirement: Default output path coverage

The suite SHALL include at least one task that does not override the output path, so the
templated default (slug plus date plus timestamp) is exercised rather than always pinned.

#### Scenario: Default templated path is produced

- **WHEN** a task omits the report-path override
- **THEN** the skill writes the report to a path matching the templated default and the grader asserts a file matching that pattern exists

### Requirement: Input-clarification coverage

The suite SHALL include at least one task that provides ambiguous or incomplete input, so
the skill's behavior of asking before fetching is verified.

#### Scenario: Ambiguous input prompts a question

- **WHEN** a task provides a bare project path with no MR iid
- **THEN** the skill asks the user to clarify and does not fetch or guess, and the grader confirms no fetch occurred
