// Universal plugin contract via basekit's shared test-kit.
import { runPluginContract } from "@intisy-ai/basekit/testing";

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
