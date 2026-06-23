# mr-feedback preferences

User default preferences for the `mr-feedback` skill. Follow these guidelines **over**
the defaults written in `SKILL.md`.

Anything not listed here falls back to the skill default. An explicit instruction in
the user's request still wins over this file (see precedence in `SKILL.md`).

- **Language** - write the report in **English**, regardless of the MR's own language.
- **Tone** - keep the voice **collaborative** and **encouraging**.
- **Method** - reach GitLab through the **GitLab MCP** tools (`gitlab-mcp`).
- **Allowed tools** - call only these MCP tools, nothing else:
  - `get_merge_request`
  - `list_merge_request_changed_files`
  - `get_merge_request_file_diff`
  - `list_merge_request_discussions`
  - `list_merge_request_pipelines`
  - `list_pipelines`
- **Output path** - write to `${CWD}/mr-feedback/<project-slug>-mr-<iid>-<YYYY-MM-DD>-<TIMESTAMP>.md`.
  Placeholders:
  - `${CWD}` = current working directory.
  - `<project-slug>` = the **last segment** of the project path (for
    `group/subgroup/checkout-service` this is `checkout-service`).
  - `<iid>` = the MR iid.
  - `<YYYY-MM-DD>` = today's date in the local timezone.
  - `<TIMESTAMP>` = current Unix time in seconds (keeps repeat runs of the same MR from
    overwriting each other).

  Do **not** guess the date or timestamp. Read them from the system clock (e.g.
  `date +%Y-%m-%d` and `date +%s`) so the filename reflects the real run time. Create the
  `mr-feedback/` folder if it does not exist. Example resolved path:
  `./mr-feedback/checkout-service-mr-57-2026-06-21-1750000000.md`.
