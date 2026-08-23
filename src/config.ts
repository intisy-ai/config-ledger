import { getAppConfigDir, loadConfig, makeWriteLog } from "@intisy-ai/core";
import type { CapabilitySchema } from "@intisy-ai/core";

// What each setting is called and how a surface renders it. Data the settings capability answers
// with, beside the values the manifest declares.
export const CONFIG_LEDGER_SETTINGS: CapabilitySchema = {
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
};

export function getConfig() { return loadConfig("config-ledger", getAppConfigDir()); }

export const writeLog = makeWriteLog("config-ledger");
