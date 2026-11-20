/**
 * The VR path on the emulated headset (tests/e2e/headset.ts: the WebXR emulator the XR library depends on, loaded
 * from node_modules into the page; no headset, no network). This shows the session starts, the page interface goes
 * and the in-world menu takes its place, and a seat is taken, a Tonk turn played by quick presses (pick a card, then
 * the discard pile) and the table left with a controller ray alone; ending the session brings the page back.
 * Grabbing, carrying, both hands and moving about are in xr-hands.e2e.ts and xr-move.e2e.ts. None of it says anything
 * about comfort, legibility or frame rate in a real headset.
 */
import { expect, test } from "@playwright/test";
import { closeAll, problems, tableOf } from "./helpers";
import { enterHeadset, frames, myTurn, park, rayPress, readyAndStart, sitWithRay, trackHands } from "./headset";

test.beforeEach(() => void (problems.length = 0));

test("in an emulated headset a player sits, plays a Tonk turn and leaves using controller rays only", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await enterHeadset(browser, "Headset");
  // An immersive session shows no page content: everything from here is in-world.
  await expect(page.getByTestId("hud")).toHaveCount(0);
  await expect(page.getByTestId("table-picker")).toHaveCount(0);
  await expect(page.getByTestId("table-panel")).toHaveCount(0);

  // The in-world menu stands in for the HUD: its button opens it, a setting changes, and it closes again.
  const locomotion = () => page.evaluate(() => (window.__mansion.local.getState() as unknown as { comfort: { locomotion: string } }).comfort.locomotion);
  // Walking is the mode a new player starts in ("smooth" is Walk and teleport, "teleport" is Teleport only).
  expect(await locomotion()).toBe("smooth");
  await rayPress(page, "right", "vr-menu");
  await rayPress(page, "right", "vr-menu-move");
  await expect.poll(locomotion).toBe("teleport");
  await rayPress(page, "right", "vr-menu-move");
  await expect.poll(locomotion).toBe("smooth");
  await rayPress(page, "right", "vr-menu");
  await page.waitForFunction(() => !(window.__mansion.local.getState() as unknown as { vrMenu: boolean }).vrMenu);
  await park(page, "right");

  await sitWithRay(page, { x: -16, z: 13.5 }, "right");
  await readyAndStart(page, "tonk-1", "right", "right");

  // One whole turn by quick presses: the stock, a card (picked), then the discard pile.
  let table = await myTurn(page, "draw");
  await rayPress(page, "right", "pile-stock");
  await expect.poll(() => tableOf(page).then((t) => t!.hand.length)).toBe(table.hand.length + 1);
  table = await myTurn(page, "meld");
  const out = (table.legal!.discardIds as string[])[0];
  await rayPress(page, "right", `card-${out}`);
  await expect.poll(() => page.evaluate(() => [...window.__mansion.local.getState().selection])).toEqual([out]);
  await rayPress(page, "right", "pile-discard");
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(out))).toBe(false);
  expect((await tableOf(page))!.revision).toBeGreaterThan(table.revision);
  await park(page, "right");

  await rayPress(page, "right", "leave");
  await expect.poll(() => tableOf(page)).toBeNull();
  await page.waitForFunction(() => window.__mansion.local.getState().seated === null);

  // Ending the session brings the page interface back.
  await page.evaluate(async () => {
    const three = (window as unknown as { __mansion: { three(): { gl: { xr: { getSession(): { end(): Promise<void> } | null } } } } }).__mansion.three();
    await three.gl.xr.getSession()?.end();
  });
  await expect(page.getByTestId("hud")).toBeVisible();
  await expect(page.getByTestId("enter-vr")).toBeEnabled();
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("tracked hands in place of the controllers: a pinch on either hand's ray presses the VR menu and its settings", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await enterHeadset(browser, "Pincher");
  await trackHands(page, true);
  await park(page, "left");
  await park(page, "right");
  await frames(page, 4);
  const state = () => page.evaluate(() => window.__mansion.local.getState() as unknown as { vrMenu: boolean; comfort: { snapTurn: boolean } });

  await rayPress(page, "left", "vr-menu");
  await expect.poll(() => state().then((s) => s.vrMenu)).toBe(true);
  await park(page, "left");
  const snap = (await state()).comfort.snapTurn;
  await rayPress(page, "right", "vr-menu-turn");
  await expect.poll(() => state().then((s) => s.comfort.snapTurn)).toBe(!snap);
  await park(page, "right");
  await rayPress(page, "left", "vr-menu-turn");
  await expect.poll(() => state().then((s) => s.comfort.snapTurn)).toBe(snap);
  await park(page, "left");
  await rayPress(page, "right", "vr-menu");
  await expect.poll(() => state().then((s) => s.vrMenu)).toBe(false);

  await closeAll([page]);
  expect(problems).toEqual([]);
});
