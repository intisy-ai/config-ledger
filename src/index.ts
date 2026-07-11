// @ts-nocheck
// Plugin hook entry — exports ONLY the hook (+ activate); the library API lives
// in dist/lib.js since OpenCode runs every export as a hook. Filled out fully in
// a later task (CLI dispatch, auto-commit on load); this is the scaffold used to
// get the contract test's config round-trip green.
import { defineReadme, maybeRunReadmeCli, maybeRunConfigCli, deployCommands, configCommand } from "../core/src/index.js";
import { getConfig, writeLog } from "./config.js";

defineReadme({
  description: "Git-backed config management for the loader ecosystem: versioned, sanitized snapshots of an app home's config with history, rollback, and profiles.",
  dependencies: ["core"],
});

getConfig(); // register defaults before the CLI guard; writes no file on launch

if (maybeRunReadmeCli("config-git")) process.exit(0);
if (maybeRunConfigCli("config-git")) process.exit(0);
try { deployCommands("config-git", [configCommand("config-git")]); } catch { /* best-effort */ }

export const ConfigGitPlugin = async function () {
  return {};
};
export async function activate() { return ConfigGitPlugin(); }
export default ConfigGitPlugin;
