import type {
  ActionResult,
  ConfigHistoryCapability,
  HistoryEntry,
  HistoryQuery,
  ScreenActionRequest,
  ScreenData,
  ScreenDataRequest,
  ScreenSpec,
  ScreensCapability,
} from "@intisy-ai/api";
import { openLedger } from "./ledger.js";
import { CONFIG_LEDGER_SCREEN } from "./screen.js";
import { screenData, screenInvoke } from "./ui.js";
import { writeLog } from "./config.js";

/** How many snapshots one unbounded page of history carries. */
const DEFAULT_HISTORY_LIMIT = 50;

/** The one seam every capability here reaches its data through, so a test needs no git repository. */
export interface Deps {
  /** Opens the ledger bound to one home. */
  open?: (home: string) => ReturnType<typeof openLedger>;
}

function ledgerFor(home: string, deps: Deps): ReturnType<typeof openLedger> {
  return (deps.open ?? openLedger)(home);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The navigation entry this plugin contributes, and the data and actions behind it.
 *
 * @param home - the home this plugin was activated in, used when a request names none
 */
export function configLedgerScreens(home: string, deps: Deps = {}): ScreensCapability {
  return {
    screens: (): ScreenSpec[] => [CONFIG_LEDGER_SCREEN],
    read: async (request: ScreenDataRequest): Promise<ScreenData> =>
      screenData(request.screenId, request.home || home, deps),
    invoke: async (request: ScreenActionRequest): Promise<ActionResult> =>
      screenInvoke(request.actionId, request.home || home, request.input ?? {}, deps),
  };
}

/**
 * The recorded configuration snapshots of a home, and putting one back.
 *
 * @remarks
 * A home with no data repository yet, or a git that answered badly, is an empty history rather than
 * a failure: a surface reading several homes must still render the others. Paging is exclusive of
 * the cursor, and a cursor this home never had yields nothing rather than silently restarting from
 * the newest entry.
 *
 * @param home - the home `restore` acts on, and the default for `history`
 */
export function configLedgerHistory(home: string, deps: Deps = {}): ConfigHistoryCapability {
  return {
    history: async (query?: HistoryQuery): Promise<HistoryEntry[]> => {
      const target = query?.home || home;
      try {
        const ledger = ledgerFor(target, deps);
        const all = ledger.snapshots();
        const cursor = query?.cursor;
        const at = cursor ? all.findIndex((snapshot) => snapshot.hash === cursor) : -1;
        if (cursor && at < 0) return [];
        const limit = query?.limit && query.limit > 0 ? query.limit : DEFAULT_HISTORY_LIMIT;
        return all.slice(at + 1, at + 1 + limit).map((snapshot) => ({
          id: snapshot.hash,
          ts: Date.parse(snapshot.date) || 0,
          summary: snapshot.subject,
          files: ledger.filesAt(snapshot.hash),
        }));
      } catch (error) {
        writeLog(`history for ${target} could not be read: ${messageOf(error)}`, true);
        return [];
      }
    },
    restore: async (entryId: string): Promise<ActionResult> => {
      try {
        const count = ledgerFor(home, deps).restore(entryId);
        return { ok: true, message: `Restored ${count} files` };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      }
    },
  };
}

/**
 * Runs one of the actions `src/config.ts` declares, for the `settings` capability.
 *
 * @remarks
 * The same actions the screen offers, against this plugin's own home: a settings surface has no
 * per-home request the way a screen does.
 */
export function configLedgerActions(home: string, deps: Deps = {}) {
  return (actionId: string, input?: Record<string, unknown>): ActionResult =>
    screenInvoke(actionId, home, input ?? {}, deps);
}

/**
 * Gives a home a data repository with one snapshot in it.
 *
 * @remarks
 * Serves both lifecycle hooks: `ensureRepo` is idempotent and `commit` writes nothing when nothing
 * changed, so running it again costs a git status. It never throws, because a lifecycle hook that
 * throws quarantines the plugin and a home that cannot hold a git repository should cost this
 * plugin's history, not its settings and its screen.
 *
 * @param reason - what the resulting snapshot is recorded as
 */
export function ensureDataRepo(home: string, reason: string, deps: Deps = {}): void {
  try {
    const ledger = ledgerFor(home, deps);
    ledger.ensureRepo();
    ledger.commit(reason);
  } catch (error) {
    writeLog(`could not prepare the data repo for ${home}: ${messageOf(error)}`, true);
  }
}
