/**
 * Bots are seen: once a match starts, every seat a bot plays has a bot figure in it, for the player at that
 * table and for anyone else in the room, and the figures leave when the last person leaves (the match is dropped).
 */
import { expect, test } from "@playwright/test";
import { closeAll, enter } from "./helpers";

/** The seats at `tableId` that have a bot figure in this page's scene (the three() hook is not in the shared Mansion type). */
const botsAt = (page: import("@playwright/test").Page, tableId: string) =>
  page.evaluate((id) => {
    const scene = (window.__mansion as unknown as { three(): { scene: { getObjectByName(name: string): unknown } } }).three().scene;
    return [0, 1, 2, 3].filter((seat) => scene.getObjectByName(`bot-${id}-${seat}`));
  }, tableId);

test("a bot figure sits in each bot-played seat, seen from the table and from across the room, and leaves with the match", async ({ browser }) => {
  const solo = await enter(browser, "Solo", undefined, true);
  const visitor = await enter(browser, "Visitor", solo.code, true);
  const { page } = solo;
  await page.getByTestId("table-spades-1").click();
  await page.getByTestId("sit-0").click();
  expect(await botsAt(page, "spades-1")).toEqual([]);
  await page.getByTestId("ready").click();
  await page.getByTestId("start").click();

  // Seat 0 is the person; seats 1 to 3 are bots, for both pages.
  await expect.poll(() => botsAt(page, "spades-1")).toEqual([1, 2, 3]);
  await expect.poll(() => botsAt(visitor.page, "spades-1")).toEqual([1, 2, 3]);
  expect(await botsAt(visitor.page, "tonk-1")).toEqual([]);

  // The only person stands up: a match with nobody left to play it is over.
  await page.getByTestId("leave").click();
  await expect.poll(() => botsAt(page, "spades-1")).toEqual([]);
  await expect.poll(() => botsAt(visitor.page, "spades-1")).toEqual([]);
  await closeAll([page, visitor.page]);
});
