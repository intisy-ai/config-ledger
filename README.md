# config-ledger

[![npm version](https://img.shields.io/npm/v/config-ledger)](https://www.npmjs.com/package/config-ledger)
[![npm downloads](https://img.shields.io/npm/dm/config-ledger)](https://www.npmjs.com/package/config-ledger)
[![CI](https://img.shields.io/github/actions/workflow/status/intisy-ai/config-ledger/publish.yml)](https://github.com/intisy-ai/config-ledger/actions)

Git-backed config management for the loader ecosystem: versioned, sanitized snapshots of an app home's config with history, rollback, and profiles.

## Installation

### Via plugin-updater (recommended)

```bash
npx plugin-updater@latest init https://github.com/intisy-ai/config-ledger
```

### Via npm

```bash
npm install config-ledger
```

## Configuration

Config file: `<configDir>/config/config-ledger.json` (edit via the loader or `/config-ledger-config set`).

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
| `/config-ledger-config` | View and change config-ledger configuration | `list | get <key> | set <key> <value>` |
| `/config-ledger` | Git-backed config: status/commit/push/pull/history/profile/setup |  |

## Dependencies

- `core`

## Logging

Logs are written to `<configDir>/logs/YYYY-MM-DD/config-ledger-HH-MM-SS.log` and are toggled by
this plugin's `logging` config (default on). Console mirroring is global, off by default,
and controlled by the shared `config/settings.json` `logConsole` flag.

## License

MIT.
