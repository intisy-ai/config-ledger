import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cfggit-")); vi.stubEnv("HUB_CONFIG_DIR", dir);
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "core-auth.json"), JSON.stringify({ leaderboard: { apiKey: "sk-secret" } }));
  writeFileSync(join(dir, "config", "accounts.json"), JSON.stringify({ token: "sk-oauth" }));  // denylisted
  writeFileSync(join(dir, "config", "plugins.json"), "[]");
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
async function fresh() { vi.resetModules(); return await import("./export.js"); }

describe("export", () => {
  it("copies tracked files, strips secrets, excludes the denylist", async () => {
    const { exportLive } = await fresh();
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    exportLive();
    expect(existsSync(join(repo.repoPath(), "core-auth.json"))).toBe(true);
    expect(existsSync(join(repo.repoPath(), "plugins.json"))).toBe(true);
    expect(existsSync(join(repo.repoPath(), "accounts.json"))).toBe(false);   // denylisted
    expect(readFileSync(join(repo.repoPath(), "core-auth.json"), "utf8")).not.toContain("sk-secret");
  });
  it("autoCommit commits then no-ops when unchanged", async () => {
    const { autoCommit } = await fresh();
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    expect(autoCommit("test")).toBe(true);
    expect(autoCommit("test")).toBe(false);
  });
});
