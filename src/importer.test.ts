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

  it("aborts instead of wiping the file when the live copy is not valid JSON", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    autoCommit("v1");
    const corrupt = "{ not valid json";
    writeFileSync(join(dir, "config", "claude-code-loader.json"), corrupt);
    expect(() => rollbackKey("claude-code-loader.json", "providerRouting", "HEAD")).toThrow();
    expect(readFileSync(join(dir, "config", "claude-code-loader.json"), "utf8")).toBe(corrupt);
  });

  it("replaces a non-object intermediate instead of crashing", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    const f = join(dir, "config", "claude-code-loader.json");
    writeFileSync(f, JSON.stringify({ a: { b: 1 } }));
    autoCommit("v1");
    const v1 = repo.log("claude-code-loader.json")[0].hash;
    writeFileSync(f, JSON.stringify({ a: "no-longer-an-object" }));
    expect(() => rollbackKey("claude-code-loader.json", "a.b", v1)).not.toThrow();
    expect(liveCfg().a).toEqual({ b: 1 });
  });

  it("removes a key that did not exist at the target commit", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    repo.ensureRepo();
    const f = join(dir, "config", "claude-code-loader.json");
    writeFileSync(f, JSON.stringify({ x: 1 }));
    autoCommit("v1");
    const v1 = repo.log("claude-code-loader.json")[0].hash;
    writeFileSync(f, JSON.stringify({ x: 1, y: 2 }));
    autoCommit("v2");
    expect(rollbackKey("claude-code-loader.json", "y", v1)).toBe(true);
    expect("y" in liveCfg()).toBe(false);
    expect(liveCfg().x).toBe(1);
  });

  it("publishes config.snapshot when a commit is made", async () => {
    await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { drain } = await import("../core/src/index.js");
    repo.ensureRepo();
    expect(autoCommit("snap-reason")).toBe(true);

    const events: { topic: string; payload: { reason?: string; hash?: string } }[] = [];
    drain("cl-snap", (e: typeof events[number]) => events.push(e));
    const snap = events.find((e) => e.topic === "config.snapshot");
    expect(snap).toBeTruthy();
    expect(snap!.payload.reason).toBe("snap-reason");
    expect(typeof snap!.payload.hash).toBe("string");
    expect(snap!.payload.hash!.length).toBeGreaterThan(0);
  });

  it("publishes config.changed when rolling a key back", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { keyHistory } = await import("./history.js");
    const { drain } = await import("../core/src/index.js");
    repo.ensureRepo();
    autoCommit("v1");
    writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    autoCommit("v2");
    const older = keyHistory("claude-code-loader.json", "providerRouting").find((h) => String(h.value) === "true");
    rollbackKey("claude-code-loader.json", "providerRouting", older.hash);

    const events: { topic: string; payload: { name?: string } }[] = [];
    drain("cl-changed", (e: typeof events[number]) => events.push(e));
    expect(events.some((e) => e.topic === "config.changed" && e.payload.name === "claude-code-loader.json")).toBe(true);
  });
});
