/**
 * Cards handled on the 3D table with a real mouse, the text panel off, as a player gets the game: one page sits
 * by pressing a chair's marker, readies and starts with the table's tokens, and plays against bots. Every move is
 * checked against what the server says (window.__mansion.getState()), not only against what is drawn.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import type { TableId } from "../../shared/protocol";
import { click, closeAll, drag, enter, problems, screenOf, settle, shoot, sitAt, still, tableOf, worldOf, type Hand } from "./helpers";

/** Where a hand card is pressed: left of its middle, which in a long hand the next card covers. */
const GRIP: [number, number, number] = [-0.025, 0, 0];
const CENTRES: Partial<Record<TableId, { x: number; z: number }>> = {
  "tonk-1": { x: -16, z: 13.5 },
  "spades-1": { x: -16, z: -4.5 },
  "bid-whist-1": { x: 16, z: 13.5 },
};

test.beforeEach(() => void (problems.length = 0));

const names = (page: Page): Promise<string[]> => page.evaluate(() => window.__mansion.tableNames());
const view = <T>(page: Page, read: (view: Record<string, unknown>) => T): Promise<T> =>
  page.evaluate(`(${read.toString()})(window.__mansion.getState().table.view)`) as Promise<T>;

/** One player stands by the table, sits in seat 0 by pressing its chair's marker, then readies and starts with the table's tokens. Bots take the other seats. */
async function sitAndStart(browser: Browser, tableId: TableId): Promise<Page> {
  const { page } = await enter(browser, "Solo", undefined, true, false);
  await expect(page.getByTestId("table-panel")).toHaveCount(0);
  await page.waitForFunction(() => window.__mansion.local.getState().playerPose !== null);
  await sitAt(page, CENTRES[tableId]!);
  await expect.poll(() => names(page)).toContain("ready");
  const ready = () =>
    page.evaluate(
      (id) => (window.__mansion.getState().room as unknown as { tables: { id: string; seats: { ready: boolean }[] }[] }).tables.find((t) => t.id === id)!.seats[0].ready,
      tableId,
    );
  await click(page, "ready");
  await expect.poll(ready).toBe(true);
  await click(page, "start");
  await expect.poll(() => tableOf(page).then((t) => t?.phase ?? null)).not.toBeNull();
  return page;
}

/** Waits until the server says it is my move (in `phase`, when given), dealing again with the token if a hand ends first. */
async function myTurn(page: Page, phase?: string): Promise<Hand> {
  const until = Date.now() + 90_000;
  for (;;) {
    const table = await tableOf(page);
    if (table?.legal && (!phase || table.phase === phase)) return table;
    if (table?.phase === "hand-over" && (await names(page)).includes("next-hand")) {
      await click(page, "next-hand");
      await expect.poll(() => tableOf(page).then((t) => t!.revision)).toBeGreaterThan(table.revision);
    }
    if (Date.now() > until) throw new Error(`Never my turn: ${JSON.stringify(table)}`);
    await page.waitForTimeout(200);
  }
}

/** Where to press a hand card, once it has come to rest in the row. */
async function card(page: Page, id: string) {
  await still(page, `card-${id}`);
  return screenOf(page, `card-${id}`, GRIP);
}
/** How far apart two places are on the floor plan; a card under the cursor is also lifted a centimetre. */
const apart = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

