// @ts-nocheck
// Plugin hook entry — exports ONLY the hook + activate (OpenCode runs every
// export as a hook); the library API lives in dist/lib.js.
import { defineReadme, maybeRunReadmeCli, deployCommands } from "@intisy-ai/core";
import { getConfig, writeLog } from "./config.js";
import { CONFIG_LEDGER_COMMANDS, maybeRunCli } from "./commands.js";
import { repo } from "./repo.js";
import { autoCommit } from "./export.js";

defineReadme({
  description: "Git-backed config management for the loader ecosystem: versioned, sanitized snapshots of an app home's config with history, rollback, and profiles.",
  commands: CONFIG_LEDGER_COMMANDS,
  dependencies: ["core"],
});
getConfig(); // register defaults before the CLI guard; writes no file on launch

if (maybeRunReadmeCli("config-ledger")) process.exit(0);
if (await maybeRunCli("config-ledger")) process.exit(0);
try { deployCommands("config-ledger", CONFIG_LEDGER_COMMANDS); } catch { /* best-effort */ }

// auto-commit local config changes on load (best-effort; only when a repo exists)
export const ConfigLedgerPlugin = async function () {
  try { if (repo.isRepo()) autoCommit("load"); } catch (e) { writeLog("load auto-commit failed: " + e, true); }
  return {};
};
// Under Claude Code the plugin-updater is the runtime and invokes activate()
// after each deploy; opencode also calls this (it runs every export as a hook).
export async function activate() { return ConfigLedgerPlugin(); }
export default ConfigLedgerPlugin;
