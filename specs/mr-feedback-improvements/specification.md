# Spec: `mr-feedback` skill & eval improvements

Status: draft · Owner: Ayrton · Target skill: [`mr-feedback`](../../skills/mr-feedback/SKILL.md) · Eval suite: [`evals/mr-feedback`](../../evals/mr-feedback/)

## 1. Goal

Fix the defects and close the coverage gaps found while running the
[`mr-feedback` eval suite](../../evals/mr-feedback/eval.yaml) on 2026-06-21, so that:

1. The suite **passes deterministically** (no flaky LLM-judge task).
2. Grader signal is **trustworthy** (no "passed" message attached to a 0 score, no
   correct classification reported as a low score).
3. Both the **skill** and the **eval suite** cover the behaviors that today go
   unexercised (middle-tier MRs, the default output path, the code-critique boundary,
   ambiguous input, non-code MRs).

This spec is the companion to the original [`waza-eval`](../waza-eval/specification.md)
build spec; that one stands up the suite, this one hardens it and the skill.

## 2. Evidence: the run that motivated this

Full suite (`waza run evals/mr-feedback/eval.yaml --judge-model claude-haiku-4.5`,
`trials_per_task: 2`, model `claude-sonnet-4.6`):

| Task | Pass rate | avg | Note |
| ---- | --------- | --- | ---- |
| `anti-trigger-non-mr` | 100% | 0.78 | passes, but avg dragged down — see F3 |
| `draft-mr-handled` | 100% | 1.00 | |
| `not-ready-mr-flags-gaps` | **50%** | 0.88 | **flaky — judge grades blind, see F1** |
| `read-only-no-mutations` | 100% | 1.00 | |
| `ready-mr-scores-high` | 100% | 0.91 | |

Suite: 80% success, aggregate 0.91, std-dev 0.082. The single failure and almost all
the variance trace to one root cause (F1).

## 3. Eval findings

### F1 — CRITICAL: the LLM-judge grader grades blind (root cause of the flakiness)

The `gaps-framed-encouragingly` `prompt` grader in
[`not-ready-mr-flags-gaps.yaml`](../../evals/mr-feedback/tasks/not-ready-mr-flags-gaps.yaml)
runs with `continue_session: false` **and** its prompt never includes the report
content. The judge therefore has nothing to read. Captured judge response on the
failing run:

> "I'm ready to grade the review-readiness report! However, I don't see the report
> content in your message. Please share the report you'd like me to evaluate..."

With no content the judge calls **neither** `set_waza_grade_pass` **nor**
`set_waza_grade_fail`. Per the scoring rule (`score = passes / (passes + failures)`;
`passed` true only with ≥1 pass and 0 fails), `0/0` resolves to **score 0, passed
false**. The 50% flakiness is the judge sometimes guessing a verdict anyway and
sometimes asking for the missing report.

**Fix (verify mechanism against the installed Waza, currently v0.37.0):**

- Preferred: set `continue_session: true` so the judge inherits the executor session
  that just produced `report.md` and can read the file. Confirm with
  `--keep-workspace --verbose` that the judge actually reads the report.
- If `continue_session: true` does not expose the file, inject the artifact into the
  judge prompt instead (e.g. reference `report.md` explicitly and confirm Waza feeds
  file contents to `prompt` graders, or template the file into the prompt).
- Whichever path: re-run with higher `trials_per_task` (4-6) on this task to confirm
  the flakiness is gone, not just masked.

This finding should also be folded back into the
[`waza-eval` spec §11](../waza-eval/specification.md) `prompt`-grader example, which
currently shows the same `continue_session: false` shape and would reproduce the bug.

### F2 — Misleading grader feedback masks F1

When the judge returns no verdict, the result is `score: 0, passed: false` but
`feedback: "All prompts passed"`. That string is the signature of "judge never
graded," not success. Document it (in the eval README "Gotchas") so the next person
debugging a 0-score "passed" grader recognizes it immediately. If Waza supports a
stricter mode (fail when no verdict is returned), enable it.

### F3 — Negative-trigger grader reports raw probability, not a pass score

In `anti-trigger-non-mr`, `does-not-trigger` (mode `negative`) **passes** (trigger
prob 0.125 < 0.60 threshold) but contributes its raw 0.125 to the task aggregate,
pulling the task avg to ~0.78 `((0.125 + 1 + 1 + 1)/4)` and inflating suite std-dev
and `min_score`. The classification is correct; the number is misleading.

**Fix options:** document that for negative-mode trigger graders aggregate score ≠
pass rate (interpret pass/fail, not the average); or down-weight/normalize that
grader's contribution; or pin success on pass-rate metrics rather than aggregate
score. No code change to the skill — this is eval interpretation.

### F4 — Coverage gaps in eval scenarios

Only three fixtures exist (`ready`, `not-ready`, `draft`). Missing:

- **Middle-tier MR** — nothing exercises the "Needs prep" (4-6) or "Almost ready"
  (7-8) bands; scoring is only checked at the extremes. Add at least one
  partially-prepared fixture (e.g. good description + tests but no proof-of-run).
- **Code-critique guardrail on a positive MR** — only the not-ready judge touches the
  "must not suggest code changes" rule. Add a grader (structural or judge) asserting
  the `ready`/middle reports do not contain code-change suggestions. See S1 — the
  not-ready report already says "Remove the `console.log`...", which is the exact
  boundary that needs a regression test.
