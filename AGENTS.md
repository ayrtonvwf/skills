# AGENTS.md

Guidance for AI agents working in this repository.

## What this repo is

A collection of agent skills in the portable `SKILL.md` format. The product here is
**the skill files themselves** - markdown instructions an AI agent loads to perform
tasks. They are not tied to one harness (Claude Code, GitHub Copilot, Cursor,
OpenCode, etc.). There is no application to run, build, or test. Changes are evaluated
by reading them.

## Structure

- Each skill is a folder under `skills/`: `skills/<skill-name>/SKILL.md`.
- `SKILL.md` starts with YAML frontmatter:

  ```yaml
  ---
  name: <kebab-case, matches folder name>
  description: <when to use this skill - written so an agent can trigger it>
  ---
  ```

- Supporting material lives in one of two sibling folders, split by **who consumes
  the file**:
  - `skills/<skill-name>/reference/` - docs **the agent reads into context to reason**:
    rubrics, specs, schemas, domain knowledge, style guides. Referenced from
    `SKILL.md` and read on demand.
  - `skills/<skill-name>/assets/` - files the **task consumes or emits**, not read as
    prose: output templates, fonts, logos, images, stylesheets, data files loaded by a
    script.
  - `skills/<skill-name>/scripts/` - executable helpers the skill **runs** (Python,
    shell, etc.) for mechanical or deterministic work better done as code than
    token-by-token. `SKILL.md` names the script and says when/how to invoke it
    (interpreter, args, expected output). Keep scripts self-contained and document
    their dependencies. No skill uses this folder yet; it is the agreed home for
    runnable helpers when one does.
  - Rule of thumb: if the model reads it to think, it is `reference/`; if the output
    or a script uses the bytes, it is `assets/`; if it is code the skill executes, it
    is `scripts/`. When a file is genuinely read by the model (e.g. a markdown rubric
    or preferences file), prefer `reference/` even if it feels asset-like.

## Conventions

- **Keep `SKILL.md` lean.** It is the always-loaded entry point. Push detail into
  `reference/` and tell the reader when to open it.
- **Write `description:` for triggering.** Describe the situations that should
  invoke the skill, not just what it does. This is how an agent decides to use it.
- **State guardrails explicitly.** Say whether a skill is read-only, what side
  effects it may have, and what it must never do.
- **No em-dashes.** Use a plain hyphen (`-`). Applies to every file here.
- **Default report/output language is English** unless a skill says otherwise or the
  user asks for another language.
- **Don't invent data.** Skills that fetch from external tools (e.g. MCP servers)
  must mark missing data as unavailable rather than guessing.

## When adding or editing a skill

1. Match the existing structure and tone of neighboring skills.
2. Update the skills table in [README.md](README.md) if you add or rename a skill.
3. Prefer editing existing `reference/` files over duplicating content.
4. Do not run git commands (commit, push, branch) unless the user explicitly asks.
