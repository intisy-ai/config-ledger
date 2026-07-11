// @ts-nocheck
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { configFolder, trackedConfigFiles } from "./paths.js";
import { repo } from "./repo.js";
import { autoCommit } from "./export.js";
import { valueAt } from "./history.js";
export { keyHistory } from "./history.js";

// Whole-file writes; the caller is responsible for having shown/approved the
// diff first (enforced at the UI/CLI layer, not here).
export function importFromHead() {
  let n = 0;
  const names = trackedConfigFiles();
  for (const name of names) {
    const text = repo.showFileAtRef("HEAD", name);
    if (text == null) continue;
    writeFileSync(join(configFolder(), name), text, "utf8");
    n++;
  }
  return n;
}

export function rollbackKey(file, key, hash) {
  const val = valueAt(hash, file, key);
  const p = join(configFolder(), file);
  let obj;
  try { obj = JSON.parse(readFileSync(p, "utf8")); } catch { obj = {}; }
  const parts = key.split(".");
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
  node[parts[parts.length - 1]] = val;
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return autoCommit("rollback " + file + ":" + key);
}
