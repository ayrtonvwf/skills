## Why

The `mr-feedback` eval suite covers its core happy paths but leaves several spec
requirements untested: the no-pipeline "not available" fallback, the code-critique
boundary (the skill notes hygiene markers but must not instruct code changes),
middle-tier scoring (only the extremes are exercised), the default templated output
path, and the input-clarification flow when input is incomplete. Several existing graders
also use fragile patterns (e.g. `testing instruction` instead of a broader match) that
produce false negatives on valid skill output. This change consolidates all of those
eval-coverage gaps into one focused suite improvement; it **supersedes the eval portion of
the `improve-mr-feedback` change**, which is being dropped (its skill-behavior changes —
tracker generalization, proof-of-run breadth, flag prioritization — are intentionally not
carried forward here).

## What Changes

- **New task: `no-pipeline-data`** — evaluates an MR whose pipeline list is empty; the
  report must mark CI status as "not available" rather than inventing a result.
- **New task: `code-critique-boundary`** — evaluates an MR whose diff contains leftover
  TODO markers and debug logs; the report must note them without telling the author which
  lines to change.
- **New task: `middle-tier-scoring`** — evaluates a partially-prepared MR (good
  description and tests, but no proof-of-run) so scoring is exercised in the Needs prep /
  Almost ready band, not only at the extremes.
- **New task: `default-output-path`** — evaluates a run that does NOT override the output
  path, so the templated default (slug + date + timestamp) is exercised rather than always
  pinned to `report.md`.
- **New task: `input-clarification`** — sends incomplete input (no MR URL, and a bare
  project path with no iid); the skill must ask for clarification rather than fetching,
  guessing, or producing a report.
- **New fixture: `no-pipeline-mr.json`** — well-formed MR with empty
  `list_merge_request_pipelines` / `list_pipelines` responses.
- **New fixture: `hygiene-markers-mr.json`** — diff with leftover TODOs and console.log
  statements; Jira link, testing instructions, and proof-of-run present so only hygiene is
  the story.
- **New fixture: `middle-tier-mr.json`** — good description and tests in the diff, but no
  proof-of-run, landing in a middle scoring band.
- **Grader hardening** — broaden `(?i)testing instruction` to
  `(?i)testing (instruction|step|guide|procedure|how to test)` in `not-ready-mr-flags-gaps`
  and `proof-of-run-rejects-tests` to reduce false negatives on valid phrasings.
- **Grader-signal documentation** — document in `evals/README.md` the two interpretation
  gotchas surfaced by prior runs: a no-verdict judge result that reports "All prompts
  passed" alongside score 0, and a negative-mode `trigger` grader whose aggregate score is
  not its pass rate.
- **Bump `trials_per_task` from 2 → 3** to reduce variance on LLM-judged graders.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `mr-feedback-eval`: adds five new tasks with fixtures, hardens existing grader patterns,
  documents grader-signal gotchas, and raises trial count.

## Impact

- `evals/mr-feedback/tasks/` — new task YAML files (`no-pipeline-data.yaml`,
  `code-critique-boundary.yaml`, `middle-tier-scoring.yaml`, `default-output-path.yaml`,
  `input-clarification.yaml`).
- `evals/mr-feedback/mock-gitlab-mcp/fixtures/` — new fixtures (`no-pipeline-mr.json`,
  `hygiene-markers-mr.json`, `middle-tier-mr.json`).
- `evals/mr-feedback/eval.template.yaml` — `trials_per_task` bump.
- `evals/mr-feedback/tasks/not-ready-mr-flags-gaps.yaml` and
  `proof-of-run-rejects-tests.yaml` — grader pattern fix.
- `evals/README.md` — grader-signal gotchas section.
- No change to the skill itself or to `openspec/specs/`.
