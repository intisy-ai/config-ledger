// @ts-nocheck
// A caller naming no home gets whoever is running this bundle: core's resolved config dir for the
// program half, the plugin's own home for the plugin half. Resolving it here instead would drop
// core's HUB_CONFIG_DIR -> HUB_CLAUDE_DIR/HUB_OPENCODE_DIR -> app-native -> homedir chain, which is
// also what isolates the shared contract test from the real ~/.claude and ~/.config/opencode.
import { join } from "path";
import { readdirSync } from "fs";
import { ledgerRuntime } from "./runtime.js";

// `home` scopes every path to one app config dir. Omit it and the running host's own home is used,
// so single-home callers behave unchanged; Cairn passes an explicit home per app it manages.
export function configDir(home?) {
  return home || ledgerRuntime().home();
}
export function configFolder(home?) { return join(configDir(home), "config"); }
export function dataRepoDir(home?) { return join(configDir(home), "repos", "config-ledger-data"); }

// files under config/ that must NEVER enter the repo (secret stores + volatile)
export const TRACKED_DENYLIST = new Set([
  "accounts.json", "auth.json", "core-auth-accounts.json", "core-auth-proxies.json",
]);

// dotted secret-field paths stripped from tracked files when secrets:"exclude"
export const SECRET_FIELDS = {
  "core-auth.json": ["leaderboard.apiKey"],
  "claude-code-loader.json": [],
  "settings.json": [],
};

// tracked config file NAMES: every config/*.json minus the denylist, + plugins.json.
// readdirSync(configFolder()) is non-recursive, so cache/ and logs/ (siblings of
// config/, not files inside it) never appear here in the first place.
export function trackedConfigFiles(home?) {
  const out = [];
  try {
    for (const f of readdirSync(configFolder(home))) {
      if (!f.endsWith(".json")) continue;
      if (TRACKED_DENYLIST.has(f)) continue;
      out.push(f);
    }
  } catch {}
  return out.sort();
}
