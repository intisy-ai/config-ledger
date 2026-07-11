// Universal plugin contract via core's shared test-kit.
import { runPluginContract } from "../../core/src/testing.js";

runPluginContract({
  name: "config-git",
  entry: "dist/index.js",
  configName: "config-git",
  app: "both",
  commands: ["config-git", "config-git-config"],
  deploy: "load",
  actions: [["status"]],
  readme: true,
});
