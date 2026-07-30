// @ts-nocheck
// Config-dir resolution delegates to core's getAppConfigDir(), which already
// implements the HUB_CONFIG_DIR -> HUB_CLAUDE_DIR/HUB_OPENCODE_DIR -> app-native
// -> homedir fallback chain (see core/src/env.ts). This is a deliberate deviation
// from a hand-rolled HUB_CONFIG_DIR-only check: core's testing.ts isolates test
// homes via HUB_OPENCODE_DIR/HUB_CLAUDE_DIR (not HUB_CONFIG_DIR), so a hand-rolled
// version would leak into the real ~/.claude / ~/.config/opencode during the
// shared contract test. Re-implementing getAppConfigDir here would only drop
// fallbacks that the constraints doc's simplified description already implies.
import { join } from "path";
import { readdirSync } from "fs";
import { getAppConfigDir } from "../core/src/index.js";

// `home` scopes every path to one app config dir. Omit it and the current app's
// dir (getAppConfigDir) is used, so single-home callers behave unchanged; Cairn
// passes an explicit home per app it manages.
export function configDir(home?) {
  return home || getAppConfigDir();
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
