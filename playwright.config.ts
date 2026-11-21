import { createServer } from "node:net";
import { defineConfig } from "@playwright/test";

// Picked once by the runner; worker processes inherit it through the environment.
process.env.E2E_PORT ??= await new Promise<string>((resolve) => {
  const probe = createServer().listen(0, () => {
    const { port } = probe.address() as { port: number };
    probe.close(() => resolve(String(port)));
  });
});
const port = process.env.E2E_PORT;

export default defineConfig({
  testDir: "tests/e2e",
  // Not *.test.ts or *.spec.ts, so Vitest does not collect these.
  testMatch: "*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20_000,
    // Software GL, so the 3D scene draws without a GPU.
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: {
    // Serves client/dist: run "npm run build" first ("npm run test:e2e" does).
    command: "node --import tsx server/main.ts",
    // Instant bots and no turn clock: the tests wait on server state, and pacing would only make them slower. No walkers:
    // they would stroll through pictures and stand on spots the tests stand on (tests/e2e/bots.e2e.ts runs its own).
    env: { PORT: port, BOT_DELAY_MS: "0", TURN_SECONDS: "0", WALKERS: "0" },
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