test("spades: sit by the chair, ready and start by token, bid by token, play a card by dragging it, an illegal one springs back", async ({ browser }) => {
  const page = await sitAndStart(browser, "spades-1");

  let table = await myTurn(page, "bidding");
  await shoot(page, "spades-bid-tokens");
  const bids = table.legal!.bids as number[];
  const bid = bids.includes(3) ? 3 : bids[0];
  await click(page, `token-bid-${bid}`);
  await expect.poll(() => view(page, (v) => (v.bids as (number | null)[])[0])).toBe(bid);

  table = await myTurn(page, "play");
  await shoot(page, "spades-my-turn");
  const legal = table.legal!.cardIds as string[];
  const illegal = table.hand.find((id) => !legal.includes(id));
  if (illegal) {
    const home = (await worldOf(page, `card-${illegal}`))!;
    await drag(page, await card(page, illegal), await screenOf(page, "zone-play"));
    await settle(page, 1000);
    const after = (await tableOf(page))!;
    expect(after.hand).toEqual(table.hand);
    expect(after.revision).toBe(table.revision);
    // Back in its place in the hand, and the reason was said.
    expect(apart((await worldOf(page, `card-${illegal}`))!, home)).toBeLessThan(0.01);
  } else {
    test.info().annotations.push({ type: "note", description: "Every card in the hand was legal this time: no illegal drag." });
  }

  // A card picked by a tap, then a drag of another one stopped by Esc and let go over the felt: nothing is played.
  const selection = (): Promise<readonly string[]> => page.evaluate(() => window.__mansion.local.getState().selection);
  const firstAt = table.hand.indexOf(legal[0]);
  const other = table.hand.find((_, i) => Math.abs(i - firstAt) >= 2) ?? table.hand.find((id) => id !== legal[0])!;
  await click(page, `card-${legal[0]}`, GRIP);
  await expect.poll(selection).toEqual([legal[0]]);
  await still(page, `card-${other}`);
  // The upper part of the card, where the press's ray goes on to the felt behind it.
  const from = await screenOf(page, `card-${other}`, [-0.025, 0.035, 0]);
  const felt = await screenOf(page, "zone-play");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i += 1) {
    await page.mouse.move(from.x, from.y - i * 8);
    await page.waitForTimeout(20);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await page.mouse.move(felt.x, felt.y, { steps: 6 });
  await page.mouse.up();
  await settle(page, 1000);
  expect((await tableOf(page))!.revision).toBe(table.revision);
  expect((await tableOf(page))!.hand).toEqual(table.hand);
  expect(await selection()).toEqual([legal[0]]);
  await page.evaluate(() => window.__mansion.local.set({ selection: [] }));

  const played = legal[0];
  await drag(page, await card(page, played), await screenOf(page, "zone-play"), () => shoot(page, "spades-card-over-felt"));
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(played))).toBe(false);
  // The server has it on the table: in the trick, or in the trick just won if the bots finished it.
  const onTable = await view(page, (v) => JSON.stringify([v.trick, v.lastTrick]));
  expect(onTable).toContain(played);
  expect((await tableOf(page))!.hand.length).toBe(table.hand.length - 1);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("tonk: draw by pulling the stock onto the hand, discard by dragging a card onto the discard pile", async ({ browser }) => {
  const page = await sitAndStart(browser, "tonk-1");

  const table = await myTurn(page, "draw");
  await shoot(page, "tonk-my-turn");
  const stock = await view(page, (v) => v.stockCount as number);
  const stockHome = (await worldOf(page, "pile-stock"))!;
  await drag(page, await screenOf(page, "pile-stock"), await card(page, table.hand[Math.floor(table.hand.length / 2)]));
  await expect.poll(() => tableOf(page).then((t) => t!.hand.length)).toBe(table.hand.length + 1);
  expect(await view(page, (v) => v.stockCount as number)).toBe(stock - 1);
  // Once the draw is made the pile goes home at once: left where it was let go, it would lie over my hand and take
  // the press meant for a card under it.
  await expect.poll(async () => apart((await worldOf(page, "pile-stock"))!, stockHome), { timeout: 1000 }).toBeLessThan(0.01);

  const melding = await myTurn(page, "meld");
  const discardable = melding.legal!.discardIds as string[];
  const out = discardable.find((id) => table.hand.includes(id)) ?? discardable[0];
  await drag(page, await card(page, out), await screenOf(page, "zone-discard"));
  await expect.poll(() => tableOf(page).then((t) => t!.hand.includes(out))).toBe(false);
  expect(await view(page, (v) => JSON.stringify(v.discards))).toContain(out);
  expect((await tableOf(page))!.hand.length).toBe(table.hand.length);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("bid whist: win the bid with a token, declare, drag six cards to the kitty and press the bury puck", async ({ browser }) => {
  const page = await sitAndStart(browser, "bid-whist-1");

  let table = await myTurn(page, "auction");
  await shoot(page, "bid-whist-bid-tokens");
  const bids = table.legal!.bids as { level: number; kind: string }[];
  const top = [...bids].reverse().find((each) => each.kind === "high") ?? bids.at(-1)!;
  await click(page, `token-bid-${top.level}-${top.kind}`);

  table = await myTurn(page, "declare");
  const declare = (await names(page)).find((name) => name === "token-declare-spades" || name === "token-declare-high")!;
  await click(page, declare);

  table = await myTurn(page, "kitty");
  expect(table.hand.length).toBe(18);
  const buried = table.hand.slice(0, 6);
  for (const [i, id] of buried.entries()) {
    await drag(page, await card(page, id), await screenOf(page, "zone-kitty"));
    await expect.poll(() => page.evaluate(() => window.__mansion.local.getState().selection.length)).toBe(i + 1);
  }
  expect(await page.evaluate(() => [...window.__mansion.local.getState().selection].sort())).toEqual([...buried].sort());
  await click(page, "puck-bury");
  await expect.poll(() => tableOf(page).then((t) => t!.hand.length)).toBe(12);
  const after = (await tableOf(page))!;
  for (const id of buried) expect(after.hand).not.toContain(id);
  expect(after.phase).toBe("play");

  await closeAll([page]);
  expect(problems).toEqual([]);
});
