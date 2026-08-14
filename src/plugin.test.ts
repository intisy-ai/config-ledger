import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { validateManifest } from "../core/api/dist/index.js";
import plugin from "./plugin.js";
import type { PluginContext } from "../core/api/dist/index.js";

const manifest = JSON.parse(readFileSync(new URL("../plugin.json", import.meta.url), "utf-8"));

function fakeContext(home: string): { context: PluginContext; provided: Map<string, unknown> } {
  const provided = new Map<string, unknown>();
  const context = {
    manifest,
    host: { app: "claude", api: 1, surfaces: ["tui"] },
    config: { all: () => ({}), get: () => undefined, set: async () => {} },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    paths: { home, repos: `${home}/repos`, plugin: `${home}/plugin`, cache: `${home}/cache`, config: `${home}/config` },
    services: { register: vi.fn(), get: vi.fn(), want: vi.fn(), watch: vi.fn() },
    events: { publish: vi.fn(), subscribe: vi.fn() },
    provide: (id: string, implementation: unknown) => { provided.set(id, implementation); },
  } as unknown as PluginContext;
  return { context, provided };
}

describe("plugin.json", () => {
  it("is a valid manifest", () => {
    expect(validateManifest(manifest)).toEqual([]);
  });

  it("keeps its id equal to the repository and clone directory name", () => {
    expect(manifest.id).toBe("config-ledger");
  });

  it("declares exactly the capabilities activate provides", () => {
    const { context, provided } = fakeContext("/home");
    plugin.activate(context);
    expect([...provided.keys()].sort()).toEqual([...manifest.capabilities].sort());
  });

  it("declares only the lifecycle hooks the entry exports", () => {
    expect(manifest.lifecycle).toEqual({ install: true, repair: true });
    expect(typeof plugin.install).toBe("function");
    expect(typeof plugin.repair).toBe("function");
  });
});

describe("the provided implementations", () => {
  it("gives each capability the shape its contract requires", () => {
    const { context, provided } = fakeContext("/home");
    plugin.activate(context);
    const screens = provided.get("screens") as Record<string, unknown>;
    const history = provided.get("config-history") as Record<string, unknown>;
    const settings = provided.get("settings") as Record<string, unknown>;
    expect(["screens", "read", "invoke"].every((key) => typeof screens[key] === "function")).toBe(true);
    expect(["history", "restore"].every((key) => typeof history[key] === "function")).toBe(true);
    expect(["schema", "run"].every((key) => typeof settings[key] === "function")).toBe(true);
  });

  it("answers the settings schema with the fields and actions src/config.ts declares", async () => {
    const { context, provided } = fakeContext("/home");
    plugin.activate(context);
    const schema = await (provided.get("settings") as { schema: () => Promise<Record<string, unknown>> }).schema();
    expect((schema.fields as { key: string }[]).map((field) => field.key)).toEqual(["secrets", "logging"]);
    expect((schema.actions as { id: string }[]).map((action) => action.id))
      .toEqual(["commit", "restore", "profileCreate", "profileSwitch"]);
  });

  it("no longer carries screens on the settings declaration, which the screens capability owns", async () => {
    const { context, provided } = fakeContext("/home");
    plugin.activate(context);
    const schema = await (provided.get("settings") as { schema: () => Promise<Record<string, unknown>> }).schema();
    expect(schema.screens).toBeUndefined();
  });

  it("deactivates without throwing", async () => {
    await expect(Promise.resolve(plugin.deactivate())).resolves.toBeUndefined();
  });
});
