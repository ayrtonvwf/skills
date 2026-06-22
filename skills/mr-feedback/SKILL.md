---
name: mr-feedback
description: Use this skill to evaluate the quality of a GitLab Merge Request and produce a feedback report ready to paste as an MR note. Trigger when the user asks for MR feedback, an MR quality review, or an MR report.
---

# mr-feedback

Fetch a GitLab Merge Request, evaluate how **ready it is to be reviewed**, and write
a feedback report to a new markdown file that can be copied straight into an MR note.

## What to do

Judge **review-readiness**. Check whether the MR has the context, scope clarity, testing
instructions, and reviewer guidance that let a reviewer pick it up efficiently.

## Why

A well-prepared MR signals care and gets reviewed faster and better. The report should make
a good MR feel recognized and give a weaker one concrete, encouraging steps to raise its readiness.

## What not to do

**Do not review or critique the code itself and do not suggest code/logic changes**

## Preferences

Before doing anything else, read `reference/preferences.md` (relative to this skill).
It is the source of truth for all configurable behavior — output language, tone,
fetch method, allowed tools, and output path. This SKILL.md does **not** restate
those values; always read them from the preferences file.

Precedence, highest to lowest:

1. An explicit instruction in the user's current request (e.g. "this time write it in Portuguese").
2. `reference/preferences.md`.
3. Instructions in this skill.

## Inputs

The user provides one of:

- A full MR URL: `https://gitlab.com/<group>/<subgroup>/<project>/-/merge_requests/<iid>`
- A project path + MR iid: `group/subgroup/project` + `42`

Parse from the URL:

- `project_id` = the path between the host and `/-/merge_requests/` (URL-encode as
  `group%2Fsubgroup%2Fproject` when calling tools)
- `mergeRequestIid` = the number after `/-/merge_requests/`

If either is missing or ambiguous, ask before fetching.

## Workflow

Use the method and tools declared in `reference/preferences.md`. The steps below say
**what information to gather and why**, not which tool to call — pick the matching
tool from the preferences for each.

1. **MR metadata** - title, description, author, state, source/target branch, draft
   flag, labels, milestone, approvals, merge status.
2. **Changed-file list** - paths + add/del counts; gives scope/size without pulling
   every diff.
3. **Sample diffs to confirm the description matches reality** - in batches of 3-5
   files. Use this only to sanity-check scope and whether tests were touched - **not**
   to critique code. Skip lockfiles, generated files, and pure renames; sample if the
   MR is huge.
4. **Commits** - use the commit summary already included in the MR metadata (step 1) for
   hygiene/atomicity signal (commit count / addition summary).
5. **CI status** - latest pipeline state for the MR (pass/fail/none).
6. **Evaluate** against the rubric in `reference/rubric.md`.
7. **Write the report** to a new file (see Output) using `reference/report-template.md`.
8. Tell the user the file path and offer to refine tone/length before they copy/paste it.

Read `reference/rubric.md` before scoring and `reference/report-template.md` before
writing. Do not invent data - if a fetch returns nothing for a category (e.g. no
pipeline), mark it "not available" rather than guessing.

Each rubric category carries a **Reason** explaining why it matters to the author.
When you report a gap in "To raise readiness", always include *why it matters* for
the author - so the feedback explains the purpose behind each request, not just the
request itself.

**Do not copy the category Reason verbatim.** The Reason is background that covers the
whole category; rewrite it to fit the *exact* problem you found. Reference only the
specific thing that is wrong, and never mention aspects of the category that are fine.
For example, if the branch is behind master but the pipeline is green, explain why
being behind master matters - do **not** mention the pipeline at all, since it passed.
The "why it matters" must be true for this MR's specific gap, not a generic statement
about the category.

## Output

Write to the output path declared in `reference/preferences.md`, resolving its
placeholders and creating any folders the path needs.

## Guardrails

- **Read-only.** This skill never posts notes, approves, or modifies the MR. It
  only writes a local markdown file. The user decides whether to paste it.
- Do not include secrets/tokens that may appear in diffs in the report.
- If the MR is a draft or has no diff yet, you can still judge it and
  generate the report, but make sure to be explicit about it.
