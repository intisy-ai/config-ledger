import { openLedger } from "./ledger.js";
import { CONFIG_LEDGER_SCREEN } from "./screen.js";

interface Deps {
  open?: (home: string) => ReturnType<typeof openLedger>;
}

export interface InvokeResult {
  ok: boolean;
  message?: string;
  refresh?: boolean;
}

const SHORT_HASH = 7;

function text(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

export function screenData(screenId: string, home: string, deps: Deps = {}): { sources: Record<string, unknown> } {
  if (screenId !== CONFIG_LEDGER_SCREEN.id) return { sources: {} };
  const open = deps.open ?? openLedger;
  // A home with no data repo yet, or a git hiccup, is an empty screen rather than an error:
  // the other homes on the same surface must still render.
  try {
    const ledger = open(home);
    const pending = ledger.diffHead();
    const profiles = ledger.profiles.list();
    const current = ledger.profiles.current();
    return {
      sources: {
        summary: [
          { id: "pending", label: "Pending", value: pending.length },
          { id: "snapshots", label: "Snapshots", value: ledger.snapshots().length },
          { id: "profile", label: "Profile", value: current || "none" },
        ],
        notice: "",
        pending: pending.map((row) => ({ id: `${row.file}:${row.key}`, ...row })),
        history: ledger.snapshots().map((snap) => ({ id: snap.hash, short: snap.hash.slice(0, SHORT_HASH), subject: snap.subject, date: snap.date })),
        profiles: profiles.map((name) => ({ id: name, label: name, current: name === current })),
      },
    };
  } catch {
    return { sources: { summary: [], notice: "", pending: [], history: [], profiles: [] } };
  }
}

export function screenInvoke(actionId: string, home: string, args: Record<string, unknown>, deps: Deps = {}): InvokeResult {
  const open = deps.open ?? openLedger;
  // Mirrors screenData's catch: an unusable action (a bad --home, a disk/permission
  // error mid-write) must come back as a renderable failure, not an unhandled throw
  // that leaves stdout empty and the host with nothing to parse.
  try {
    const ledger = open(home);
    if (actionId === "commit") {
      ledger.ensureRepo();
      ledger.commit(text(args, "reason") || "manual snapshot");
      return { ok: true, refresh: true };
    }
    if (actionId === "restore") {
      const ref = text(args, "id");
      if (!ref) return { ok: false, message: "Pick a snapshot on the Config screen to restore." };
      const count = ledger.restore(ref);
      return { ok: true, message: `Restored ${count} files`, refresh: true };
    }
    if (actionId === "profileCreate") {
      const name = text(args, "name");
      if (!name) return { ok: false, message: "Enter a profile name on the Config screen." };
      ledger.ensureRepo();
      ledger.profiles.create(name);
      return { ok: true, refresh: true };
    }
    if (actionId === "profileSwitch") {
      const profile = text(args, "id");
      if (!profile) return { ok: false, message: "Pick a profile on the Config screen to switch to." };
      const result = ledger.profiles.switchTo(profile);
      return result.ok ? { ok: true, refresh: true } : { ok: false, message: result.reason ?? "Could not switch profile.", refresh: true };
    }
    return { ok: false, message: `unknown action: ${actionId}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error), refresh: true };
  }
}

// stdout carries the JSON answer and nothing else: it is the host's only channel.
export async function maybeRunUiCli(): Promise<boolean> {
  const [verb, kind, id] = process.argv.slice(2);
  if (verb !== "ui" || (kind !== "data" && kind !== "invoke")) return false;
  const flag = (name: string): string => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] ?? "" : "";
  };
  const home = flag("home");
  let args: Record<string, unknown> = {};
  try { args = JSON.parse(flag("args") || "{}"); } catch { args = {}; }
  const answer = kind === "data" ? screenData(id, home) : screenInvoke(id, home, args);
  process.stdout.write(JSON.stringify(answer));
  return true;
}
