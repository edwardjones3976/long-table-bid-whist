// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { LOOK_VERSION, STARTING_LOOKS } from "../../shared/avatar";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** A fresh page whose browser has `saved` under "mansion.look" (an Error: storage is blocked). */
async function page(saved: string | null | Error) {
  vi.resetModules();
  const writes = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      if (saved instanceof Error) throw saved;
      return saved;
    },
    setItem: (key: string, value: string) => {
      if (saved instanceof Error) throw saved;
      writes.set(key, value);
    },
  });
  const { myLook } = await import("../../client/src/state/look");
  return { myLook, writes };
}

it("gives a first visit one of the starting looks, saved at once so a reload keeps it", async () => {
  const { myLook, writes } = await page(null);
  expect(STARTING_LOOKS).toContainEqual(myLook.get());
  expect(JSON.parse(writes.get("mansion.look")!)).toEqual({ v: LOOK_VERSION, look: myLook.get() });
});

it("reads a saved look back through cleanLook, whatever version saved it", async () => {
  const saved = JSON.stringify({ v: 0, look: { ...STARTING_LOOKS[2], hair: "gone", extra: 1 } });
  const { myLook, writes } = await page(saved);
  expect(myLook.get()).toEqual({ ...STARTING_LOOKS[2], hair: STARTING_LOOKS[0].hair });
  expect(writes.size).toBe(0);
});

it("treats an unreadable entry or blocked storage as a first visit", async () => {
  for (const saved of ["{not json", "null", "7", JSON.stringify({ v: 1 }), new Error("blocked")]) {
    const { myLook } = await page(saved);
    expect(STARTING_LOOKS).toContainEqual(myLook.get());
  }
});

it("cleans, saves and shares each change", async () => {
  const { myLook, writes } = await page(JSON.stringify({ v: 1, look: STARTING_LOOKS[1] }));
  const heard: unknown[] = [];
  const stop = myLook.subscribe(() => heard.push(myLook.get()));
  myLook.set({ ...STARTING_LOOKS[4], accessories: ["glasses-round", "glasses-wire", "studs", "watch", "necklace"] });
  const expected = { ...STARTING_LOOKS[4], accessories: ["glasses-round", "studs", "watch"] };
  expect(heard).toEqual([expected]);
  expect(JSON.parse(writes.get("mansion.look")!).look).toEqual(expected);
  stop();
  myLook.set(STARTING_LOOKS[0]);
  expect(heard).toHaveLength(1);
});
