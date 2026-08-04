// @ts-nocheck
import { repoFor } from "./repo.js";
import { diffAgainstHead } from "./diff.js";
import { restoreFromRef } from "./importer.js";
import { trackedConfigFiles } from "./paths.js";
import { emitEvent, TOPICS } from "../core/src/index.js";

// Switching a profile means checking out that branch in the shadow repo AND
// applying its config to the live files. We refuse when live has uncommitted
// drift so a switch never silently discards unsaved edits; the caller commits
// or discards first.
function switchTo(name, home?) {
  if (diffAgainstHead(home).length > 0) {
    return { ok: false, reason: "uncommitted config changes; commit or discard before switching profiles" };
  }
  repoFor(home).checkoutBranch(name);
  const files = restoreFromRef("HEAD", home);
  emitEvent({ topic: TOPICS.configProfileChanged, action: "profile_changed", impact: "notice", subject: { kind: "profile", id: name, label: name }, details: { files: trackedConfigFiles(home) } }, "config-ledger");
  return { ok: true, profile: name, files };
}

export function profilesFor(home?) {
  const repo = repoFor(home);
  return {
    list: () => repo.listBranches(),
    current: () => repo.currentBranch(),
    create: (name) => repo.createBranch(name),
    switchTo: (name) => switchTo(name, home),
  };
}

export const profiles = profilesFor();
