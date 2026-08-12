// @ts-nocheck
import { defineConfig, defineCapabilities, makeWriteLog } from "@intisy-ai/core";
import { CONFIG_LEDGER_SCREEN } from "./screen.js";

export const CONFIG_DEFAULTS = { secrets: "exclude", logging: true };
export function getConfig() { return defineConfig("config-ledger", CONFIG_DEFAULTS); }

defineCapabilities("config-ledger", {
  fields: [
    { key: "secrets", type: "select", label: "Secrets handling", description: "How secret values are treated in snapshots.", group: "General", options: [{ value: "exclude", label: "Exclude" }, { value: "include", label: "Include" }] },
    { key: "logging", type: "boolean", label: "Logging", group: "General" },
  ],
  actions: [
    { id: "commit", label: "Snapshot", description: "Record the current config as a snapshot.", args: [{ key: "reason", type: "string", label: "Note" }] },
    { id: "restore", label: "Restore", confirm: "Restore this app's live config to the selected snapshot? Uncommitted changes will be overwritten.", danger: true },
    { id: "profileCreate", label: "Create", args: [{ key: "name", type: "string", label: "Profile name" }] },
    { id: "profileSwitch", label: "Switch" },
  ],
  screens: [CONFIG_LEDGER_SCREEN],
});

export const writeLog = makeWriteLog("config-ledger");
