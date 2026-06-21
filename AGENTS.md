# AGENTS.md

Guidance for AI agents working in this repository.

## What this repo is

A collection of Claude Code skills. The product here is **the skill files
themselves** - markdown instructions Claude loads to perform tasks. There is no
application to run, build, or test. Changes are evaluated by reading them.

## Structure

- Each skill is a folder under `skills/`: `skills/<skill-name>/SKILL.md`.
- `SKILL.md` starts with YAML frontmatter:
  ```yaml
  ---
  name: <kebab-case, matches folder name>
  description: <when to use this skill - written so Claude can trigger it>
  ---
  ```
- Longer supporting material (rubrics, templates, examples) goes in
  `skills/<skill-name>/reference/`, referenced from `SKILL.md` and read on demand.

## Conventions

- **Keep `SKILL.md` lean.** It is the always-loaded entry point. Push detail into
  `reference/` and tell the reader when to open it.
- **Write `description:` for triggering.** Describe the situations that should
  invoke the skill, not just what it does. This is how Claude decides to use it.
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
4. This repo is not yet under version control; do not run git commands unless the
   user initializes a repo and asks.
