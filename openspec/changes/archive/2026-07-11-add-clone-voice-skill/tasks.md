## 1. Reference material

- [x] 1.1 Create `skills/clone-voice/reference/refusal-rules.md` as the single source of
      truth: the ethics banner text plus the enumerated refusal cases (deception, fraud,
      impersonation meant to mislead, credential/payment lures).
- [x] 1.2 Create `skills/clone-voice/reference/style-rubric.md` enumerating every analysis
      dimension (punctuation, capitalization, typos/grammar quirks, emoji + context,
      Slack `:emoji:` + context, sentence/paragraph length, message segmentation,
      greetings/sign-offs, register/formality, recurring expressions) and instructing a
      confidence note for thin corpora.
- [x] 1.3 Create `skills/clone-voice/reference/profile-template.md` defining the shape of
      `voice-profile-<name>.md`.
- [x] 1.4 Create `skills/clone-voice/reference/generated-skill-template.md`: the scaffold
      for `write-as-<name>/SKILL.md`, with placeholders for provenance frontmatter, the
      embedded profile, and the inlined refusal rules.

## 2. Generator skill

- [x] 2.1 Write `skills/clone-voice/SKILL.md` frontmatter (`name`, triggering
      `description`) and the ethics-banner-first flow.
- [x] 2.2 Document the workflow: banner -> resolve name (ask if missing) -> resolve corpus
      (path or pasted, never invented) -> analyze against the rubric -> present the profile
      -> generate the skill.
- [x] 2.3 Document generation: write to `skills/write-as-<name>/SKILL.md`, embed the
      profile, inline the refusal rules, record provenance frontmatter, and ask before
      overwriting an existing `write-as-<name>`.
- [x] 2.4 State guardrails: reproduce habitual typos/quirks; self-contained generated
      skill; single-source refusal rules with a note to regenerate when the policy changes.

## 3. Integration and hygiene

- [x] 3.1 Add a `clone-voice` row to the "Available skills" table in `README.md`.
- [x] 3.2 Run `npm run lint:fix` then `npm run lint` and resolve all markdown errors.
- [x] 3.3 Sanity-check the flow end to end with a small pasted corpus: confirm banner
      first, profile shown before generation, and a self-contained `write-as-<name>` with
      inlined refusal rules and provenance.
