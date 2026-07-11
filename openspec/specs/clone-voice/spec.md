# clone-voice Specification

## Purpose

The `clone-voice` skill analyzes a person's message corpus against a fixed style rubric
and generates a reusable, self-contained `write-as-<name>` skill that rewrites input
text in that person's voice. It exists to support legitimate voice reuse (drafting as
oneself, consented ghostwriting, keeping a fictional character's voice consistent) while
refusing deceptive uses.

## Requirements

### Requirement: Ethics banner precedes analysis

The skill SHALL display an ethics banner before doing any analysis or generation. The
banner MUST state the legitimate uses (drafting as oneself, consented ghostwriting,
keeping a fictional character's voice consistent) and MUST state that the skill must
never be used for deception, fraud, impersonation meant to mislead, or credential or
payment lures.

#### Scenario: Banner shown first

- **WHEN** the user invokes `/clone-voice` with any arguments
- **THEN** the skill outputs the ethics banner before requesting input, analyzing, or
  generating anything

### Requirement: Resolve target name

The skill SHALL obtain the target name from the invocation. WHEN the name is absent, the
skill MUST ask the user for it before proceeding.

#### Scenario: Name provided in invocation

- **WHEN** the user runs `/clone-voice Alice ./texts.md`
- **THEN** the skill uses `Alice` as the target name without asking

#### Scenario: Name missing

- **WHEN** the user runs `/clone-voice` with no name
- **THEN** the skill asks the user for the target name before analyzing

### Requirement: Resolve text corpus

The skill SHALL obtain a corpus of texts written by the target. WHEN no corpus path is
provided, the skill MUST ask the user either for a file path or to paste texts directly.
The skill MUST NOT invent or infer corpus content that was not supplied.

#### Scenario: Corpus path provided

- **WHEN** the user supplies a readable file path with texts
- **THEN** the skill reads that file as the corpus

#### Scenario: Corpus missing

- **WHEN** the user supplies no corpus
- **THEN** the skill asks for a file path or for pasted texts, and waits for them before
  analyzing

#### Scenario: Thin corpus

- **WHEN** the supplied corpus is too small to characterize the voice confidently
- **THEN** the skill states its low confidence in the profile rather than overclaiming

### Requirement: Analyze corpus against a style rubric

The skill SHALL analyze the corpus against a fixed style rubric covering at least:
punctuation habits, capitalization, typos and grammar quirks, emoji use and context,
Slack-style `:emoji-name:` use and context, sentence and paragraph length, message
segmentation, greetings and sign-offs, register and formality, and recurring
expressions. The analysis MUST capture the target's habitual typos and grammar quirks as
reproducible traits.

#### Scenario: Rubric dimensions covered

- **WHEN** the skill analyzes a corpus
- **THEN** it evaluates each rubric dimension and records concrete observations with
  examples drawn from the corpus

### Requirement: Present findings openly

The skill SHALL present its findings as an inspectable voice profile before generating
the downstream skill, so the user can review and correct the reasoning.

#### Scenario: Profile presented before generation

- **WHEN** the analysis completes
- **THEN** the skill outputs the voice profile and its findings before generating
  `write-as-<name>`

### Requirement: Generate a self-contained write-as skill

The skill SHALL generate a new skill at `skills/write-as-<name>/SKILL.md`, invoked as
`/write-as-<name> <text>`, that rewrites input text in the analyzed voice. The generated
skill MUST be self-contained: it MUST embed the voice profile and MUST NOT depend on
files from the `clone-voice` skill at runtime. Its frontmatter MUST record provenance
(the target name, generation date, and that it was produced from a supplied corpus).

#### Scenario: Generated skill rewrites in voice

- **WHEN** the user later runs `/write-as-<name> some text`
- **THEN** the generated skill returns the text rewritten in the target's voice,
  reproducing the captured style traits including habitual typos

#### Scenario: Generated skill is self-contained

- **WHEN** the generated skill runs
- **THEN** it relies only on its own embedded profile and rules, not on any
  `clone-voice` reference file

### Requirement: Refusal rules embedded in both skills

The `clone-voice` skill and every generated `write-as-<name>` skill SHALL carry the same
refusal rules inline. Before rewriting, the generated skill MUST evaluate whether the
requested message resembles a refusal case (deception, fraud, impersonation meant to
mislead, credential or payment lures) and MUST decline to produce the message when it
does.

#### Scenario: Refusal on deceptive request

- **WHEN** the user asks a generated `write-as-<name>` skill to write a message whose
  purpose resembles a refusal case
- **THEN** the skill declines to produce the message and states why

#### Scenario: Single source of refusal rules

- **WHEN** the `clone-voice` skill generates a `write-as-<name>` skill
- **THEN** it copies the refusal rules from its single source file into the generated
  skill so the policy is defined in one place
