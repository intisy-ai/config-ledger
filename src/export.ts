// @ts-nocheck
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { configFolder, trackedConfigFiles } from "./paths.js";
import { sanitizeForRepo } from "./secrets.js";
import { repoFor } from "./repo.js";
import { getConfig } from "./config.js";
import { emitEvent, TOPICS } from "../core/src/index.js";

export function snapshotLive(mode, home?) {
  const out = {};
  for (const name of trackedConfigFiles(home)) {
    const p = join(configFolder(home), name);
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    out[name] = sanitizeForRepo(name, text, mode);
  }
  return out;
}

export function exportLive(home?) {
  const mode = getConfig().secrets === "include" ? "include" : "exclude";
  const snap = snapshotLive(mode, home);
  const rp = repoFor(home).repoPath();
  // write current tracked files
  for (const [name, text] of Object.entries(snap)) writeFileSync(join(rp, name), text, "utf8");
  // remove repo files whose live source no longer exists (ignore .git)
  for (const f of readdirSync(rp)) {
    if (f === ".git" || !f.endsWith(".json")) continue;
    if (!(f in snap)) { try { unlinkSync(join(rp, f)); } catch {} }
  }
  return Object.keys(snap).length;
}

export function autoCommit(reason, home?) {
  exportLive(home);
  const repo = repoFor(home);
  const committed = repo.commitAll("auto: " + reason);
  if (committed) {
    const head = repo.log()[0];
    const hash = head ? head.hash : "";
    emitEvent({ topic: TOPICS.configSnapshot, action: "snapshot_committed", impact: "notice", outcome: "ok", subject: { kind: "snapshot", id: hash }, details: { reason, files: trackedConfigFiles(home) } }, "config-ledger");
  }
  return committed;
}
