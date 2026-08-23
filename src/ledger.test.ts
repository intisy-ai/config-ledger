import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { installFreshRuntime } from "./__tests__/runtime.js";

let ambient: string, home: string;
function seed(dir: string, cfg: unknown) {
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "claude-code-loader.json"), JSON.stringify(cfg));
}
beforeEach(() => {
  ambient = mkdtempSync(join(tmpdir(), "cl-amb-"));
  home = mkdtempSync(join(tmpdir(), "cl-h-"));
  vi.stubEnv("HUB_CONFIG_DIR", ambient);
  mkdirSync(join(ambient, "config"), { recursive: true });
  seed(home, { providerRouting: true });
});
afterEach(() => { vi.unstubAllEnvs(); for (const d of [ambient, home]) rmSync(d, { recursive: true, force: true }); });

describe("snapshot API + openLedger", () => {
  it("lists snapshots newest-first with subjects", async () => {
    vi.resetModules();
  await installFreshRuntime();
    const { openLedger } = await import("./ledger.js");
    const led = openLedger(home);
    led.ensureRepo();
    led.commit("first");
    writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    led.commit("second");
    const snaps = led.snapshots();
    expect(snaps.length).toBe(2);
    expect(snaps[0].subject).toContain("second");
    expect(snaps[1].subject).toContain("first");
    expect(typeof snaps[0].hash).toBe("string");
  });

  it("diffs two snapshots", async () => {
    vi.resetModules();
  await installFreshRuntime();
    const { openLedger } = await import("./ledger.js");
    const led = openLedger(home);
    led.ensureRepo();
    led.commit("v1");
    writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    led.commit("v2");
    const [newer, older] = led.snapshots();
    const rows = led.diffRefs(older.hash, newer.hash);
    const row = rows.find((r) => r.key === "providerRouting");
    expect(row).toBeTruthy();
    expect(row!.old).toBe("true");
    expect(row!.new).toBe("false");
  });

  it("restores live config from a chosen snapshot", async () => {
    vi.resetModules();
  await installFreshRuntime();
    const { openLedger } = await import("./ledger.js");
    const led = openLedger(home);
    led.ensureRepo();
    led.commit("v1");                          // providerRouting=true
    writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    led.commit("v2");
    const v1 = led.snapshots()[1].hash;
    led.restore(v1);
    expect(JSON.parse(readFileSync(join(home, "config", "claude-code-loader.json"), "utf8")).providerRouting).toBe(true);
  });
});
