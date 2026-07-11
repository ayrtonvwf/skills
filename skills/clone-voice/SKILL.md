---
name: clone-voice
description: Analyze a person's message corpus and generate a reusable write-as-<name> skill that rewrites text in their voice. Trigger when the user wants to clone or capture someone's writing/messaging style, build a "write as X" skill, or invokes /clone-voice.
---

# clone-voice

A **meta-skill**: it reads a corpus of one person's messages, analyzes their writing
style against a fixed rubric, presents the findings as an inspectable **voice profile**,
then **generates a second skill**, `write-as-<name>`, that rewrites text in that voice.

Invoked as `/clone-voice <name?> <texts-file?>`. Both arguments are optional; resolve
them in the workflow below.

"Voice" here means **writing/messaging style only** - never audio or speech synthesis.

## Step 0 - Show the ethics banner first

Before requesting input, analyzing, or generating **anything**, output the ethics banner
verbatim from `reference/refusal-rules.md`. This always comes first, on every invocation,
regardless of the arguments passed.

## Workflow

1. **Banner** - show the ethics banner (Step 0) before anything else.
2. **Resolve the name** - use the name from the invocation if present. If absent, **ask
   the user** for the target name before proceeding.
3. **Resolve the corpus** - use the supplied file path if present and readable. If no
   corpus is given, **ask** the user for either a file path or to paste texts directly,
   and **wait** for it before analyzing. Never invent, infer, or pad corpus content that
   was not supplied.
4. **Analyze** - read `reference/style-rubric.md` and evaluate the corpus against **every**
   dimension. Record concrete observations with real examples quoted from the corpus.
   Capture habitual typos and grammar quirks as **reproducible traits**. If the corpus is
   thin, follow the rubric's confidence guidance and state low confidence rather than
   overclaiming.
5. **Present the profile** - read `reference/profile-template.md` and present the filled-in
   voice profile to the user **before** generating anything, so they can review and
   correct the reasoning. Invite corrections.
6. **Generate the skill** - produce `skills/write-as-<name>/SKILL.md` (see Generation).

## Generation

Read `reference/generated-skill-template.md` and write the generated skill to
`skills/write-as-<name>/SKILL.md`, where `<name>` is the target name kebab-cased.

- **Embed the profile inline** - paste the full voice profile into the generated skill.
- **Inline the refusal rules** - copy the ethics banner and the refusal cases **verbatim**
  from `reference/refusal-rules.md` into the generated skill. This is the single source of
  truth; the generated skill must not reference back to `clone-voice` at runtime.
- **Record provenance frontmatter** - target name, generation date (read from the system
  clock, e.g. `date +%Y-%m-%d`), and that it was produced from a supplied corpus.
- **Ask before overwriting** - if `skills/write-as-<name>/SKILL.md` already exists, ask the
  user before replacing it.

After writing, tell the user the path and that they can invoke `/write-as-<name> <text>`.

## Guardrails

- **Banner first, always.** No analysis or generation before the ethics banner.
- **Refusal rules embedded in both skills.** This skill and every generated `write-as-*`
  skill carry the same refusal rules inline. Before rewriting, a generated skill must
  evaluate the request against the refusal cases and decline when it matches.
- **Single source of truth.** The refusal rules live only in
  `reference/refusal-rules.md` and are copied into each generated skill. When that policy
  changes, existing `write-as-*` skills must be **regenerated** to pick up the new text;
  the provenance date shows how current each one is.
- **Self-contained output.** A generated skill depends only on its own embedded profile
  and rules, never on `clone-voice` files at runtime.
- **Reproduce quirks, don't clean them.** Fidelity beats cleanliness: habitual typos and
  grammar slips are captured and reproduced as traits. The embedded refusal rules are the
  safety counterweight.
- **Don't invent data.** Analyze only what the corpus contains; mark sparse dimensions as
  tentative rather than guessing.
- **Writing style only.** No audio, no speech synthesis.
- **Never commit.** Leave all new files uncommitted for the user to review.
