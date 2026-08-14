import { createSettingsCapability } from "@intisy-ai/core";
import type { Plugin, PluginContext } from "@intisy-ai/api";
import { configLedgerActions, configLedgerHistory, configLedgerScreens, ensureDataRepo } from "./capabilities.js";
// Registers this plugin's config defaults and its settings declaration, which schema() reads back.
import "./config.js";

const PLUGIN_ID = "config-ledger";

/** What an in-process host loads: the api plugin this bundle's default export carries. */
const plugin: Plugin = {
  activate(context: PluginContext) {
    const home = context.paths.home;
    context.provide("screens", configLedgerScreens(home));
    context.provide("config-history", configLedgerHistory(home));
    context.provide("settings", createSettingsCapability(PLUGIN_ID, configLedgerActions(home)));
  },
  deactivate() {},
  install(context: PluginContext) {
    ensureDataRepo(context.paths.home, "install");
  },
  repair(context: PluginContext) {
    ensureDataRepo(context.paths.home, "repair");
  },
};

export default plugin;
