import { expect, test, type Page } from "@playwright/test";
import type { GameId, TableId } from "../../shared/protocol";
import { closeAll, enter, handShown, playToResults, problems, seatAndStart } from "./helpers";

const SCREENS = "client/.e2e-screens";

test.beforeEach(() => void (problems.length = 0));

const GAMES: { game: GameId; tableId: TableId; label: string; dealt: number; rules?: (host: Page) => Promise<void> }[] = [
  { game: "bid-whist", tableId: "bid-whist-1", label: "Bid Whist Table 1", dealt: 12 },
  { game: "tonk", tableId: "tonk-2", label: "Tonk Table 2", dealt: 5 },
  {
    game: "spades",
    tableId: "spades-1",
    label: "Spades Table 1",
    dealt: 13,
    // The shortest game on offer: 500 -> 250 -> 100, and no bag penalty to undo the low bids the test makes.
    rules: async (host) => {
      await host.getByTestId("option-bagPenalty").click();
      await expect(host.getByTestId("option-bagPenalty")).toContainText(": no");
      await host.getByTestId("option-target").click();
      await expect(host.getByTestId("option-target")).toContainText("250 points");
      await host.getByTestId("option-target").click();
      await expect(host.getByTestId("option-target")).toContainText("100 points");
    },
  },
];

for (const { game, tableId, label, dealt, rules } of GAMES) {
  test(`${game}: four seated pages and a host play a whole game to the results`, async ({ browser }) => {
    test.setTimeout(420_000);
    const { code, players, host } = await seatAndStart(browser, tableId, rules);

    // A sixth person finds the table full and in play.
    const sixth = (await enter(browser, "Late", code)).page;
    await expect(sixth.getByTestId(`table-${tableId}`)).toHaveText(`${label} (In play)`);
    await sixth.getByTestId(`table-${tableId}`).click();
    for (const seat of [0, 1, 2, 3]) await expect(sixth.getByTestId(`sit-${seat}`)).toBeDisabled();
    await expect(sixth.getByTestId("sit-host")).toBeDisabled();
    await sixth.getByTestId("tables-back").click();

    const hostHand = host.locator('[data-testid="table-panel"] .hand button');
    for (const page of players) await expect(page.locator('[data-testid="table-panel"] .hand button')).toHaveCount(dealt);

    const moves = await playToResults(game, players, host, async (count) => {
      if (count % 12 !== 0) return;
      expect(await hostHand.count()).toBe(0);
      const { shown, stated } = await handShown(players[(count / 12) % 4]);
      expect(shown).toBe(stated);
      // players[0] is the page that draws the 3D view.
      if (count === 24) await players[0].screenshot({ path: `${SCREENS}/${game}-in-play.png` });
    });
    expect(moves).toBeGreaterThan(4);

    await expect(host.getByTestId("results")).toContainText("won the game");
    await expect(hostHand).toHaveCount(0);
    for (const page of players) await expect(page.getByTestId("results")).toBeVisible();
    await expect(sixth.getByTestId(`table-${tableId}`)).toHaveText(`${label} (Results)`);
    await players[0].getByTestId("results").scrollIntoViewIfNeeded();
    await players[0].screenshot({ path: `${SCREENS}/${game}-results.png` });
    // Only the manager (the host) may clear the finished game.
    await expect(players[0].getByTestId("reset")).toHaveCount(0);
    await host.getByTestId("reset").click();
    await expect(sixth.getByTestId(`table-${tableId}`)).toHaveText(`${label} (In lobby)`);

    await closeAll([...players, host, sixth]);
    expect(problems).toEqual([]);
  });
}
