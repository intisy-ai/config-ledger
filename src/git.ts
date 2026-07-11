// @ts-nocheck
import { execFileSync } from "child_process";

export function git(args, cwd) {
  try {
    const stdout = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout: stdout || "", stderr: "" };
  } catch (e) {
    return { code: e.status || 1, stdout: (e.stdout && e.stdout.toString()) || "", stderr: (e.stderr && e.stderr.toString()) || String(e.message || e) };
  }
}
