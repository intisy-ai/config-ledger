import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { installFreshRuntime } from "./__tests__/runtime.js";

let ambient: string, homeA: string, homeB: string;

function seed(home: string, value: unknown) {
  mkdirSync(join(home, "config"), { recursive: true });
  writeFileSync(join(home, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: value }));
}
function liveOf(home: string) {
  return JSON.parse(readFileSync(join(home, "config", "claude-code-loader.json"), "utf8"));
}

beforeEach(() => {
  ambient = mkdtempSync(join(tmpdir(), "cl-ambient-"));
  homeA = mkdtempSync(join(tmpdir(), "cl-a-"));
  homeB = mkdtempSync(join(tmpdir(), "cl-b-"));
  vi.stubEnv("HUB_CONFIG_DIR", ambient);
  mkdirSync(join(ambient, "config"), { recursive: true });
  seed(homeA, "A");
  seed(homeB, "B");
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const d of [ambient, homeA, homeB]) rmSync(d, { recursive: true, force: true });
});
async function fresh() {
  vi.resetModules();
  await installFreshRuntime(); }

describe("multi-home scoping", () => {
  it("keeps each home's data repo independent", async () => {
    await fresh();
    const { autoCommit } = await import("./export.js");
    const { repoFor } = await import("./repo.js");
    repoFor(homeA).ensureRepo();
    repoFor(homeB).ensureRepo();
    autoCommit("seed", homeA);
    autoCommit("seed", homeB);
    expect(repoFor(homeA).log().length).toBe(1);
    expect(repoFor(homeB).log().length).toBe(1);
    expect(repoFor(homeA).showFileAtRef("HEAD", "claude-code-loader.json")).toContain('"A"');
    expect(repoFor(homeB).showFileAtRef("HEAD", "claude-code-loader.json")).toContain('"B"');
  });

  it("restores a home's live config from its own history without touching the other home", async () => {
    await fresh();
    const { autoCommit } = await import("./export.js");
    const { restoreFromRef } = await import("./importer.js");
    const { repoFor } = await import("./repo.js");
    repoFor(homeA).ensureRepo();
    autoCommit("v1", homeA);                       // homeA: providerRouting="A"
    writeFileSync(join(homeA, "config", "claude-code-loader.json"), JSON.stringify({ providerRouting: "A2" }));
    restoreFromRef("HEAD", homeA);                 // back to "A"
    expect(liveOf(homeA).providerRouting).toBe("A");
    expect(liveOf(homeB).providerRouting).toBe("B"); // untouched
  });

  it("defaults home to the ambient app config dir for parity", async () => {
    await fresh();
    const { autoCommit } = await import("./export.js");
    const { repo } = await import("./repo.js");
    writeFileSync(join(ambient, "config", "settings.json"), JSON.stringify({ theme: "dark" }));
    repo.ensureRepo();
    expect(autoCommit("ambient")).toBe(true);
    expect(repo.showFileAtRef("HEAD", "settings.json")).toContain("dark");
  });
});
