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
path, input clarification). The grader-signal gotchas that the dropped proposal would have
documented already exist in `evals/README.md`, so they are only verified here, not
re-authored. The skill-behavior changes from that dropped proposal are explicitly out of
scope.

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
default path, `${CWD}/mr-feedback/<project-slug>-mr-<iid>-<YYYY-MM-DD>-<TIMESTAMP>.md`
(see `skills/mr-feedback/reference/preferences.md`).

The `file` grader **cannot** assert this directly: it has no glob support (documented in
`evals/README.md`, which is why every other task pins `report.md`), and the `<TIMESTAMP>`
(Unix seconds) is non-deterministic, so no fixed `must_exist` path can be written either.
The task therefore uses a combined grader:

- `file` grader with `must_not_exist: ["report.md"]` — proves the skill did NOT fall back
  to the override path, a cheap deterministic check.
- `text` grader on the agent's final output — the skill announces the file path it wrote
  (SKILL.md step 8), so the grader asserts that announced path matches the deterministic
  portion of the template: `mr-feedback/web-app-mr-42-<YYYY-MM-DD>-` (slug + iid + date),
  ignoring the trailing timestamp.

Together these confirm the templated default was used without depending on glob support or
a predictable timestamp.

### Input-clarification merges both ambiguous-input cases

The two source proposals each had an input-clarification task framed differently — one
sent no MR URL at all, the other a bare project path with no iid. These collapse into one
task with two scenarios in the spec, both asserting the skill asks rather than fetching or
guessing, and that no report is written.

The grader stack does **not** use `forbidden_skills`. Unlike `anti-trigger-non-mr` (whose
unrelated prompt means the skill must never trigger), the input-clarification prompt *is*
an MR-feedback request — the skill correctly activates and then stops to ask, per
`SKILL.md` ("If either is missing or ambiguous, ask before fetching"). A `forbidden_skills:
["mr-feedback"]` check would falsely fail on that correct behavior. What must NOT happen is
fetching and report-writing, so the graders verify:

- `tool_constraint` — zero GitLab fetch tools called (the real "did not fetch or guess"
  proof).
- `file` with `must_not_exist: ["report.md"]` — no report artifact.
- `text` — the output asks the user for the MR URL / project iid.

Because no tool call is expected, a missing-fixture route error would itself count as a
failure — no new fixture is needed.

### Grader pattern hardening: targeted broadening, not removal

The `(?i)testing instruction` pattern in two existing tasks is broadened to
`(?i)testing (instruction|step|guide|procedure|how to test)` to match common phrasings
without opening the regex so wide that it accepts unrelated text. Applied in both
`not-ready-mr-flags-gaps.yaml` and `proof-of-run-rejects-tests.yaml`.

### Grader-signal findings are already documented; this change only verifies them

Two prior findings are interpretation issues, not skill behavior: a no-verdict judge
result reports "All prompts passed" alongside score 0, and a negative-mode `trigger`
grader contributes its raw probability to the aggregate (so its aggregate score is not its
pass rate). These are **already captured** in the `evals/README.md` Gotchas section (added
when the suite was first created). This change does not author new docs — it verifies the
two entries still match observed behavior and updates wording only if it has drifted.

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
- [Default-path grader cannot use a glob] → Resolved in design: the `file` grader has no
  glob and the timestamp is non-deterministic, so the task uses `must_not_exist: report.md`
  plus a `text` grader on the announced path (slug + iid + date, timestamp ignored). No glob
  dependency remains.
- [Input-clarification is a regression guard, not gap-discovery] → The ask-before-fetching
  behavior is already specified in `SKILL.md`, so this task is expected to pass and guards
  against future regression. If the skill ever drifts to fetching/guessing on incomplete
  input, the `tool_constraint` and `must_not_exist` graders surface it.
- [Fixture iid collisions] → Checked manually; iids 84, 91, 95 are not used by any existing
  fixture.

## Open Questions

None
