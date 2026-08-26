// The runtime the program half installs: this plugin's CLI and its README generator run with no
// host, so they take the home, the settings and the ledger from core directly.
import { emitEvent, getAppConfigDir, loadConfig, makeWriteLog } from "@intisy-ai/core";
import { setLedgerRuntime, type LedgerRuntime } from "./runtime.js";

const NAME = "config-ledger";

export function coreRuntime(): LedgerRuntime {
  const writeLog = makeWriteLog(NAME);
  return {
    home: () => getAppConfigDir(),
    config: () => loadConfig(NAME, getAppConfigDir()) as Record<string, unknown>,
    log: (message, isError) => writeLog(message, isError),
    emit: (activity) => { emitEvent(activity, NAME); },
  };
}

export function installCoreRuntime(): void {
  setLedgerRuntime(coreRuntime());
}
