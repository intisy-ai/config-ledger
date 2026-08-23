// Universal plugin contract via core's shared test-kit.
import { runPluginContract } from "../../core/src/testing.js";

runPluginContract({
  name: "config-ledger",
  entry: "dist/index.js",
  configName: "config-ledger",
  app: "both",
  commands: ["config-ledger"],
  deploy: "load",
  actions: [["status"]],
  readme: true,
});
