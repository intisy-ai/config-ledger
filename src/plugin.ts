import type { Plugin, PluginContext } from "@intisy/bayonet";
import type { ConfigHistoryCapability, ScreensCapability, SettingsCapability } from "@intisy-ai/basekit";
import { configLedgerActions, configLedgerHistory, configLedgerScreens, ensureDataRepo } from "./capabilities.js";
import { CONFIG_LEDGER_SETTINGS } from "./config.js";
import { setLedgerRuntime, type LedgerRuntime } from "./runtime.js";

/**
 * The engine's runtime, answered by this plugin's context.
 *
 * @remarks
 * An error is logged at error level and anything else at info, because the context's logger
 * separates them where this engine passes a flag.
 */
function contextRuntime(context: PluginContext): LedgerRuntime {
  return {
    home: () => context.paths.home,
    config: () => context.config.all(),
    log: (message, isError) => (isError ? context.log.error(message) : context.log.info(message)),
    emit: ({ topic, ...payload }) => context.events.publish(context.topic(topic), payload),
  };
}

/**
 * What an in-process host loads: the api plugin this bundle's default export carries.
 *
 * @remarks
 * Each key is minted from the id the manifest already declares, and each payload type is a
 * type-only import, so nothing but the api is linked. A throwing action needs no wrapper here: the
 * host bounds every capability call and turns a throw into a failed result carrying its message.
 */
const plugin: Plugin = {
  activate(context: PluginContext) {
    setLedgerRuntime(contextRuntime(context));
    const home = context.paths.home;
    const runAction = configLedgerActions(home);
    context.provide(context.capability<ScreensCapability>("screens"), configLedgerScreens(home));
    context.provide(context.capability<ConfigHistoryCapability>("config-history"), configLedgerHistory(home));
    context.provide(context.capability<SettingsCapability>("settings"), {
      schema: () => CONFIG_LEDGER_SETTINGS,
      run: async (actionId: string, input?: Record<string, unknown>) => runAction(actionId, input),
    });
  },
  deactivate() {},
  install(context: PluginContext) {
    setLedgerRuntime(contextRuntime(context));
    ensureDataRepo(context.paths.home, "install");
  },
  repair(context: PluginContext) {
    setLedgerRuntime(contextRuntime(context));
    ensureDataRepo(context.paths.home, "repair");
  },
};

export default plugin;
