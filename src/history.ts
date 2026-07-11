// @ts-nocheck
import { repo } from "./repo.js";
import { flatten } from "./diff.js";

function valueAt(hash, file, key) {
  const text = repo.showFileAtRef(hash, file);
  if (text == null) return undefined;
  try { return flatten(JSON.parse(text))[key]; } catch { return undefined; }
}

export function keyHistory(file, key) {
  const commits = repo.log(file);
  const out = [];
  let last = Symbol("none");
  for (const c of commits) {
    const value = valueAt(c.hash, file, key);
    if (String(value) !== String(last)) { out.push({ hash: c.hash, date: c.date, value }); last = value; }
  }
  return out;
}
export { valueAt };
