import { describe, it, expect } from "vitest";
import { stripSecretFields, sanitizeForRepo } from "./secrets.js";

describe("secret sanitizer", () => {
  it("strips a registered dotted field", () => {
    const out = stripSecretFields("core-auth.json", { leaderboard: { apiKey: "sk-x", source: "AA" }, other: 1 });
    expect(out.leaderboard.apiKey).toBeUndefined();
    expect(out.leaderboard.source).toBe("AA");
    expect(out.other).toBe(1);
  });
  it("leaves unregistered files untouched", () => {
    const out = stripSecretFields("plugins.json", { a: { apiKey: "keep" } });
    expect(out.a.apiKey).toBe("keep");
  });
  it("sanitizeForRepo exclude mode removes the field in serialized output", () => {
    const text = JSON.stringify({ leaderboard: { apiKey: "sk-x" } });
    const out = sanitizeForRepo("core-auth.json", text, "exclude");
    expect(out).not.toContain("sk-x");
  });
  it("sanitizeForRepo include mode returns text verbatim", () => {
    const text = JSON.stringify({ leaderboard: { apiKey: "sk-x" } });
    expect(sanitizeForRepo("core-auth.json", text, "include")).toBe(text);
  });
});
