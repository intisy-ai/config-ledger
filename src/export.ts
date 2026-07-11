// @ts-nocheck
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { configFolder, trackedConfigFiles } from "./paths.js";
import { sanitizeForRepo } from "./secrets.js";
import { repo } from "./repo.js";
import { getConfig } from "./config.js";

export function snapshotLive(mode) {
  const out = {};
  for (const name of trackedConfigFiles()) {
    const p = join(configFolder(), name);
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    out[name] = sanitizeForRepo(name, text, mode);
  }
  return out;
}

export function exportLive() {
  const mode = getConfig().secrets === "include" ? "include" : "exclude";
  const snap = snapshotLive(mode);
  const rp = repo.repoPath();
  // write current tracked files
  for (const [name, text] of Object.entries(snap)) writeFileSync(join(rp, name), text, "utf8");
  // remove repo files whose live source no longer exists (ignore .git)
  for (const f of readdirSync(rp)) {
    if (f === ".git" || !f.endsWith(".json")) continue;
    if (!(f in snap)) { try { unlinkSync(join(rp, f)); } catch {} }
  }
  return Object.keys(snap).length;
}

export function autoCommit(reason) {
  exportLive();
  return repo.commitAll("auto: " + reason);
}
