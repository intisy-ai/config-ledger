import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cfggit-")); vi.stubEnv("HUB_CONFIG_DIR", dir);
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: true }));
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
async function fresh() { vi.resetModules(); return await import("./importer.js"); }
function liveCfg() { return JSON.parse(readFileSync(join(dir, "config", "claude-code-loader.json"), "utf8")); }

describe("importer + history", () => {
  it("rolls a key back to an earlier commit value", async () => {
    const { rollbackKey, keyHistory } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    autoCommit("v1");   // providerRouting=true
    writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    autoCommit("v2");   // providerRouting=false
    const hist = keyHistory("claude-code-loader.json", "providerRouting");
    expect(hist.length).toBeGreaterThanOrEqual(2);
    const older = hist.find((h) => String(h.value) === "true");
    expect(older).toBeTruthy();
    expect(rollbackKey("claude-code-loader.json", "providerRouting", older.hash)).toBe(true);
    expect(liveCfg().providerRouting).toBe(true);   // restored
  });
});
