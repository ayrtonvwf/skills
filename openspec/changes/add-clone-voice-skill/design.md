## Context

This repo ships portable `SKILL.md` skills. `clone-voice` is unusual: it is a
**meta-skill** whose primary output is *another skill*. It reads a corpus of a person's
messages, analyzes writing style, and writes a new `skills/write-as-<name>/SKILL.md`.
Style cloning is dual-use, so the design has to carry safety framing into an artifact
that will later run on its own, disconnected from the generator.

The relevant constraints from `AGENTS.md`: keep `SKILL.md` lean with detail pushed to
`reference/`; no em-dashes; default output language English; don't invent data; lint
markdown before finishing; never commit.

## Goals / Non-Goals

**Goals:**

- One rubric, applied consistently, so profiles are comparable and inspectable.
- Separate the **voice profile** (findings) from the **generated skill** so the reasoning
  is reviewable and correctable before and after generation.
- Make every generated skill fully self-contained, including its safety rules.
- Single source of truth for the refusal rules, copied into each generated skill.

**Non-Goals:**

- No audio or speech synthesis. "Voice" means writing/messaging style only.
- No eval suite in this change (the existing Waza harness targets `mr-feedback`).
- No identity verification or consent enforcement mechanism beyond in-prose framing and
  refusal rules.

## Decisions

**Two artifacts, not one.** `clone-voice` emits (1) `voice-profile-<name>.md` shown to
the user and (2) the generated skill that embeds it. Alternative considered: generate the
skill directly. Rejected because the profile is the "observability of reasoning" the user
asked for and makes correction cheap - regenerate from an edited profile.

**Generated skill embeds the profile inline** rather than referencing back to
`clone-voice/reference/`. A generated skill is invoked independently; a runtime reference
to the generator's files would break if `clone-voice` is absent. Self-contained is the
only safe option.

**Refusal rules live in `reference/refusal-rules.md` and are copied into each generated
skill.** Alternative: reference a shared file. Rejected for the same self-containment
reason. Cost accepted: policy edits require regenerating existing `write-as-*` skills;
this is documented in the skill.

**Reproduce habitual typos and quirks.** Per the user decision, fidelity beats
cleanliness - the rubric captures errors as reproducible traits. The refusal rules are
the safety counterweight to that fidelity.

**Name convention `write-as-<name>`** (not `impersonate-<name>`). Reads as the consented
use case and lowers the adversarial framing while the behavior is identical.

**Output under `skills/write-as-<name>/`** so the generated skill is a real, installable
skill matching repo conventions, not a scratch artifact.

## Risks / Trade-offs

- [Refusal rules drift across generated skills as the policy evolves] → Keep one source
  file; the skill instructs regeneration when rules change; provenance frontmatter dates
  each generated skill.
- [High-fidelity typo reproduction increases forgery potential] → Embedded refusal rules
  and the up-front ethics banner; framing centered on consented/own/fictional use.
- [Thin corpus yields an overconfident profile] → Rubric requires a confidence note and
  flagging of sparse dimensions; "don't invent data" applies.
- [Generated skill name collision with an existing `write-as-<name>`] → On collision, ask
  the user before overwriting.
- [Markdown lint failures block completion] → Run `npm run lint:fix` then `npm run lint`
  before finishing, per repo hygiene.

## Migration Plan

Additive only. New skill folder plus a README table row. No changes to existing skills or
tooling; nothing to roll back beyond deleting the new folder.

## Open Questions

- Should generated skills eventually get their own eval fixtures? Deferred; out of scope
  for this change.