- **Default output path** — every task overrides the path to `report.md`. The
  preferences' templated default
  (`${CWD}/mr-feedback/<slug>-mr-<iid>-<YYYY-MM-DD>-<TIMESTAMP>.md`) is never
  exercised, so slug/timestamp logic can regress invisibly. Add one task that omits
  the path override and asserts a file matching the templated glob is created. (The
  README acknowledges the override as a deliberate grader-simplicity tradeoff; this
  task is the complement that keeps the default honest.)
- **Ambiguous / missing input** — SKILL.md says "If either is missing or ambiguous,
  ask before fetching." No task covers the clarification path (e.g. a bare project
  path with no iid). Add a task asserting the skill asks rather than fetching/guessing.
- **Non-code MR** — rubric §3 says ignore test-coverage signals for docs-only MRs. No
  fixture covers this; add a docs-only MR and assert the test-coverage section is not
  treated as a red flag.

### F5 — Suite is not portable (machine-specific absolute `cwd`)

[`eval.yaml`](../../evals/mr-feedback/eval.yaml) hardcodes
`cwd: /Users/weback/projects/ayrton/skills/evals/mr-feedback/mock-gitlab-mcp`. This
breaks on any other machine or CI. The README already flags it as "the one
machine-specific line," but for a repeatable suite it should be derivable (relative
resolution, an env var, or a documented setup step that rewrites it). Decide whether
CI is a goal; if so, this is a blocker.

### F6 — (Optional) single executor model

Only `claude-sonnet-4.6` runs the skill. Cross-model robustness (does the skill still
follow the rubric under a weaker/different model?) is untested. Low priority; note as a
possible future matrix run, not required.

## 4. Skill findings

### S1 — Sharpen the code-critique boundary

SKILL.md says "Do not review or critique the code itself and do not suggest code/logic
changes," yet the rubric's Reviewer-guidance section asks the skill to call out
leftover TODOs/debug markers, and the observed not-ready report wrote:

> "Remove the `// TODO: clean this up before merge` comment and the
> `console.log("charging", amount)` debug statement from `payment.ts`..."

"Remove X" is arguably a code change — it crosses the line the skill draws. Tighten the
guidance: it is fine to **note that** hygiene markers exist (a readiness signal); it is
not fine to instruct **how to change the code**. Add an explicit allowed-vs-disallowed
phrasing example to SKILL.md and/or the rubric, e.g.:

- Allowed: "There are leftover debug/TODO markers in the diff — calling them out or
  resolving them before review will help."
- Disallowed: "Remove the `console.log` on line 42."

### S2 — Cap / prioritize `[important]` flags

The not-ready report surfaced **seven** `[important]` items — a wall that undercuts the
"collaborative and encouraging, not gatekeeping" tone the preferences and rubric
require. Guide the template/rubric to lead with the top 2-3 highest-impact items and
group or summarize the rest, so a weak MR still gets a motivating report rather than a
checklist of failures.

### S3 — "Jira" is hardcoded; generalize the tracker reference

Rubric §0 names the required item "**Jira task link**," and the eval grader asserts the
literal word `jira`. Configurable behavior is supposed to live in
[`preferences.md`](../../skills/mr-feedback/reference/preferences.md), but the tracker
is baked into the rubric. Teams using a different tracker (Linear, GitHub Issues,
internal) would have the skill rigidly demand "Jira." Generalize to "issue/ticket
tracker link (e.g. Jira)" in the rubric and add a `tracker` preference. Update the
`not-ready` grader's `(?i)jira` pattern accordingly (or to the configured tracker).

### S4 — Default output path is untested end to end

Mirrors F4. The templated default path (slug extraction + unix timestamp) is moderately
fiddly and only ever overridden in tests, so a user relying on the default has zero
coverage. Pair the S-side fix (confirm the path logic is correct and well-specified)
with the F4 eval task that exercises it.

### S5 — Proof-of-run / testing-instructions are frontend/backend framed

Rubric §0 defines proof-of-run as "screenshot (frontend) or log/output (backend)."
Infra, config, schema, and docs MRs don't map cleanly onto that binary. Broaden the
definition so non-app changes have a sensible proof-of-run expectation (or are exempted
like docs are for test coverage).

### S6 — AI Transparency model placeholder has no source

[`report-template.md`](../../skills/mr-feedback/reference/report-template.md) ends with
"generated by AI with model `[ai-model-used]`," but nothing in the skill tells the agent
how to know its own model id — it must guess, which risks an invented value (against the
repo's "don't invent data" rule). Either instruct the agent to state the model only if
reliably known (else omit/say "unspecified"), or drop the model name from the line.

## 5. Suggested order of work

1. **F1** (judge grader) — unblocks the only failing task; highest value.
2. **F2 + F3** (grader signal hygiene) — cheap doc/config changes once F1 is understood.
3. **S1** + **F4 code-critique grader** — fix the boundary and add the regression test
   together.
4. **S2** (flag prioritization) — tone improvement, verify against the not-ready judge.
5. **F4 remaining fixtures** (middle-tier, default-path, ambiguous-input, non-code) and
   **S3/S4/S5/S6** as a batch of coverage + skill polish.
6. **F5** (portability) — do this if/when CI is a goal.
7. **F6** (model matrix) — optional, last.

After any `.md` edit, run `npm run lint:fix` then `npm run lint` (AGENTS.md). Re-run the
full suite and confirm `not-ready-mr-flags-gaps` is stable across ≥4 trials before
considering F1 closed. Do not commit — leave changes for review (AGENTS.md).

## 6. Out of scope

- Turning `mr-feedback` into a code reviewer (the skill is review-readiness only, by
  design).
- Posting/mutating GitLab — the read-only guardrail stays.
- Replacing Waza or the mock MCP server.
