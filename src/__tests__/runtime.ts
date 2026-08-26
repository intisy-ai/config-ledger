// vi.resetModules() hands the next import a fresh module graph, and the engine's runtime seam is
// module state, so a test that resets has to install it again or the engine has none.
export async function installFreshRuntime(): Promise<void> {
  const { installCoreRuntime } = await import("../runtime-core.js");
  installCoreRuntime();
}
