# Voice profile template

The shape of the voice profile the skill presents to the user (and later embeds in the
generated skill). Fill every section from the rubric analysis. Quote **real examples from
the supplied corpus** only. Keep observations concrete: "ends messages without a period"
beats "informal punctuation".

Replace `<name>` with the target name and the bracketed placeholders with findings.

```markdown
# Voice profile - <name>

**Confidence:** [High | Medium | Low] - [one line: corpus size and why]

**Corpus:** [what was supplied - e.g. "23 Slack messages pasted directly" or a file path]

## Summary

[Two or three sentences capturing the overall voice: register, rhythm, and the two or
three most distinctive traits someone would notice first.]

## Findings by dimension

For each rubric dimension, one row. Mark thin dimensions **sparse**.

| Dimension | Observation | Example from corpus |
| --------- | ----------- | ------------------- |
| Punctuation habits | [what they do] | `[quote]` |
| Capitalization | ... | `[quote]` |
| Typos & grammar quirks | [habitual, reproduce these] | `[quote]` |
| Emoji use & context | ... | `[quote]` |
| Slack `:emoji:` use | ... | `[quote]` |
| Sentence & paragraph length | ... | `[quote]` |
| Message segmentation | ... | `[quote]` |
| Greetings & sign-offs | ... | `[quote]` |
| Register & formality | ... | `[quote]` |
| Recurring expressions | ... | `[quote]` |

## Reproduce-exactly traits

The specific quirks a rewrite MUST preserve to sound like <name>, including habitual
typos and grammar slips:

- [trait - e.g. "writes `im` and `dont` without apostrophes"]
- [trait - e.g. "no terminal period on short messages"]
- [trait ...]

## Notes and caveats

- [Sparse dimensions, ambiguities, or anything the corpus could not settle.]
```
