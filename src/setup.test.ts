import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cfggit-")); vi.stubEnv("HUB_CONFIG_DIR", dir); mkdirSync(join(dir, "config"), { recursive: true }); writeFileSync(join(dir, "config", "plugins.json"), "[]"); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
async function fresh() { vi.resetModules(); return { setup: await import("./setup.js"), profiles: await import("./profiles.js") }; }

describe("setup + profiles", () => {
  it("initAndSeed creates a repo with a seed commit", async () => {
    const { setup, profiles } = await fresh();
    setup.initAndSeed();
    expect(profiles.current()).toBe("main");
    expect(profiles.list()).toContain("main");
  });
  it("create + switch profile", async () => {
    const { setup, profiles } = await fresh();
    setup.initAndSeed();
    profiles.create("work"); profiles.switchTo("work");
    expect(profiles.current()).toBe("work");
  });
});
