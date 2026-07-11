# config-git

[![npm version](https://img.shields.io/npm/v/config-git)](https://www.npmjs.com/package/config-git)
[![npm downloads](https://img.shields.io/npm/dm/config-git)](https://www.npmjs.com/package/config-git)
[![CI](https://img.shields.io/github/actions/workflow/status/intisy-ai/config-git/publish.yml)](https://github.com/intisy-ai/config-git/actions)

Git-backed config management for the loader ecosystem: versioned, sanitized snapshots of an app home's config with history, rollback, and profiles.

## Installation

### Via plugin-updater (recommended)

```bash
npx plugin-updater@latest init https://github.com/intisy-ai/config-git
```

### Via npm

```bash
npm install config-git
```

## Configuration

Config file: `<configDir>/config/config-git.json` (edit via the loader or `/config-git-config set`).

```json
{
  "secrets": "exclude",
  "logging": true
}
```

| Key | Default |
| --- | --- |
| `secrets` | `"exclude"` |
| `logging` | `true` |

## Commands

| Command | Description | Arguments |
| --- | --- | --- |
| `/config-git-config` | View and change config-git configuration | `list | get <key> | set <key> <value>` |
| `/config-git` | Git-backed config: status/commit/push/pull/history/profile/setup |  |

## Dependencies

- `core`

## Logging

Logs are written to `<configDir>/logs/YYYY-MM-DD/config-git-HH-MM-SS.log` and are toggled by
this plugin's `logging` config (default on). Console mirroring is global, off by default,
and controlled by the shared `config/settings.json` `logConsole` flag.

## License

MIT.
