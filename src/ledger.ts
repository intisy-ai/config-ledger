// @ts-nocheck
import { repoFor } from "./repo.js";
import { autoCommit } from "./export.js";
import { diffAgainstHead, diffRefs } from "./diff.js";
import { restoreFromRef, rollbackKey, keyHistory } from "./importer.js";
import { profilesFor } from "./profiles.js";

// Commit list for one home's data repo, newest first, for a timeline UI.
export function listSnapshots(home?) {
  return repoFor(home).log();
}

// A handle bound to one app home, so a caller managing several homes holds one
// object per home instead of passing `home` to every call.
export function openLedger(home?) {
  const repo = repoFor(home);
  return {
    home,
    ensureRepo: () => repo.ensureRepo(),
    snapshots: () => listSnapshots(home),
    history: (file, key) => keyHistory(file, key, home),
    commit: (reason) => autoCommit(reason, home),
    diffHead: () => diffAgainstHead(home),
    diffRefs: (refA, refB) => diffRefs(refA, refB, home),
    restore: (ref) => restoreFromRef(ref, home),
    rollbackKey: (file, key, hash) => rollbackKey(file, key, hash, home),
    profiles: profilesFor(home),
  };
}
