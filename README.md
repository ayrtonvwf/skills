# skills

A personal collection of [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) -
reusable, self-contained instruction sets that Claude loads on demand to perform a
specific task well and consistently.

## Layout

```
skills/
└── skills/
    └── <skill-name>/
        ├── SKILL.md          # entry point: name, description, instructions
        └── reference/        # optional supporting docs read on demand
```

Each skill lives in its own folder under `skills/`. The folder name is the skill
name. `SKILL.md` has YAML frontmatter (`name`, `description`) followed by the
instructions; `reference/` holds longer material the skill pulls in only when needed,
to keep the entry point lean.

## Available skills

| Skill | What it does |
|-------|--------------|
| [mr-feedback](skills/mr-feedback/SKILL.md) | Evaluates how ready a GitLab Merge Request is to be reviewed (via the GitLab MCP) and writes a paste-ready feedback report. Not a code review - it judges context, scope, tests acknowledgement, and reviewer guidance. |

## Using a skill

These skills are designed to be discoverable by Claude Code. Point your Claude Code
skills path at this repo (or symlink individual skill folders into a path Claude
already scans), then invoke by name - e.g. `/mr-feedback <MR link>`. A good
`description:` in each `SKILL.md` lets Claude trigger the skill automatically when a
request matches.

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` with `name` + `description` frontmatter.
2. Keep `SKILL.md` focused; move long rubrics, templates, and examples into
   `reference/` and have the instructions tell Claude when to read them.
3. State guardrails explicitly (read-only? side effects? what it must not do).
4. Add a row to the table above.

See [AGENTS.md](AGENTS.md) for conventions agents should follow when working in this
repo.
