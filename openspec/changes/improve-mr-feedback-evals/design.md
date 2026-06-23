## Context

The eval suite lives under `evals/mr-feedback/`. The mock GitLab MCP server
(`mock-gitlab-mcp/server.mjs`) runs in registry mode: it loads every JSON fixture at
startup and routes each tool call to a scenario by the `merge_request_iid` in the
request. Adding a new scenario means adding a fixture JSON and a task YAML that
references a unique MR iid/project URL; no server code changes are needed.

Existing tasks pin `report.md` as the deterministic output path so `file` graders can
inspect content. The two prompt-graded tasks use `continue_session: true` so the judge
inherits the executor workspace where the skill wrote the file (the "blind judge" fix
established in the previous change).

The `eval.template.yaml` drives `eval.yaml` generation via `npm run sync-eval-cwd`,
which rewrites the absolute `cwd:` for the local checkout. All config changes should be
made to `eval.template.yaml`, with `eval.yaml` regenerated after.

This change consolidates the eval-coverage work that was split across two proposals: the
gaps originally scoped here (no-pipeline, code-critique boundary) plus the eval-only gaps
from the now-dropped `improve-mr-feedback` change (middle-tier scoring, default output
path, input clarification, grader-signal documentation). The skill-behavior changes from
that dropped proposal are explicitly out of scope.

## Goals / Non-Goals

**Goals:**

- Add eval tasks covering spec requirements not currently tested: no-pipeline data,
  code-critique boundary, middle-tier scoring, default output path, and input clarification.
- Add the fixtures those tasks need.
- Harden two existing grader patterns that produce false negatives on valid skill output.
- Document the two grader-signal interpretation gotchas in `evals/README.md`.
- Raise `trials_per_task` from 2 to 3 for better variance reduction on prompt-graded tasks.

**Non-Goals:**

- Changing the skill itself (`skills/mr-feedback/`) — including the dropped tracker,
  proof-of-run, and flag-prioritization changes.
- Changing the `mr-feedback` or `mr-feedback-eval` specs in `openspec/specs/`.
- A cross-model executor matrix (deferred, as in the prior proposal).

## Decisions

### New fixtures follow the existing pattern

Each fixture JSON defines responses for all six required keys and uses a unique
iid/project to keep registry routing unambiguous:

- `no-pipeline-mr.json` → iid `91`, project `acme/payments-api`
- `hygiene-markers-mr.json` → iid `95`, project `acme/catalog-service`
- `middle-tier-mr.json` → iid `84`, project `acme/billing-service`

The no-pipeline fixture uses empty arrays for both `list_merge_request_pipelines` and
`list_pipelines`; everything else is well-formed so the skill can produce a full report
that only lacks CI data. The hygiene-markers fixture has a diff with obvious TODO and
`console.log` markers but otherwise satisfies every readiness item, isolating the
code-critique boundary check. The middle-tier fixture has a good description and test
files in the diff but no proof-of-run, so it lands in Needs prep / Almost ready and flags
only the missing proof-of-run.

### Default-output-path task reuses an existing fixture

The default-output-path task does not need a new fixture — it reuses the existing
well-prepared `ready-mr` scenario (iid 42). What it changes is the prompt: it omits the
"write the report to `report.md`" override so the skill falls back to its templated
default path (slug + date + timestamp). The `file` grader then asserts a file matching
that templated pattern exists.

### Input-clarification merges both ambiguous-input cases

The two source proposals each had an input-clarification task framed differently — one
sent no MR URL at all, the other a bare project path with no iid. These collapse into one
task with two scenarios in the spec, both asserting the skill asks rather than fetching or
guessing, and that no report is written. The graders verify: no `skill_invocation` of the
full workflow, no report artifact, and a text/clarification request in the output. Because
no tool call is expected, a missing-fixture route error would itself count as a failure —
no new fixture is needed.

### Grader pattern hardening: targeted broadening, not removal

The `(?i)testing instruction` pattern in two existing tasks is broadened to
`(?i)testing (instruction|step|guide|procedure|how to test)` to match common phrasings
without opening the regex so wide that it accepts unrelated text. Applied in both
`not-ready-mr-flags-gaps.yaml` and `proof-of-run-rejects-tests.yaml`.

### Grader-signal findings are documentation, not requirements

Two prior findings are interpretation issues, not skill behavior: a no-verdict judge
result reports "All prompts passed" alongside score 0, and a negative-mode `trigger`
grader contributes its raw probability to the aggregate (so its aggregate score is not its
pass rate). These are captured as gotchas in `evals/README.md` rather than expressed as
spec requirements.

### Code-critique boundary uses both a file grader and a prompt judge

A file grader checks that the report notes the presence of markers (e.g., matches
`(?i)todo|debug|console\.log`). A prompt judge with `continue_session: true` then verifies
the report does not include specific line references or instructions on how to fix the
markers. This layered approach avoids relying solely on LLM judgement for the presence
check.

### `trials_per_task` raised in template only

The bump from 2 → 3 applies globally in `eval.template.yaml`; `eval.yaml` is regenerated
from the template afterward. This improves variance signal for LLM-judged graders at the
cost of one extra trial per task.

## Risks / Trade-offs

- [New prompt judges add non-determinism] → Raising `trials_per_task` to 3 with the
  `task_completion` threshold at 0.75 tolerates one judge failure per task across three
  trials.
- [Default-path grader depends on glob matching the templated pattern] → Confirm the
  `file` grader's `must_exist` supports the templated pattern (slug/date/timestamp) before
  relying on it; fall back to asserting the parent directory and a filename prefix if exact
  glob support is limited. Tracked as an open question.
- [Input-clarification task depends on skill behavior, not a fixture] → If the skill always
  runs its full workflow regardless of input ambiguity, this task fails and surfaces the
  gap — the correct outcome.
- [Fixture iid collisions] → Checked manually; iids 84, 91, 95 are not used by any existing
  fixture.

## Open Questions

- Does the `file` grader's `must_exist` support a glob/templated pattern for the
  default-output-path assertion, or must the task assert a fixed filename prefix within a
  known directory? Resolve during implementation of the default-output-path task.
