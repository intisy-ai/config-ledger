import { describe, it, expect } from "vitest";
import { CONFIG_LEDGER_SCREEN, SCREEN_SOURCES } from "./screen.js";

function kinds(node: any, out: string[] = []): string[] {
  out.push(node.kind);
  for (const child of node.children ?? []) kinds(child, out);
  return out;
}

function sources(node: any, out: string[] = []): string[] {
  if (typeof node.source === "string") out.push(node.source);
  for (const child of node.children ?? []) sources(child, out);
  return out;
}

describe("the config-ledger screen", () => {
  it("declares a nav entry with an id and a label", () => {
    expect(CONFIG_LEDGER_SCREEN.id).toBe("config");
    expect(CONFIG_LEDGER_SCREEN.label).toBe("Config");
  });

  it("refreshes on config and sync activity instead of polling", () => {
    expect(CONFIG_LEDGER_SCREEN.refreshOn).toEqual(["config.", "sync."]);
  });

  it("lays out a summary, a pending table, a history list and profile chips", () => {
    const present = kinds(CONFIG_LEDGER_SCREEN.layout);
    expect(present).toContain("stats");
    expect(present).toContain("table");
    expect(present).toContain("list");
    expect(present).toContain("chips");
    expect(present).toContain("form");
  });

  it("names every source it renders, and nothing it cannot supply", () => {
    expect(new Set(sources(CONFIG_LEDGER_SCREEN.layout))).toEqual(new Set(SCREEN_SOURCES));
  });
});
