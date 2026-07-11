// @ts-nocheck
import { existsSync, mkdirSync } from "fs";
import { dataRepoDir } from "./paths.js";
import { git } from "./git.js";

const DATA_BRANCH = "main";
function repoPath() { return dataRepoDir(); }

function ensureRepo() {
  const p = repoPath();
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  if (!isRepo()) {
    git(["init", "-b", DATA_BRANCH], p);
    // local identity ONLY for this shadow repo — never global, never --author on commits
    git(["config", "user.email", "config-git@local"], p);
    git(["config", "user.name", "config-git"], p);
  }
}
function isRepo() { return git(["rev-parse", "--is-inside-work-tree"], repoPath()).code === 0; }
function hasRemote() { return git(["remote"], repoPath()).stdout.split(/\s+/).filter(Boolean).includes("origin"); }
function getRemote() { const r = git(["remote", "get-url", "origin"], repoPath()); return r.code === 0 ? r.stdout.trim() : ""; }
function setRemote(url) { if (hasRemote()) git(["remote", "set-url", "origin", url], repoPath()); else git(["remote", "add", "origin", url], repoPath()); }

function commitAll(message) {
  const p = repoPath();
  git(["add", "-A"], p);
  const status = git(["status", "--porcelain"], p).stdout.trim();
  if (!status) return false;
  return git(["commit", "-m", message], p).code === 0;
}
function currentBranch() { return git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath()).stdout.trim(); }
function listBranches() {
  return git(["branch", "--format=%(refname:short)"], repoPath()).stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}
function createBranch(name) { git(["branch", name], repoPath()); }
function checkoutBranch(name) { git(["checkout", name], repoPath()); }
function showFileAtRef(ref, relPath) {
  const r = git(["show", ref + ":" + relPath], repoPath());
  return r.code === 0 ? r.stdout : null;
}
function log(relPath) {
  const args = ["log", "--pretty=format:%H\t%ad\t%s", "--date=iso"];
  if (relPath) args.push("--", relPath);
  const r = git(args, repoPath());
  if (r.code !== 0) return [];
  return r.stdout.split("\n").filter(Boolean).map((line) => {
    const [hash, date, ...rest] = line.split("\t");
    return { hash, date, subject: rest.join("\t") };
  });
}
function push() { const r = git(["push", "-u", "origin", currentBranch()], repoPath()); return { ok: r.code === 0, message: r.code === 0 ? "pushed" : (r.stderr || "push failed") }; }
function pull() { const r = git(["pull", "--rebase", "origin", currentBranch()], repoPath()); return { ok: r.code === 0, message: r.code === 0 ? "pulled" : (r.stderr || "pull failed") }; }

export const repo = { repoPath, ensureRepo, isRepo, hasRemote, getRemote, setRemote, commitAll, currentBranch, listBranches, createBranch, checkoutBranch, showFileAtRef, log, push, pull };
