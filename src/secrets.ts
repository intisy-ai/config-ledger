// @ts-nocheck
import { SECRET_FIELDS } from "./paths.js";

function deleteDotted(obj, path) {
  const parts = path.split(".");
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node || typeof node !== "object") return;
    node = node[parts[i]];
  }
  if (node && typeof node === "object") delete node[parts[parts.length - 1]];
}

export function stripSecretFields(fileName, obj) {
  const fields = SECRET_FIELDS[fileName];
  const clone = JSON.parse(JSON.stringify(obj));
  if (!fields || !fields.length) return clone;
  for (const path of fields) deleteDotted(clone, path);
  return clone;
}

export function sanitizeForRepo(fileName, text, mode) {
  if (mode === "include") return text;
  let obj;
  try { obj = JSON.parse(text); } catch { return text; }
  return JSON.stringify(stripSecretFields(fileName, obj), null, 2);
}
