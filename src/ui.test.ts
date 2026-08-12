import { describe, it, expect, vi } from "vitest";
import { screenData, screenInvoke } from "./ui.js";

function fakeLedger(overrides: Record<string, unknown> = {}) {
  return {
    ensureRepo: vi.fn(),
    snapshots: () => [{ hash: "a1b2c3d4e5", date: "2026-08-11", subject: "manual snapshot" }],
    diffHead: () => [{ file: "settings.json", key: "theme", old: "dark", new: "light" }],
    commit: vi.fn(() => true),
    restore: vi.fn(() => 12),
    profiles: { list: () => ["main", "work"], current: () => "main", create: vi.fn(), switchTo: vi.fn(() => ({ ok: true })) },
    ...overrides,
  };
}

describe("screenData", () => {
  it("supplies every source the screen declares", () => {
    const { sources } = screenData("config", "/home", { open: () => fakeLedger() as never });
    expect(Object.keys(sources).sort()).toEqual(["history", "notice", "pending", "profiles", "summary"]);
  });

  it("shortens a snapshot hash for the badge and keeps the full one as the row id", () => {
    const { sources } = screenData("config", "/home", { open: () => fakeLedger() as never });
    expect(sources.history).toEqual([{ id: "a1b2c3d4e5", short: "a1b2c3d", subject: "manual snapshot", date: "2026-08-11" }]);
  });

  it("marks the current profile as selected", () => {
    const { sources } = screenData("config", "/home", { open: () => fakeLedger() as never });
    expect(sources.profiles).toEqual([{ id: "main", label: "main", current: true }, { id: "work", label: "work", current: false }]);
  });

  it("returns empty sources for an unknown screen rather than throwing", () => {
    expect(screenData("nope", "/home", { open: () => fakeLedger() as never }).sources).toEqual({});
  });

  it("reports a home with no repo as empty rather than failing", () => {
    const open = () => { throw new Error("not a repo"); };
    expect(screenData("config", "/home", { open }).sources.history).toEqual([]);
  });
});

describe("screenInvoke", () => {
  it("commits with the submitted note and asks for a refresh", () => {
    const ledger = fakeLedger();
    const result = screenInvoke("commit", "/home", { reason: "before upgrade" }, { open: () => ledger as never });
    expect(ledger.commit).toHaveBeenCalledWith("before upgrade");
    expect(result).toEqual({ ok: true, refresh: true });
  });

  it("falls back to a default note when none was typed", () => {
    const ledger = fakeLedger();
    screenInvoke("commit", "/home", { reason: "  " }, { open: () => ledger as never });
    expect(ledger.commit).toHaveBeenCalledWith("manual snapshot");
  });

  it("restores by the row id and reports how many files changed", () => {
    const ledger = fakeLedger();
    const result = screenInvoke("restore", "/home", { id: "a1b2c3d4e5" }, { open: () => ledger as never });
    expect(ledger.restore).toHaveBeenCalledWith("a1b2c3d4e5");
    expect(result).toEqual({ ok: true, message: "Restored 12 files", refresh: true });
  });

  it("surfaces a refused profile switch as a reason, not a throw", () => {
    const ledger = fakeLedger({ profiles: { list: () => [], current: () => "main", create: vi.fn(), switchTo: () => ({ ok: false, reason: "uncommitted config changes" }) } });
    expect(screenInvoke("profileSwitch", "/home", { id: "work" }, { open: () => ledger as never }))
      .toEqual({ ok: false, message: "uncommitted config changes", refresh: true });
  });

  it("rejects an unknown action", () => {
    expect(screenInvoke("nope", "/home", {}, { open: () => fakeLedger() as never }))
      .toEqual({ ok: false, message: "unknown action: nope" });
  });
});
