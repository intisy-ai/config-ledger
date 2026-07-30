import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir: string;
const cfgPath = () => join(dir, "config", "claude-code-loader.json");
const live = () => JSON.parse(readFileSync(cfgPath(), "utf8"));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-prof-"));
  vi.stubEnv("HUB_CONFIG_DIR", dir);
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(cfgPath(), JSON.stringify({ providerRouting: true }));
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

async function load() {
  vi.resetModules();
  const { profiles } = await import("./profiles.js");
  const { setup } = { setup: await import("./setup.js") };
  const { drain } = await import("../core/src/index.js");
  return { profiles, setup, drain };
}

describe("profile switch applies to live config", () => {
  it("checks out the branch AND rewrites live config from it", async () => {
    const { profiles, setup } = await load();
    setup.initAndSeed();                                   // main: providerRouting=true
    profiles.create("work");
    profiles.switchTo("work");
    writeFileSync(cfgPath(), JSON.stringify({ providerRouting: false }));
    const { autoCommit } = await import("./export.js");
    autoCommit("work-tweak");                              // work: providerRouting=false

    const back = profiles.switchTo("main");
    expect(back.ok).toBe(true);
    expect(profiles.current()).toBe("main");
    expect(live().providerRouting).toBe(true);             // main's value applied to live
  });

  it("refuses to switch while live has uncommitted changes", async () => {
    const { profiles, setup } = await load();
    setup.initAndSeed();
    profiles.create("work");
    writeFileSync(cfgPath(), JSON.stringify({ providerRouting: false }));  // uncommitted drift

    const res = profiles.switchTo("work");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/uncommitted/i);
    expect(profiles.current()).toBe("main");               // no switch happened
  });

  it("publishes config.profile_changed on a successful switch", async () => {
    const { profiles, setup, drain } = await load();
    setup.initAndSeed();
    profiles.create("work");
    profiles.switchTo("work");

    const events: { topic: string; payload: { profile?: string } }[] = [];
    drain("prof-test", (e: typeof events[number]) => events.push(e));
    const evt = events.find((e) => e.topic === "config.profile_changed");
    expect(evt).toBeTruthy();
    expect(evt!.payload.profile).toBe("work");
  });
});
