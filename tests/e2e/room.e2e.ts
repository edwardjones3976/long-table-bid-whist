import { expect, test } from "@playwright/test";
import { GAME_NAMES, ROOM_CODE_LENGTH, TABLES } from "../../shared/protocol";
import { closeAll, enter, handShown, playToResults, problems } from "./helpers";

test.beforeEach(() => void (problems.length = 0));

test("enter: one page creates a room, a second joins by its code, and each sees the other", async ({ browser }) => {
  const ann = await enter(browser, "Ann", undefined, true);
  expect(ann.code).toMatch(new RegExp(`^[A-Z2-9]{${ROOM_CODE_LENGTH}}$`));
  const bea = await enter(browser, "Bea", ann.code, true);
  expect(bea.code).toBe(ann.code);
  for (const page of [ann.page, bea.page]) await expect(page.getByTestId("members")).toHaveText("In the room (2): Ann, Bea");
  // Both draw the 3D view: each is sent the other's pose for the avatar.
  await ann.page.waitForFunction(() => {
    const { poses, room } = window.__mansion.getState() as unknown as { poses: Record<string, unknown>; room: { you: string } };
    return Object.keys(poses).some((id) => id !== room.you);
  });
  await closeAll([ann.page, bea.page]);
  expect(problems).toEqual([]);
});

test("a wrong room code is refused with a message", async ({ browser }) => {
  const { page } = await enter(browser, "Ann");
  const other = await page.context().browser()!.newContext();
  const stray = await other.newPage();
  await stray.goto("/?e2e=1");
  await stray.getByTestId("entry-name").fill("Stray");
  await stray.getByTestId("entry-code").fill("ZZZZZZZZ");
  await stray.getByTestId("entry-join").click();
  await expect(stray.getByTestId("entry-error")).not.toBeEmpty();
  await expect(stray.getByTestId("hud")).toHaveCount(0);
  await other.close();
  await closeAll([page]);
});

test("tables: all six are listed with their game and label, and start Available", async ({ browser }) => {
  const { page } = await enter(browser, "Ann");
  await expect(page.locator('[data-testid="table-picker"] button')).toHaveCount(6);
  for (const table of TABLES) {
    expect(table.label.startsWith(GAME_NAMES[table.game])).toBe(true);
    await expect(page.getByTestId(`table-${table.id}`)).toHaveText(`${table.label} (Available)`);
  }
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("reconnect: a seated player reloads mid-game and is back in the same seat with their hand", async ({ browser }) => {
  const { page } = await enter(browser, "Ann", undefined, true);
  await page.getByTestId("table-spades-2").click();
  await page.getByTestId("sit-2").click();
  await page.getByTestId("ready").click();
  await page.getByTestId("start").click();
  await page.getByTestId("bid-2").click();
  const hand = page.locator('[data-testid="table-panel"] .hand button');
  await expect(hand).toHaveCount(13);
  const before = await hand.allTextContents();
  const code = await page.getByTestId("room-code").textContent();

  await page.reload();
  await expect(page.getByTestId("room-code")).toHaveText(code!);
  await expect(page.getByTestId("table-title")).toHaveText("Spades Table 2");
  await expect(hand).toHaveCount(13);
  expect(await hand.allTextContents()).toEqual(before);
  await expect(page.getByTestId("seat-2")).toContainText("You");
  expect(await handShown(page)).toEqual({ shown: 13, stated: 13 });
  // Still playable after the reload.
  await playToResults("spades", [null, null, page, null], page, undefined, 3);
  await expect(hand).toHaveCount(10);
  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("leave: a bot takes over a seat left mid-game, and another table in the room is untouched", async ({ browser }) => {
  const ann = await enter(browser, "Ann");
  const bea = (await enter(browser, "Bea", ann.code)).page;
  const cy = (await enter(browser, "Cy", ann.code)).page;
  // Cy waits alone in the lobby of a different table.
  await cy.getByTestId("table-tonk-1").click();
  await cy.getByTestId("sit-0").click();
  await cy.getByTestId("ready").click();
  await expect(cy.getByTestId("unready")).toBeVisible();

  for (const [seat, page] of [ann.page, bea].entries()) {
    await page.getByTestId("table-bid-whist-2").click();
    await page.getByTestId(`sit-${seat}`).click();
    await page.getByTestId("ready").click();
  }
  await ann.page.getByTestId("start").click();
  await expect(bea.locator('[data-testid="table-panel"] .hand button')).toHaveCount(12);

  // Leave ignores a press within half a second of pressing another button (double-press guard).
  await bea.waitForTimeout(600);
  await bea.getByTestId("leave").click();
  // Bea is now a visitor looking at the table she left; her old seat is not on offer while the match runs.
  await expect(bea.locator('[data-testid="table-panel"] .hand button')).toHaveCount(0);
  await expect(bea.getByTestId("sit-1")).toBeDisabled();
  await bea.getByTestId("tables-back").click();
  await expect(bea.getByTestId("table-bid-whist-2")).toHaveText("Bid Whist Table 2 (In play)");
  await expect(bea.getByTestId("table-tonk-1")).toHaveText("Tonk Table 1 (In lobby)");
  await expect(ann.page.getByTestId("seat-1")).toContainText("Bot 2");

  // Ann plays on against three bots, all the way to the result.
  await playToResults("bid-whist", [ann.page, null, null, null], ann.page);
  await expect(ann.page.getByTestId("results")).toContainText("won the game");
  await expect(bea.getByTestId("table-bid-whist-2")).toHaveText("Bid Whist Table 2 (Results)");

  // Cy's table never noticed.
  await expect(cy.getByTestId("table-title")).toHaveText("Tonk Table 1");
  await expect(cy.getByTestId("seat-0")).toContainText("You, Ready");
  await expect(cy.getByTestId("unready")).toBeVisible();
  await expect(cy.getByTestId("start")).toBeEnabled();
  await closeAll([ann.page, bea, cy]);
  expect(problems).toEqual([]);
});
