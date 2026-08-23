import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { installFreshRuntime } from "./__tests__/runtime.js";

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cfggit-")); vi.stubEnv("HUB_CONFIG_DIR", dir);
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: true }));
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
async function fresh() {
  vi.resetModules();
  await installFreshRuntime(); return await import("./diff.js"); }

describe("diff", () => {
  it("flatten produces dotted leaf keys", async () => {
    const { flatten } = await fresh();
    expect(flatten({ a: { b: 1 }, c: [1, 2] })).toEqual({ "a.b": 1, "c": "[1,2]" });
  });
  it("reports a changed setting after commit + live edit", async () => {
    const { diffAgainstHead } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    autoCommit("init");   // HEAD: providerRouting=true
    writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    const rows = diffAgainstHead();
    const row = rows.find((r) => r.key === "providerRouting");
    expect(row).toBeTruthy();
    expect(row.old).toBe("true");
    expect(row.new).toBe("false");
    expect(row.file).toBe("claude-code-loader.json");
  });
});
