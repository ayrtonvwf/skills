## Context

The `mr-feedback` skill and its Waza eval suite are in place and passing. A full eval run
on 2026-06-21 (`trials_per_task: 2`, model `claude-sonnet-4.6`) reached 80% success with
aggregate 0.91. Most variance traced to grader mechanics that have since been fixed
(judge now runs with `continue_session: true`). What remains are spec-level narrowness in
the skill and coverage gaps in the suite. This change addresses those; it does not revisit
the read-only guardrail or turn the skill into a code reviewer.

## Goals / Non-Goals

**Goals:**

- Make the required tracker item configurable instead of hardcoded to Jira.
- Give non-application changes a sensible proof-of-run expectation.
- Keep weak-MR reports motivating by prioritizing `[important]` flags.
- Close the eval coverage gaps: middle-tier scoring, default output path, ambiguous input.

**Non-Goals:**

- Posting, approving, or merging MRs (the read-only guardrail stays).
- Critiquing code or suggesting code/logic changes.
- Replacing Waza or the mock GitLab MCP server.
- A cross-model executor matrix (tracked as a possible follow-up, see Decisions).

## Decisions

### Decision: Generalize the tracker, keep Jira as the default

The rubric hardcodes "Jira task link" and the eval grader asserts the literal word `jira`.
Rather than drop the tracker concept, introduce a `tracker` preference defaulting to Jira
and refer to "the configured tracker" in the rubric. Alternatives considered: leave it
Jira-only (rejected: forces a label on every team); make it fully free-form with no default
(rejected: loses the helpful concrete default). The eval grader's `(?i)jira` pattern moves
to the configured tracker.

### Decision: Proof-of-run is change-type aware, not a frontend/backend binary

The current definition ("screenshot for frontend, log for backend") does not map onto
infra, config, schema, or docs MRs. Broaden it so each change type has a sensible artifact
or an explicit exemption, mirroring how docs are already exempt from test coverage.

### Decision: Prioritize flags rather than cap them hard

A weak MR surfaced seven `[important]` items in one run, which reads as gatekeeping. Lead
with the top 2-3 highest-impact items and group or summarize the rest. A hard numeric cap
was rejected because a genuinely unready MR may need to show several real gaps; prioritization
preserves signal while protecting tone.

### Decision: Treat grader-signal findings as documentation, not requirements

F2 (a no-verdict judge result reports "All prompts passed" alongside score 0) and F3 (a
negative-mode trigger grader contributes its raw probability to the aggregate) are
interpretation issues, not skill behavior. They are documented as eval gotchas rather than
expressed as spec requirements. F6 (cross-model executor matrix) is optional and deferred.

## Risks / Trade-offs

- [Generalizing the tracker could weaken the concrete "Jira" nudge] → keep Jira as the
  default so the common case is unchanged; only teams that set `tracker` see a different label.
- [Prioritizing flags could hide a real gap] → group/summarize the remainder rather than
  dropping it, so nothing is lost, only re-ordered.
- [New eval fixtures add maintenance surface] → reuse the existing fixture shape and registry
  routing; no new server mode.

## Migration Plan

Documentation-only skill and eval changes; no runtime migration. After edits, re-run the
full suite and confirm the middle-tier, default-path, and ambiguous-input tasks pass before
considering the change applied.

## Open Questions

- Should the `tracker` preference accept a list (multiple acceptable trackers) or a single
  value? Single value is assumed for now.
- Is a cross-model executor matrix (F6) worth standing up later, or is single-model coverage
  sufficient for a skill eval?
