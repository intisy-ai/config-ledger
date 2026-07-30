// @ts-nocheck
import { defineConfig, defineCapabilities, makeWriteLog } from "../core/src/index.js";

export const CONFIG_DEFAULTS = { secrets: "exclude", logging: true };
export function getConfig() { return defineConfig("config-ledger", CONFIG_DEFAULTS); }

defineCapabilities("config-ledger", {
  fields: [
    { key: "secrets", type: "select", label: "Secrets handling", description: "How secret values are treated in snapshots.", group: "General", options: [{ value: "exclude", label: "Exclude" }, { value: "include", label: "Include" }] },
    { key: "logging", type: "boolean", label: "Logging", group: "General" },
  ],
});

export const writeLog = makeWriteLog("config-ledger");
