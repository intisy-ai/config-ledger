// @ts-nocheck
import { execFileSync } from "child_process";
import { repo } from "./repo.js";
import { autoCommit } from "./export.js";
import { git } from "./git.js";

export function initAndSeed() { repo.ensureRepo(); return autoCommit("seed"); }
export function setRemote(url) { repo.ensureRepo(); repo.setRemote(url); return repo.getRemote(); }
export function ghAvailable() {
  try { return execFileSync("gh", ["--version"], { stdio: ["ignore", "pipe", "ignore"] }) != null; } catch { return false; }
}
export function ghCreatePrivate(name) {
  if (!ghAvailable()) return { ok: false, message: "gh not available" };
  git(["-C", repo.repoPath(), "rev-parse"], repo.repoPath());   // ensure repo exists
  try {
    execFileSync("gh", ["repo", "create", name, "--private", "--source", repo.repoPath(), "--remote", "origin", "--push"], { stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, url: repo.getRemote() };
  } catch (e) { return { ok: false, message: (e.stderr && e.stderr.toString()) || String(e.message || e) }; }
}
