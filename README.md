# skills

A personal collection of [agent skills](https://docs.claude.com/en/docs/claude-code/skills) -
reusable, self-contained instruction sets that an AI agent loads on demand to perform
a specific task well and consistently. They follow the portable `SKILL.md` format, so
they work across agent harnesses (Claude Code, GitHub Copilot, Cursor, OpenCode, and
others), not a single tool.

## Layout

```
skills/
└── skills/
    └── <skill-name>/
        ├── SKILL.md          # entry point: name, description, instructions
        ├── reference/        # optional docs the agent reads to do the task
        ├── assets/           # optional files the task consumes or outputs
        └── scripts/          # optional executable helpers the skill runs
```

Each skill lives in its own folder under `skills/`. The folder name is the skill
name. `SKILL.md` has YAML frontmatter (`name`, `description`) followed by the
instructions; `reference/`, `assets/`, and `scripts/` hold supporting material so the
entry point stays lean.

### `reference/` vs `assets/`

The split is about **who consumes the file**:

- **`reference/`** - material **the agent reads into context to reason** about the
  task: rubrics, specs, schemas, domain knowledge, lookup tables, style guides. If the
  model has to *read it to think*, it belongs here. `SKILL.md` should tell the agent
  when to open each file (progressive disclosure).
- **`assets/`** - files the **task consumes or emits**, not read as prose: output
  templates filled in to produce a deliverable, fonts, logos, images, stylesheets, or
  data files loaded by a script. If code or the output *uses the bytes* rather than the
  model reading them, it belongs here.

Quick test: *"Does the agent read this to think, or does the work product need this
file?"* Read-to-think -> `reference/`; used-by-output -> `assets/`. When a file is
genuinely read by the model (e.g. a markdown rubric or preferences file), prefer
`reference/` even if it feels asset-like.

### `scripts/`

Executable helpers a skill **runs** instead of having the agent do the work by hand -
e.g. a Python or shell script that transforms a file, calls an API, or does
deterministic heavy lifting. Reach for `scripts/` when a step is mechanical, error
prone to do token-by-token, or cheaper to run as code than to reason through.
`SKILL.md` should name the script and say when and how to invoke it (interpreter,
arguments, expected output). Keep scripts self-contained and document any
dependencies they need. None of the current skills use this folder yet; it is
documented here so new skills have a consistent home for runnable helpers.

## Available skills

| Skill | What it does |
|-------|--------------|
| [mr-feedback](skills/mr-feedback/SKILL.md) | Evaluates how ready a GitLab Merge Request is to be reviewed (via the GitLab MCP) and writes a paste-ready feedback report. Not a code review - it judges context, scope, tests acknowledgement, and reviewer guidance. |

## Installing

These skills follow the standard `SKILL.md` format, so any skills installer can pull
them straight from this repo (`ayrtonvwf/skills`). The skill folders live under
`skills/`, which the tools below resolve automatically.

### `npx skills` (Vercel Labs)

A package manager for agent skills that uses GitHub as its registry and auto-detects
your installed agents (Claude Code, Cursor, Codex, OpenCode, and others). No global
install needed.

```sh
npx skills add ayrtonvwf/skills        # add skills from this repo
npx skills list                        # list installed skills
npx skills update                      # update installed skills
```

### `npx openskills`

A universal `SKILL.md` loader that installs into `./.claude/skills` (project-local) by
default, or `~/.claude/skills` with `--global`; use `--universal` for the
agent-neutral `./.agent/skills` layout.

```sh
npx openskills install ayrtonvwf/skills            # project-local
npx openskills install ayrtonvwf/skills --global   # user-wide (~/.claude/skills)
```

### Microsoft `apm` (Agent Package Manager)

A dependency manager that records the skills a project needs in `apm.yml` and pins
resolved versions in `apm.lock.yaml`, giving every machine and CI job identical bytes
across Copilot, Claude Code, Cursor, Codex, Gemini, and more.

```sh
apm install ayrtonvwf/skills                       # add the whole repo
apm install ayrtonvwf/skills --skill mr-feedback   # add a single skill
```

## Using a skill

Most agent harnesses can discover these skills directly. Point your agent's skills
path at this repo (or symlink individual skill folders into a path it already scans),
then invoke by name - e.g. `/mr-feedback <MR link>`. A good `description:` in each
`SKILL.md` lets an agent trigger the skill automatically when a request matches.

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` with `name` + `description` frontmatter.
2. Keep `SKILL.md` focused; move long rubrics, specs, and examples into `reference/`
   and have the instructions tell the agent when to read them. Put files the task
   consumes or outputs (templates, images, data) in `assets/`. See
   [`reference/` vs `assets/`](#reference-vs-assets).
3. State guardrails explicitly (read-only? side effects? what it must not do).
4. Add a row to the table above.

See [AGENTS.md](AGENTS.md) for conventions agents should follow when working in this
repo.
