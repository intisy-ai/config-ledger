import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
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
  await installFreshRuntime(); return await import("./importer.js"); }
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

  it("records a rolled-back key as a normalized config change, with an origin", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { readActivity } = await import("@intisy-ai/basekit");
    repo.ensureRepo();
    const f = join(dir, "config", "claude-code-loader.json");
    writeFileSync(f, JSON.stringify({ providerRouting: true }));
    autoCommit("v1");
    const v1 = repo.log("claude-code-loader.json")[0].hash;
    writeFileSync(f, JSON.stringify({ providerRouting: false }));
    autoCommit("v2");
    expect(rollbackKey("claude-code-loader.json", "providerRouting", v1)).toBe(true);

    const { records } = readActivity([dir], { topics: ["config.changed"] });
    const rec = records.find((r) => r.details.key === "providerRouting");
    expect(rec).toBeDefined();
    expect(rec!.action).toBe("config_changed");
    expect(rec!.outcome).toBe("ok");
    expect(rec!.source).toBe("config-ledger");
    // a raw publish carries no origin at all, so this is what proves the channel changed
    expect(rec!.origin.home).toBe(dir);
    expect(rec!.details.file).toBe("claude-code-loader.json");
  });

  it("records a restored file as a normalized config change, with an origin", async () => {
    const { importFromHead } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { readActivity } = await import("@intisy-ai/basekit");
    repo.ensureRepo();
    autoCommit("v1");
    writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    expect(importFromHead()).toBeGreaterThan(0);

    const { records } = readActivity([dir], { topics: ["config.changed"] });
    const rec = records.find((r) => r.details.file === "claude-code-loader.json");
    expect(rec).toBeDefined();
    expect(rec!.action).toBe("config_changed");
    expect(rec!.origin.home).toBe(dir);
    expect(rec!.details.ref).toBe("HEAD");
  });

  it("emits a snapshot_committed activity when a commit is made", async () => {
    await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { readActivity } = await import("@intisy-ai/basekit");
    repo.ensureRepo();
    expect(autoCommit("snap-reason")).toBe(true);

    const { records } = readActivity([dir], { topics: ["config.snapshot"] });
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe("snapshot_committed");
    expect(records[0].details.reason).toBe("snap-reason");
    expect(typeof records[0].subject?.id).toBe("string");
    expect((records[0].subject!.id as string).length).toBeGreaterThan(0);
  });

  it("publishes config.changed when rolling a key back", async () => {
    const { rollbackKey } = await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    const { keyHistory } = await import("./history.js");
    const { drain } = await import("@intisy-ai/basekit");
    repo.ensureRepo();
    autoCommit("v1");
    writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    autoCommit("v2");
    const older = keyHistory("claude-code-loader.json", "providerRouting").find((h) => String(h.value) === "true");
    rollbackKey("claude-code-loader.json", "providerRouting", older.hash);

    const events: { topic: string; payload: { details?: { file?: string } } }[] = [];
    drain("cl-changed", (e: typeof events[number]) => events.push(e));
    expect(events.some((e) => e.topic === "config.changed" && e.payload.details?.file === "claude-code-loader.json")).toBe(true);
  });
});
