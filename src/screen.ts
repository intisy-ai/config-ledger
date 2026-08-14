import type { ScreenSpec } from "@intisy-ai/core";

export const SCREEN_SOURCES = ["summary", "notice", "pending", "history", "profiles"] as const;

export const CONFIG_LEDGER_SCREEN: ScreenSpec = {
  id: "config",
  label: "Config",
  glyph: "⌥",
  order: 40,
  refreshOn: ["config.", "sync."],
  layout: {
    kind: "stack",
    children: [
      { kind: "stats", source: "summary" },
      { kind: "banner", source: "notice", tone: "warn" },
      {
        kind: "card",
        title: "Pending changes",
        children: [
          { kind: "form", fields: [{ key: "reason", type: "string", label: "Snapshot note", placeholder: "Optional" }], submit: "commit" },
          { kind: "table", source: "pending", groupBy: "file", empty: "No uncommitted changes.", columns: [
            { key: "key", tone: "mono" },
            { key: "old", tone: "old", truncate: 72 },
            { key: "new", tone: "new", truncate: 72 },
          ] },
        ],
      },
      {
        kind: "card",
        title: "History",
        children: [
          { kind: "list", source: "history", rowActions: ["restore"], empty: "No snapshots yet. Take one to start tracking changes.",
            item: { title: "subject", subtitle: "date", badge: "short" } },
        ],
      },
      {
        kind: "card",
        title: "Profiles",
        children: [
          { kind: "chips", source: "profiles", select: "profileSwitch" },
          { kind: "form", fields: [{ key: "name", type: "string", label: "New profile", placeholder: "Name" }], submit: "profileCreate" },
        ],
      },
    ],
  },
};
