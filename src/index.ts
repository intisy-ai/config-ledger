// @ts-nocheck
// Plugin hook entry: OpenCode runs every export as a hook, and an api host reads the default export.
// The library API lives in dist/lib.js.
import { defineReadme, maybeRunReadmeCli, deployCommands } from "@intisy-ai/core";
import { getConfig, writeLog } from "./config.js";
import { CONFIG_LEDGER_COMMANDS, maybeRunCli } from "./commands.js";
import { repo } from "./repo.js";
import { autoCommit } from "./export.js";
import { maybeRunUiCli } from "./ui.js";

defineReadme({
  description: "Git-backed config management for the loader ecosystem: versioned, sanitized snapshots of an app home's config with history, rollback, and profiles.",
  architecture: `flowchart TD
    subgraph Host [In-process plugin host]
        SIDECAR[plugin.json sidecar]
        ACTIVATE[activate ctx]
    end

    subgraph Provided [Capabilities supplied at activate]
        SCREENS[screens: the Config screen]
        HISTORY[config-history: snapshots and restore]
        SETTINGS[settings: fields and actions]
    end

    subgraph Store [Git-backed store]
        EXPORT[exportLive: sanitize then write]
        DATA[(repos/config-ledger-data)]
        RESTORE[restoreFromRef: write back]
    end

    LIVE[config/*.json]

    SIDECAR --> ACTIVATE
    ACTIVATE --> SCREENS
    ACTIVATE --> HISTORY
    ACTIVATE --> SETTINGS
    SCREENS --> EXPORT
    SETTINGS --> EXPORT
    HISTORY --> DATA
    LIVE --> EXPORT
    EXPORT --> DATA
    DATA --> RESTORE
    RESTORE --> LIVE`,
  structure: {
    src: [
      "TypeScript source: the git-backed ledger, the capability implementations (`capabilities.ts`), the api plugin (`plugin.ts`), and the slash-command CLI",
      "`plugin.json`: the manifest an in-process host reads before importing this bundle",
      "`core/` git submodule ([`intisy-ai/core`](https://github.com/intisy-ai/core)): shared config, logging, app detection, and the settings-capability adapter, bundled into `dist/` by esbuild",
    ],
    dist: [
      "`dist/index.js` (the hook entry and the module an in-process host imports; not committed)",
      "`dist/lib.js` (the library surface other tools import; not committed)",
    ],
  },
  commands: CONFIG_LEDGER_COMMANDS,
  dependencies: ["core"],
});
getConfig(); // register defaults before the CLI guard; writes no file on launch

if (maybeRunReadmeCli("config-ledger")) process.exit(0);
if (await maybeRunUiCli()) process.exit(0);
if (await maybeRunCli("config-ledger")) process.exit(0);
try { deployCommands("config-ledger", CONFIG_LEDGER_COMMANDS); } catch { /* best-effort */ }

// auto-commit local config changes on load (best-effort; only when a repo exists)
export const ConfigLedgerPlugin = async function () {
  try { if (repo.isRepo()) autoCommit("load"); } catch (e) { writeLog("load auto-commit failed: " + e, true); }
  return {};
};
export async function activate() { return ConfigLedgerPlugin(); }
// ConfigLedgerPlugin and activate stay exported too: OpenCode invokes every exported function, while an api host reads the default.
export { default } from "./plugin.js";
