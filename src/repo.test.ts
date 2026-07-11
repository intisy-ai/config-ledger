import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cfggit-")); vi.stubEnv("HUB_CONFIG_DIR", dir); mkdirSync(join(dir, "config"), { recursive: true }); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

async function fresh() { vi.resetModules(); return await import("./repo.js"); }

describe("shadow repo", () => {
  it("inits, commits, and reads a file back at HEAD", async () => {
    const { repo } = await fresh();
    repo.ensureRepo();
    expect(repo.isRepo()).toBe(true);
    writeFileSync(join(repo.repoPath(), "x.json"), '{"a":1}');
    expect(repo.commitAll("first")).toBe(true);
    expect(repo.showFileAtRef("HEAD", "x.json")).toContain('"a"');
    expect(repo.commitAll("noop")).toBe(false);   // nothing changed
  });
  it("creates and switches branches", async () => {
    const { repo } = await fresh();
    repo.ensureRepo();
    writeFileSync(join(repo.repoPath(), "x.json"), "{}");
    repo.commitAll("init");
    repo.createBranch("work");
    repo.checkoutBranch("work");
    expect(repo.currentBranch()).toBe("work");
    expect(repo.listBranches()).toContain("main");
  });
});
