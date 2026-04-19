# Agent Stuff

Personal pi coding agent extensions, skills, and themes. Split into two packages for use across personal and work machines.

Based on [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff).

## Structure

| Directory | Package | Purpose |
|-----------|---------|---------|
| `common/` | `trangelier-pi-common` | Shared extensions and skills — used everywhere |
| `personal/` | `trangelier-pi-personal` | Personal-only extensions and skills |

### Common Extensions

| Extension | Description |
|-----------|-------------|
| [`answer.ts`](common/extensions/answer.ts) | Interactive TUI for answering questions one by one |
| [`btw.ts`](common/extensions/btw.ts) | Side-chat popover with optional summary injection |
| [`context.ts`](common/extensions/context.ts) | Context breakdown with loaded-skill highlighting |
| [`control.ts`](common/extensions/control.ts) | Session control helpers |
| [`files.ts`](common/extensions/files.ts) | Unified file browser with git status and actions |
| [`loop.ts`](common/extensions/loop.ts) | Prompt loop for rapid iterative coding |
| [`multi-edit.ts`](common/extensions/multi-edit.ts) | Batch multi edits and Codex-style patch support |
| [`notify.ts`](common/extensions/notify.ts) | Native desktop notifications when agent finishes |
| [`prompt-editor.ts`](common/extensions/prompt-editor.ts) | In-editor prompt mode selector |
| [`todos.ts`](common/extensions/todos.ts) | Todo manager with file-backed storage and TUI |
| [`whimsical.ts`](common/extensions/whimsical.ts) | Random whimsical thinking messages |

### Common Skills

| Skill | Description |
|-------|-------------|
| [`librarian`](common/skills/librarian) | Cache and refresh remote git repositories |
| [`mermaid`](common/skills/mermaid) | Create and validate Mermaid diagrams |
| [`native-web-search`](common/skills/native-web-search) | Native web search with summaries |
| [`summarize`](common/skills/summarize) | Convert files/URLs to Markdown |
| [`tmux`](common/skills/tmux) | Drive tmux sessions via keystrokes and pane scraping |
| [`uv`](common/skills/uv) | Python dependency management with `uv` |
| [`web-browser`](common/skills/web-browser) | Browser automation via Chrome/Chromium CDP |

### Personal Extensions

| Extension | Description |
|-----------|-------------|
| [`review.ts`](personal/extensions/review.ts) | Code review command with multiple modes and fix loop |

### Personal Skills

| Skill | Description |
|-------|-------------|
| [`apple-mail`](personal/skills/apple-mail) | Search/read Apple Mail and extract attachments |
| [`commit`](personal/skills/commit) | Git commits with Conventional Commits |
| [`frontend-design`](personal/skills/frontend-design) | Design distinctive frontend interfaces |
| [`github`](personal/skills/github) | GitHub via `gh` CLI |
| [`google-workspace`](personal/skills/google-workspace) | Google Workspace APIs via local helpers |

## Installation

### Personal machine

Add both packages to `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "/path/to/agent-stuff/common",
    "/path/to/agent-stuff/personal"
  ]
}
```

### Work machine

Only install the common package (in `~/.pi/agent/settings.json` or per-project `.pi/settings.json`):

```json
{
  "packages": [
    "/path/to/agent-stuff/common"
  ]
}
```

## Development

```bash
cd common && npm install   # install dependencies (diff, etc.)
```

Extensions are loaded via [jiti](https://github.com/unjs/jiti) — TypeScript works without compilation.
