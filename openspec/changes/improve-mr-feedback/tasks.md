## 1. Generalize the tracker (S3)

- [ ] 1.1 Add a `tracker` preference (default Jira) to `reference/preferences.md`
- [ ] 1.2 Reword rubric section 0 to require "the configured issue/ticket tracker link (e.g. Jira)" instead of hardcoding Jira
- [ ] 1.3 Update the `not-ready` eval grader's `(?i)jira` pattern to match the configured tracker

## 2. Broaden proof-of-run (S5)

- [ ] 2.1 Extend the rubric's proof-of-run definition to cover infra, config, schema, and docs change types (artifact or explicit exemption)
- [ ] 2.2 Confirm the docs/non-code path is consistent with the existing test-coverage exemption

## 3. Prioritize flags (S2)

- [ ] 3.1 Update `report-template.md` and the rubric so reports lead with the top 2-3 `[important]` items and group/summarize the rest
- [ ] 3.2 Verify the not-ready judge task still passes and the tone reads as encouraging

## 4. Eval coverage (F4)

- [ ] 4.1 Add a middle-tier fixture (good description + tests, no proof-of-run) and a task asserting a Needs prep / Almost ready band
- [ ] 4.2 Add a task that omits the output-path override and asserts a file matching the templated default path exists
- [ ] 4.3 Add an ambiguous-input task (bare project path, no iid) asserting the skill asks rather than fetching

## 5. Documentation of grader signal (F2, F3)

- [ ] 5.1 Document the "All prompts passed" + score 0 no-verdict signature in the eval README gotchas
- [ ] 5.2 Document that a negative-mode trigger grader's aggregate score is not its pass rate

## 6. Validate

- [ ] 6.1 Re-run the full suite and confirm the new tasks pass across at least 4 trials
- [ ] 6.2 Run `npm run lint:fix` then `npm run lint` and resolve any remaining errors
