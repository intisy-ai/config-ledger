// @ts-nocheck
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { configFolder, trackedConfigFiles } from "./paths.js";
import { repoFor } from "./repo.js";
import { autoCommit } from "./export.js";
import { valueAt } from "./history.js";
import { emitEvent, TOPICS } from "../core/src/index.js";
export { keyHistory } from "./history.js";

// Whole-file writes; the caller is responsible for having shown/approved the
// diff first (enforced at the UI/CLI layer, not here). ref is any committish in
// the home's data repo (HEAD, a commit hash, a branch name).
export function restoreFromRef(ref, home?) {
  let n = 0;
  const repo = repoFor(home);
  for (const name of trackedConfigFiles(home)) {
    const text = repo.showFileAtRef(ref, name);
    if (text == null) continue;
    writeFileSync(join(configFolder(home), name), text, "utf8");
    emitEvent({
      topic: TOPICS.configChanged,
      action: "config_changed",
      impact: "notice",
      outcome: "ok",
      subject: { kind: "config-file", id: name, label: name },
      details: { file: name, ref, message: `Restored ${name} from ${ref}` },
    }, "config-ledger");
    n++;
  }
  return n;
}

export function importFromHead(home?) { return restoreFromRef("HEAD", home); }

export function rollbackKey(file, key, hash, home?) {
  const val = valueAt(hash, file, key, home);
  const p = join(configFolder(home), file);
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
  emitEvent({
    topic: TOPICS.configChanged,
    action: "config_changed",
    impact: "notice",
    outcome: "ok",
    subject: { kind: "config-key", id: key, label: `${file}:${key}` },
    details: { file, key, ref: hash, message: `Rolled ${file}:${key} back to ${hash}` },
  }, "config-ledger");
  return autoCommit("rollback " + file + ":" + key, home);
}
