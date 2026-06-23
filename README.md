# skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196.svg)](https://www.conventionalcommits.org)
[![Markdown lint](https://img.shields.io/badge/lint-markdownlint--cli2-blue.svg)](.markdownlint-cli2.jsonc)
[![Format: SKILL.md](https://img.shields.io/badge/format-SKILL.md-7c3aed.svg)](https://docs.claude.com/en/docs/claude-code/skills)

A collection of [agent skills](https://docs.claude.com/en/docs/claude-code/skills) -
reusable, self-contained instruction sets that an AI agent loads on demand to perform a
specific task well and consistently. They use the portable `SKILL.md` format, so they run
across agent harnesses (Claude Code, GitHub Copilot, Cursor, OpenCode, and others), not a
single tool.

The point of this repo is not just the skills. It is the **engineering around them**: every
skill ships with an automated evaluation suite, a mocked tool boundary that enforces its
guardrails, and the CI hygiene to keep both honest. A skill here is treated like production
behavior - specified, tested against deterministic fixtures, and prevented from regressing.

## Why this repo is built the way it is

The interesting work lives below the skill files. Highlights, with links to the full
write-ups:

- **Skills are evaluated, not just written.** Each skill has a [Microsoft Waza](https://github.com/microsoft/waza)
  eval suite ([`evals/`](evals/README.md)) that runs it against deterministic JSON fixtures
  and grades triggering, tool discipline, and rubric-aligned scoring. Behavior is checked
  repeatably without touching live services.
- **Guardrails enforced by construction, then tested.** The `mr-feedback` skill is read-only.
  The [mock GitLab MCP server](evals/mr-feedback/mock-gitlab-mcp/server.mjs) registers
  *exactly* the six read-only tools the skill is allowed to call and **no mutating tool at
  all**, so any attempt to post, approve, or merge fails loudly. The read-only promise is
  proven by the harness, not just asserted in prose.
- **A real constraint solved by design, and documented.** Per-task environment variables
  cannot reach the MCP subprocess under `copilot-sdk`, so scenario selection is done by
  **registry routing**: the server loads every fixture and routes each call by the MR
  identifier in the request. The reasoning is captured in
  [`specs/waza-eval/specification.md`](specs/waza-eval/specification.md) (§8) and the
  [eval README](evals/README.md#how-the-mock-gitlab-mcp-server-works).
- **Progressive disclosure as an architecture.** `SKILL.md` stays a lean, always-loaded
  entry point; rubrics, preferences, and templates live in `reference/` and are read only when
  needed. The split is deliberate and documented ([reference vs assets](#reference-vs-assets)).
- **CI-grade hygiene for a docs-heavy repo.** Conventional Commits enforced via commitlint +
  Husky, `lint-staged` on commit, markdownlint across all docs, an idempotent
  [`sync-eval-cwd.mjs`](scripts/sync-eval-cwd.mjs) portability script wired into `postinstall`,
  and a Claude Code `Stop` hook that blocks finishing while markdown lint fails (with a
  retry budget so it cannot infinite-loop). Secret scanning, push protection, and Dependabot
  are on.

For the design decisions and gotchas in full, start with [`evals/README.md`](evals/README.md)
and the specs under [`specs/`](specs/).

## Available skills

| Skill | What it does |
| ----- | ------------ |
| [mr-feedback](skills/mr-feedback/SKILL.md) | Evaluates how ready a GitLab Merge Request is to be reviewed (via the GitLab MCP) and writes a paste-ready feedback report. Not a code review - it judges context, scope, tests acknowledgement, and reviewer guidance. Read-only by design. |

## Repository layout

```text
skills/
├── skills/                 # the skills themselves (the product)
│   └── <skill-name>/
│       ├── SKILL.md        # entry point: name, description, instructions
│       ├── reference/      # docs the agent reads to reason about the task
│       ├── assets/         # files the task consumes or outputs
│       └── scripts/        # optional executable helpers the skill runs
├── evals/                  # Waza eval suites + mock MCP servers per skill
├── specs/                  # design specs and decision records
└── scripts/                # repo tooling (eval cwd sync, etc.)
```

Each skill lives in its own folder under `skills/`. The folder name is the skill name.
`SKILL.md` has YAML frontmatter (`name`, `description`) followed by the instructions;
`reference/`, `assets/`, and `scripts/` hold supporting material so the entry point stays lean.

### `reference/` vs `assets/`

The split is about **who consumes the file**:

- **`reference/`** - material **the agent reads into context to reason** about the task:
  rubrics, specs, schemas, domain knowledge, lookup tables, style guides. If the model has to
  *read it to think*, it belongs here. `SKILL.md` should tell the agent when to open each file
  (progressive disclosure).
- **`assets/`** - files the **task consumes or emits**, not read as prose: output templates
  filled in to produce a deliverable, fonts, logos, images, stylesheets, or data files loaded
  by a script. If code or the output *uses the bytes* rather than the model reading them, it
  belongs here.

Quick test: *"Does the agent read this to think, or does the work product need this file?"*
Read-to-think goes to `reference/`; used-by-output goes to `assets/`. When a file is genuinely
read by the model (e.g. a markdown rubric or preferences file), prefer `reference/` even if it
feels asset-like.

### `scripts/`

Executable helpers a skill **runs** instead of having the agent do the work by hand - e.g. a
Python or shell script that transforms a file, calls an API, or does deterministic heavy
lifting. Reach for `scripts/` when a step is mechanical, error prone to do token-by-token, or
cheaper to run as code than to reason through. `SKILL.md` should name the script and say when
and how to invoke it (interpreter, arguments, expected output). Keep scripts self-contained
and document any dependencies they need. None of the current skills use this folder yet; it is
documented here so new skills have a consistent home for runnable helpers.

## Installing

These skills follow the standard `SKILL.md` format, so any skills installer can pull them
straight from this repo (`ayrtonvwf/skills`). The skill folders live under `skills/`, which the
tools below resolve automatically.

### `npx skills` (Vercel Labs)

A package manager for agent skills that uses GitHub as its registry and auto-detects your
installed agents (Claude Code, Cursor, Codex, OpenCode, and others). No global install needed.

```sh
npx skills add ayrtonvwf/skills        # add skills from this repo
npx skills list                        # list installed skills
npx skills update                      # update installed skills
```

### `npx openskills`

A universal `SKILL.md` loader that installs into `./.claude/skills` (project-local) by default,
or `~/.claude/skills` with `--global`; use `--universal` for the agent-neutral `./.agent/skills`
layout.

```sh
npx openskills install ayrtonvwf/skills            # project-local
npx openskills install ayrtonvwf/skills --global   # user-wide (~/.claude/skills)
```

### Microsoft `apm` (Agent Package Manager)

A dependency manager that records the skills a project needs in `apm.yml` and pins resolved
versions in `apm.lock.yaml`, giving every machine and CI job identical bytes across Copilot,
Claude Code, Cursor, Codex, Gemini, and more.

```sh
apm install ayrtonvwf/skills                       # add the whole repo
apm install ayrtonvwf/skills --skill mr-feedback   # add a single skill
```

## Using a skill

Most agent harnesses can discover these skills directly. Point your agent's skills path at this
repo (or symlink individual skill folders into a path it already scans), then invoke by name -
e.g. `/mr-feedback <MR link>`. A good `description:` in each `SKILL.md` lets an agent trigger
the skill automatically when a request matches.

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` with `name` + `description` frontmatter.
2. Keep `SKILL.md` focused; move long rubrics, specs, and examples into `reference/` and have
   the instructions tell the agent when to read them. Put files the task consumes or outputs
   (templates, images, data) in `assets/`. See [`reference/` vs `assets/`](#reference-vs-assets).
3. State guardrails explicitly (read-only? side effects? what it must not do).
4. Add an eval suite under `evals/<skill-name>/` so the behavior is covered. See
   [`evals/README.md`](evals/README.md).
5. Add a row to the [Available skills](#available-skills) table.

See [AGENTS.md](AGENTS.md) for the conventions agents (and humans) should follow when working
in this repo.

## License

[MIT](LICENSE).
