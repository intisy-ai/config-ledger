// @ts-nocheck
import { defineConfig, makeWriteLog } from "../core/src/index.js";

export const CONFIG_DEFAULTS = { secrets: "exclude", logging: true };
export function getConfig() { return defineConfig("config-ledger", CONFIG_DEFAULTS); }
export const writeLog = makeWriteLog("config-ledger");
