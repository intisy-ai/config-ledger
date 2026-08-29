import { build } from "esbuild";
const common = { bundle: true, external: ["@intisy-ai/basekit", "@intisy-ai/api"], platform: "node", format: "esm", target: "node20", logLevel: "info" };
await build({ ...common, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });
await build({ ...common, entryPoints: ["src/lib.ts"], outfile: "dist/lib.js" });
console.log("Bundled config-ledger -> dist/index.js (hook) + dist/lib.js (library)");
