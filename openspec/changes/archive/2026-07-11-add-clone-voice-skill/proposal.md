## Why

People often need to draft messages that sound like a specific person - themselves
across accounts, a consented colleague they ghostwrite for, or a fictional character
whose voice must stay consistent. Doing this by hand is inconsistent, and asking a
generic agent to "write like X" throws away the reasoning about *what* makes X sound
like X. A skill that analyzes a real corpus, states its findings openly, and emits a
reusable per-person skill makes that voice repeatable and inspectable.

## What Changes

- Add a new `clone-voice` skill invoked as `/clone-voice <name?> <texts-file?>`.
- On run it: shows an ethics banner, resolves the target name (asking if absent),
  resolves a text corpus (file path or pasted messages), analyzes the corpus against a
  fixed style rubric, presents the findings openly as a **voice profile**, then
  **generates a second skill** `write-as-<name>` under `skills/write-as-<name>/`.
- The generated `write-as-<name>` skill is invoked `/write-as-<name> <text>` and returns
  the input rewritten in the analyzed voice, faithfully reproducing style traits
  including the person's habitual typos and grammar quirks.
- Both the generator and every generated skill carry the **same refusal rules** inline:
  they decline when the requested message resembles deception, fraud, impersonation
  meant to mislead, or credential/payment lures. The refusal rules live in one source
  file and are copied into each generated skill so it stays self-contained.
- Update the README "Available skills" table.

## Capabilities

### New Capabilities

- `clone-voice`: Analyze a person's message corpus against a style rubric, present the
  findings as an inspectable voice profile, and generate a self-contained
  `write-as-<name>` skill that rewrites text in that voice while enforcing embedded
  refusal rules.

### Modified Capabilities

<!-- None. This adds a new capability without changing existing spec-level behavior. -->

## Impact

- New files: `skills/clone-voice/SKILL.md` plus `reference/` material (style rubric,
  refusal rules, voice-profile template, generated-skill template).
- Generated output at runtime: `skills/write-as-<name>/SKILL.md` (created when the skill
  is used, not shipped in this change).
- `README.md` skills table.
- No changes to existing skills, evals, or tooling. Markdown lint applies to all new
  docs.
