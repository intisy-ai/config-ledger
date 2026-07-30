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
  // Never rewrite a file we could not parse: that would discard every other
  // setting in it. Abort instead so the caller sees the failure.
  let obj;
  try { obj = JSON.parse(readFileSync(p, "utf8")); }
  catch { throw new Error(`cannot roll back ${file}: current file is missing or not valid JSON`); }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`cannot roll back ${file}: its root is not a JSON object`);
  }
  const parts = key.split(".");
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    if (!node[seg] || typeof node[seg] !== "object" || Array.isArray(node[seg])) node[seg] = {};
    node = node[seg];
  }
  const leaf = parts[parts.length - 1];
  // The key did not exist at that commit, so restoring it means removing it now,
  // not writing an undefined that JSON.stringify would silently drop anyway.
  if (val === undefined) delete node[leaf];
  else node[leaf] = val;
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return autoCommit("rollback " + file + ":" + key);
}
