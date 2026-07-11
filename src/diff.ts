// @ts-nocheck
import { snapshotLive } from "./export.js";
import { repo } from "./repo.js";
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

export function diffAgainstHead() {
  const mode = getConfig().secrets === "include" ? "include" : "exclude";
  const live = snapshotLive(mode);
  const names = new Set([...trackedConfigFiles(), ...Object.keys(live)]);
  const rows = [];
  for (const file of names) {
    const liveFlat = flatten(parse(live[file]));
    const headText = repo.showFileAtRef("HEAD", file);
    const headFlat = flatten(parse(headText));
    const keys = new Set([...Object.keys(liveFlat), ...Object.keys(headFlat)]);
    for (const key of keys) {
      const o = headFlat[key], n = liveFlat[key];
      if (String(o) !== String(n)) rows.push({ file, key, old: show(o), new: show(n) });
    }
  }
  return rows.sort((a, b) => (a.file + a.key).localeCompare(b.file + b.key));
}
