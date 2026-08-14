import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Pinned for EVERY test in this file, not just the real-git ones: this repo's path resolution reads
// the ambient home, and the failure-path tests below reach writeLog, which would otherwise open a
// log file inside the developer's real ~/.claude or ~/.config/opencode.
let ambient: string;

beforeEach(() => {
  ambient = mkdtempSync(join(tmpdir(), "cl-cap-amb-"));
  vi.stubEnv("HUB_CONFIG_DIR", ambient);
  mkdirSync(join(ambient, "config"), { recursive: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(ambient, { recursive: true, force: true });
});

/**
 * Re-imports the module under test after the home is pinned.
 *
 * @remarks
 * `src/config.ts` binds its logger to the ambient app home at import time, so a static import would
 * bind it before `beforeEach` pins `HUB_CONFIG_DIR` and error paths would log outside the temp home.
 */
async function load() {
  vi.resetModules();
  return import("./capabilities.js");
}

function fakeLedger(overrides: Record<string, unknown> = {}) {
  return {
    ensureRepo: vi.fn(),
    snapshots: () => [
      { hash: "aaaa111", date: "2026-08-13 10:00:00 +0200", subject: "auto: second" },
      { hash: "bbbb222", date: "2026-08-12 10:00:00 +0200", subject: "auto: first" },
    ],
    diffHead: () => [],
    commit: vi.fn(() => true),
    restore: vi.fn(() => 4),
    filesAt: vi.fn(() => ["settings.json", "plugins.json"]),
    profiles: { list: () => ["main"], current: () => "main", create: vi.fn(), switchTo: vi.fn(() => ({ ok: true })) },
    ...overrides,
  };
}

describe("the screens capability", () => {
  it("declares the one screen this plugin owns", async () => {
    const { configLedgerScreens } = await load();
    const specs = await configLedgerScreens("/home").screens();
    expect(specs.map((spec) => spec.id)).toEqual(["config"]);
  });

  it("reads a screen against the home the request names", async () => {
    const { configLedgerScreens } = await load();
    const open = vi.fn(() => fakeLedger() as never);
    const data = await configLedgerScreens("/plugin-home", { open }).read({ screenId: "config", home: "/asked-for" });
    expect(open).toHaveBeenCalledWith("/asked-for");
    expect(Object.keys(data.sources).sort()).toEqual(["history", "notice", "pending", "profiles", "summary"]);
  });

  it("falls back to its own home when a request names none", async () => {
    const { configLedgerScreens } = await load();
    const open = vi.fn(() => fakeLedger() as never);
    await configLedgerScreens("/plugin-home", { open }).read({ screenId: "config" });
    expect(open).toHaveBeenCalledWith("/plugin-home");
  });

  it("runs a screen action with the input the surface collected", async () => {
    const { configLedgerScreens } = await load();
    const ledger = fakeLedger();
    const result = await configLedgerScreens("/home", { open: () => ledger as never })
      .invoke({ screenId: "config", actionId: "restore", input: { id: "aaaa111" } });
    expect(ledger.restore).toHaveBeenCalledWith("aaaa111");
    expect(result).toEqual({ ok: true, message: "Restored 4 files", refresh: true });
  });
});

describe("the config-history capability", () => {
  it("reports snapshots newest first, with epoch timestamps and the files each covers", async () => {
    const { configLedgerHistory } = await load();
    const entries = await configLedgerHistory("/home", { open: () => fakeLedger() as never }).history();
    expect(entries).toEqual([
      { id: "aaaa111", ts: Date.parse("2026-08-13 10:00:00 +0200"), summary: "auto: second", files: ["settings.json", "plugins.json"] },
      { id: "bbbb222", ts: Date.parse("2026-08-12 10:00:00 +0200"), summary: "auto: first", files: ["settings.json", "plugins.json"] },
    ]);
  });

  it("honours a limit", async () => {
    const { configLedgerHistory } = await load();
    const entries = await configLedgerHistory("/home", { open: () => fakeLedger() as never }).history({ limit: 1 });
    expect(entries.map((entry) => entry.id)).toEqual(["aaaa111"]);
  });

  it("reads the home the query names, not the one it was bound to", async () => {
    const { configLedgerHistory } = await load();
    const open = vi.fn(() => fakeLedger() as never);
    await configLedgerHistory("/plugin-home", { open }).history({ home: "/asked-for" });
    expect(open).toHaveBeenCalledWith("/asked-for");
  });

  it("pages from a cursor, exclusive of the cursor itself", async () => {
    const { configLedgerHistory } = await load();
    const entries = await configLedgerHistory("/home", { open: () => fakeLedger() as never }).history({ cursor: "aaaa111" });
    expect(entries.map((entry) => entry.id)).toEqual(["bbbb222"]);
  });

  it("returns nothing for a cursor this home never had, rather than restarting the list", async () => {
    const { configLedgerHistory } = await load();
    const entries = await configLedgerHistory("/home", { open: () => fakeLedger() as never }).history({ cursor: "nope" });
    expect(entries).toEqual([]);
  });

  it("reports a home with no repo as empty rather than failing", async () => {
    const { configLedgerHistory } = await load();
    const open = () => { throw new Error("not a repo"); };
    expect(await configLedgerHistory("/home", { open }).history()).toEqual([]);
  });

  it("restores a snapshot into its own home and says how many files changed", async () => {
    const { configLedgerHistory } = await load();
    const ledger = fakeLedger();
    const open = vi.fn(() => ledger as never);
    const result = await configLedgerHistory("/plugin-home", { open }).restore("bbbb222");
    expect(open).toHaveBeenCalledWith("/plugin-home");
    expect(ledger.restore).toHaveBeenCalledWith("bbbb222");
    expect(result).toEqual({ ok: true, message: "Restored 4 files" });
  });

  it("reports a failed restore as a not-ok result instead of throwing", async () => {
    const { configLedgerHistory } = await load();
    const ledger = fakeLedger({ restore: vi.fn(() => { throw new Error("EACCES: permission denied"); }) });
    expect(await configLedgerHistory("/home", { open: () => ledger as never }).restore("bbbb222"))
      .toEqual({ ok: false, message: "EACCES: permission denied" });
  });
});

describe("the settings action runner", () => {
  it("runs a declared action against this plugin's own home", async () => {
    const { configLedgerActions } = await load();
    const open = vi.fn(() => fakeLedger() as never);
    const result = configLedgerActions("/plugin-home", { open })("commit", { reason: "before upgrade" });
    expect(open).toHaveBeenCalledWith("/plugin-home");
    expect(result).toEqual({ ok: true, refresh: true });
  });

  it("refuses an action it does not declare", async () => {
    const { configLedgerActions } = await load();
    expect(configLedgerActions("/home", { open: () => fakeLedger() as never })("nope"))
      .toEqual({ ok: false, message: "unknown action: nope" });
  });
});

describe("ensureDataRepo", () => {
  it("creates the data repo and snapshots it under the reason it was given", async () => {
    const { ensureDataRepo } = await load();
    const ledger = fakeLedger();
    ensureDataRepo("/home", "install", { open: () => ledger as never });
    expect(ledger.ensureRepo).toHaveBeenCalledTimes(1);
    expect(ledger.commit).toHaveBeenCalledWith("install");
  });

  it("never throws, because a lifecycle hook that throws quarantines the plugin", async () => {
    const { ensureDataRepo } = await load();
    const open = () => { throw new Error("not a repo"); };
    expect(() => ensureDataRepo("/home", "repair", { open })).not.toThrow();
  });
});

describe("against a real git repo", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "cl-cap-h-"));
    mkdirSync(join(home, "config"), { recursive: true });
    writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: true }));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it("seeds a home, then reports the seeded snapshot with the file it covers", async () => {
    const { configLedgerHistory, ensureDataRepo } = await load();
    ensureDataRepo(home, "install");
    const entries = await configLedgerHistory(home).history();
    expect(entries.length).toBe(1);
    expect(entries[0].summary).toContain("install");
    expect(entries[0].files).toContain("claude-code-loader.json");
    expect(entries[0].ts).toBeGreaterThan(0);
  });

  it("restores a snapshot's values back into the live config", async () => {
    const { configLedgerHistory, ensureDataRepo } = await load();
    ensureDataRepo(home, "install");
    writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: false }));
    const [seeded] = await configLedgerHistory(home).history();
    const result = await configLedgerHistory(home).restore(seeded.id);
    expect(result.ok).toBe(true);
    expect(JSON.parse(readFileSync(join(home, "config", "claude-code-loader.json"), "utf8")).providerRouting).toBe(true);
  });
});
