## Why

Running the `mr-feedback` eval suite surfaced behaviors that go unexercised and a few
ways the skill is narrower than it should be: the required "Jira" item is hardcoded to one
tracker, proof-of-run is framed only for frontend/backend changes, weak MRs get a wall of
`[important]` flags that undercuts the encouraging tone, and the eval suite never covers
middle-tier MRs, the default output path, or the clarification path. This change closes
those spec-level gaps. (Grader-signal interpretation findings F2/F3 and the optional
model-matrix F6 are captured in design and tasks, not as requirement changes.)

## What Changes

- Generalize the required "Jira task link" item to an **issue/ticket tracker link** and add
  a configurable `tracker` preference, so teams on Linear, GitHub Issues, or an internal
  tracker are not forced to label it "Jira".
- Broaden **proof-of-run** so infra, config, schema, and docs changes have a sensible
  expectation (or a documented exemption) rather than the frontend/backend binary.
- Add **flag prioritization**: a weak MR's report leads with the top 2-3 highest-impact
  `[important]` items and groups or summarizes the rest, keeping the report motivating.
- Extend eval coverage with a **middle-tier MR** fixture, a **default-output-path** task,
  and an **ambiguous-input** task.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `mr-feedback`: required readiness items generalize the tracker reference and broaden
  proof-of-run; the report prioritizes `[important]` flags instead of listing all of them.
- `mr-feedback-eval`: the suite gains coverage for middle-tier scoring, the default
  templated output path, and the input-clarification path.

## Impact

- `skills/mr-feedback/reference/rubric.md`, `reference/preferences.md`, and
  `reference/report-template.md` (tracker generalization, proof-of-run, flag prioritization).
- `evals/mr-feedback/` fixtures and tasks (middle-tier, default-path, ambiguous-input).
- No change to the read-only guardrail or the skill's core purpose.
