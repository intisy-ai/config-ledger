import type { ActivitySpec } from "@intisy-ai/basekit";

/** What this plugin reports to the activity ledger. */
export type LedgerActivity = Pick<ActivitySpec, "topic" | "action" | "impact" | "outcome" | "subject" | "details">;

/**
 * What the ledger engine takes from whoever is running it.
 *
 * @remarks
 * This bundle runs two ways: as a program (its CLI and its README generator) and as a plugin a host
 * activates. Taking the home, the settings and the ledger by injection rather than by import is
 * what lets the plugin half reach them through its context, so the module graph behind the plugin
 * links nothing but the api.
 */
export interface LedgerRuntime {
  /** The home a caller naming none acts on. */
  home(): string;
  /** This plugin's settings, defaults merged with what the home changed. */
  config(): Record<string, unknown>;
  log(message: string, isError?: boolean): void;
  emit(activity: LedgerActivity): void;
}

// The ids basekit registers for these topics. Named here because a plugin publishes a topic by id and
// nothing mints one for it; a rename in basekit's registry has to be mirrored here.
export const LEDGER_TOPICS = {
  configChanged: "config.changed",
  configSnapshot: "config.snapshot",
  configProfileChanged: "config.profile_changed",
};

let RUNTIME: LedgerRuntime | null = null;

export function setLedgerRuntime(runtime: LedgerRuntime): void {
  RUNTIME = runtime;
}

/**
 * The installed runtime.
 *
 * @remarks
 * Throws rather than falling back to an inert one: every path here writes to a home, and guessing
 * which would put a snapshot in the wrong one.
 */
export function ledgerRuntime(): LedgerRuntime {
  if (!RUNTIME) throw new Error("config-ledger: no runtime installed");
  return RUNTIME;
}
