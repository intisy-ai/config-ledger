// @ts-nocheck
// Cross-app slash-commands for config-git plus the CLI actions behind them.
// Mirrors sync-bridge/src/commands.ts: `config` is forwarded to core's
// runConfigCli directly (no separate maybeRunConfigCli call in index.ts).
import { runConfigCli, configCommand } from "../core/src/index.js";
import { repo } from "./repo.js";
import { autoCommit } from "./export.js";
import { diffAgainstHead } from "./diff.js";
import { importFromHead } from "./importer.js";
import { keyHistory } from "./history.js";
import { profiles } from "./profiles.js";
import * as setup from "./setup.js";

export const CONFIG_GIT_COMMANDS = [
  configCommand("config-git"),
  {
    name: "config-git",
    description: "Git-backed config: status/commit/push/pull/history/profile/setup",
    shell: 'node "{{BUNDLE}}" status',
    body: "Above is the config-git status (setting-level diff vs the last commit). Summarize what changed.",
  },
];

export async function maybeRunCli(pluginName) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd) return false;
  if (cmd === "config") { runConfigCli(pluginName, argv.slice(1)); return true; }
  if (!["status", "commit", "push", "pull", "history", "profile", "setup", "import"].includes(cmd)) return false;
  if (cmd === "setup") {
    setup.initAndSeed();
    if (argv[1]) setup.setRemote(argv[1]);
    process.stdout.write("config-git repo ready" + (argv[1] ? " (remote set)" : "") + "\n");
    return true;
  }
  repo.ensureRepo();
  if (cmd === "status") { for (const r of diffAgainstHead()) process.stdout.write(`${r.file} · ${r.key}: ${r.old} -> ${r.new}\n`); return true; }
  if (cmd === "commit") { process.stdout.write(autoCommit("manual") ? "committed\n" : "nothing to commit\n"); return true; }
  if (cmd === "push") { const x = repo.push(); process.stdout.write(x.message + "\n"); return true; }
  if (cmd === "pull") { const x = repo.pull(); process.stdout.write(x.message + "\n"); return true; }
  if (cmd === "import") { process.stdout.write("imported " + importFromHead() + " files\n"); return true; }
  if (cmd === "history") { for (const h of keyHistory(argv[1], argv[2])) process.stdout.write(`${h.date} ${h.hash.slice(0, 7)} ${h.value}\n`); return true; }
  if (cmd === "profile") {
    if (argv[1]) {
      if (!profiles.list().includes(argv[1])) profiles.create(argv[1]);
      profiles.switchTo(argv[1]);
      process.stdout.write("profile: " + profiles.current() + "\n");
    } else {
      for (const b of profiles.list()) process.stdout.write((b === profiles.current() ? "* " : "  ") + b + "\n");
    }
    return true;
  }
  return false;
}
