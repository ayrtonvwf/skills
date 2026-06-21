# mr-feedback preferences

User default preferences for the `mr-feedback` skill. Follow these guidelines **over**
the defaults written in `SKILL.md`.

Anything not listed here falls back to the skill default. An explicit instruction in
the user's request still wins over this file (see precedence in `SKILL.md`).

- **Language** — write the report in **English**, regardless of the MR's own language.
- **Tone** — keep the voice **collaborative** and **encouraging**.
- **Method** — reach GitLab through the **GitLab MCP** tools (`gitlab-mcp`).
- **Allowed tools** — call only these MCP tools, nothing else:
  - `get_merge_request`
  - `list_merge_request_changed_files`
  - `get_merge_request_file_diff`
  - `list_merge_request_commits`
  - `list_merge_request_discussions`
  - `list_merge_request_pipelines`
  - `list_pipelines`
  - ``
- **Output path** — write to `${CWD}/mr-feedback/<project-slug>-mr-<iid>-<YYYY-MM-DD>-<TIMESTAMP>.md`.
  Placeholders: `${CWD}` = working directory, `<project-slug>` = last segment of the
  project path, `<iid>` = MR iid, `<YYYY-MM-DD>` = report date, `<TIMESTAMP>` = unix
  seconds (keeps repeat runs of the same MR from overwriting each other).
