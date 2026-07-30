// @ts-nocheck
import { snapshotLive } from "./export.js";
import { repoFor } from "./repo.js";
import { trackedConfigFiles } from "./paths.js";
import { getConfig } from "./config.js";

export function flatten(obj, prefix = "") {
  const out = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix || "(root)"] = Array.isArray(obj) ? JSON.stringify(obj) : obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

function parse(text) { try { return text == null ? {} : JSON.parse(text); } catch { return {}; }
}
const show = (v) => (v === undefined ? "(unset)" : String(v));

function diffRows(fileKeys, oldFlatOf, newFlatOf) {
  const rows = [];
  for (const file of fileKeys) {
    const oldFlat = oldFlatOf(file);
    const newFlat = newFlatOf(file);
    const keys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
    for (const key of keys) {
      const o = oldFlat[key], n = newFlat[key];
      if (String(o) !== String(n)) rows.push({ file, key, old: show(o), new: show(n) });
    }
  }
  return rows.sort((a, b) => (a.file + a.key).localeCompare(b.file + b.key));
}

export function diffAgainstHead(home?) {
  const mode = getConfig().secrets === "include" ? "include" : "exclude";
  const live = snapshotLive(mode, home);
  const repo = repoFor(home);
  const names = new Set([...trackedConfigFiles(home), ...Object.keys(live)]);
  return diffRows(
    names,
    (file) => flatten(parse(repo.showFileAtRef("HEAD", file))),
    (file) => flatten(parse(live[file])),
  );
}

// Compare two committed refs (hash/branch/HEAD) in the home's data repo, for a
// timeline UI. `old` holds refA's value, `new` holds refB's.
export function diffRefs(refA, refB, home?) {
  const repo = repoFor(home);
  const at = (ref, file) => flatten(parse(repo.showFileAtRef(ref, file)));
  const names = new Set([...repo.filesAtRef(refA), ...repo.filesAtRef(refB)]);
  return diffRows(names, (file) => at(refA, file), (file) => at(refB, file));
}
