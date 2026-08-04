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
  return { profiles, setup };
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

  it("emits a profile_changed activity on a successful switch", async () => {
    const { profiles, setup } = await load();
    const { readActivity } = await import("../core/src/index.js");
    setup.initAndSeed();
    profiles.create("work");
    profiles.switchTo("work");

    const { records } = readActivity([dir], { topics: ["config.profile_changed"] });
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe("profile_changed");
    expect(records[0].subject?.id).toBe("work");
    expect(records[0].subject?.label).toBe("work");
  });
});
