import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** The comfort settings a fresh page starts with when this is what the browser has saved. */
async function comfortFrom(saved: unknown) {
  vi.resetModules();
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(saved), setItem: () => {} });
  return (await import("../../client/src/state/local")).local.getState().comfort;
}

it("lets go of a movement mode saved before walking became the default, and keeps one chosen since", async () => {
  const before = await comfortFrom({ theme: "july4", comfort: { locomotion: "teleport", snapTurn: false } });
  expect(before.locomotion).toBe("smooth");
  // Everything else in the old save still counts.
  expect(before.snapTurn).toBe(false);

  const since = await comfortFrom({ theme: "july4", comfort: { locomotion: "teleport", jump: true } });
  expect(since.locomotion).toBe("teleport");
});
