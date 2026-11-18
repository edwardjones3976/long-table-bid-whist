import { expect, type Browser, type Page } from "@playwright/test";
import type { GameId, Pose, TableId } from "../../shared/protocol";

export interface Mansion {
  getState(): {
    room: { you: string; members: { id: string; name: string }[] } | null;
    table: { revision: number; you: number | null; view: { phase: string } | null } | null;
  };
  local: { getState(): { playerPose: Pose | null; theme: string; seated: Pose | null }; set(partial: object): void };
  isWalkable(x: number, z: number): boolean;
  teleport(pose: Pose): void;
}
declare global {
  interface Window {
    __mansion: Mansion;
  }
}

/** Console errors and failed requests of every page opened through open(); each test expects it to stay empty. */
export const problems: string[] = [];

/**
 * Opens a fresh browser profile on the entry screen. Software GL is slow, and every
 * page shares one GPU process, so only pages that look at the 3D view draw it: with
 * `scene` false the page has no WebGL and runs on the app's own "3D view could not
 * start" fallback, which leaves the HUD and the table panel working.
 */
export async function open(browser: Browser, scene = true): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  if (!scene) {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type.startsWith("webgl") ? null : (real as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof real;
    });
  }
  page.on("console", (message) => {
    // Without WebGL the renderer and React both report the failure the fallback handles.
    if (message.type() === "error" && scene) problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    // A reload or close cancels whatever the page was still fetching.
    if (request.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`request failed: ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await page.goto("/?e2e=1");
  return page;
}

/** Enters a room: creates one when `code` is missing. Returns the page and the room code. */
export async function enter(browser: Browser, name: string, code?: string, scene = false): Promise<{ page: Page; code: string }> {
  const page = await open(browser, scene);
  await page.getByTestId("entry-name").fill(name);
  if (code) {
    await page.getByTestId("entry-code").fill(code);
    await page.getByTestId("entry-join").click();
  } else {
    await page.getByTestId("entry-create").click();
  }
  await expect(page.getByTestId("hud")).toBeVisible();
  if (!scene) await expect(page.locator(".scene-failed")).toBeVisible();
  return { page, code: (await page.getByTestId("room-code").textContent()) ?? "" };
}

export async function closeAll(pages: Page[]): Promise<void> {
  for (const page of pages) await page.context().close();
}

export interface Seated {
  code: string;
  tableId: TableId;
  players: Page[];
  host: Page;
}

/**
 * Four pages sit at the table, a fifth joins as host, the host may change rules, all
 * ready up and the host starts. Only the first player's page draws the 3D view.
 */
export async function seatAndStart(
  browser: Browser,
  tableId: TableId,
  rules: (host: Page) => Promise<void> = async () => {},
): Promise<Seated> {
  const first = await enter(browser, "P1", undefined, true);
  const players = [first.page];
  for (const name of ["P2", "P3", "P4"]) players.push((await enter(browser, name, first.code)).page);
  const host = (await enter(browser, "Hostess", first.code)).page;
  for (const [seat, page] of players.entries()) {
    await page.getByTestId(`table-${tableId}`).click();
    await page.getByTestId(`sit-${seat}`).click();
    await expect(page.getByTestId("ready")).toBeVisible();
  }
  await host.getByTestId(`table-${tableId}`).click();
  await host.getByTestId("sit-host").click();
  await expect(host.getByTestId("start")).toBeDisabled();
  await rules(host);
  for (const page of players) await page.getByTestId("ready").click();
  await host.getByTestId("start").click();
  await expect(host.getByTestId("table-status")).toContainText("hold no cards");
  return { code: first.code, tableId, players, host };
}

const revision = (page: Page): Promise<number> => page.evaluate(() => window.__mansion.getState().table?.revision ?? -1);
const reached = (page: Page, wanted: number): Promise<unknown> =>
  page.waitForFunction((r) => (window.__mansion.getState().table?.revision ?? -1) >= r, wanted);

const PANEL = '[data-testid="table-panel"]';

const enabledButtons = (page: Page): Promise<string[]> =>
  page.locator(`${PANEL} .buttons button:not(:disabled)`).evaluateAll((all) => all.map((b) => b.getAttribute("data-testid") ?? ""));

async function playCard(page: Page, confirm: "play" | "discard"): Promise<void> {
  await page.locator(`${PANEL} .hand button:not(:disabled)`).first().click();
  await page.getByTestId(confirm).click();
}

/**
 * One legal move for the page on turn, chosen only from what its panel offers.
 * The policy is as plain as possible and ends games quickly: the first Bid Whist
 * bidder bids the most on offer and the rest pass (so one hand settles the game),
 * Spades players bid 2 (a contract of 4 is nearly always made, so three or four hands reach 100), and Tonk players drop from the second hand on.
 */
async function move(page: Page, game: GameId, memo: { bid: boolean; hands: number }): Promise<void> {
  const ids = await enabledButtons(page);
  const has = (id: string) => ids.includes(id);
  const bids = ids.filter((id) => id.startsWith("bid-") && id !== "bid-pass");
  if (has("next-hand")) {
    memo.hands += 1;
    memo.bid = false;
    await page.getByTestId("next-hand").click();
  } else if (bids.length || has("bid-pass")) {
    const pick = game === "spades" ? (has("bid-2") ? "bid-2" : bids[0]) : memo.bid && has("bid-pass") ? "bid-pass" : bids.at(-1)!;
    memo.bid = true;
    await page.getByTestId(pick).click();
  } else if (ids.some((id) => id.startsWith("declare-"))) {
    await page.getByTestId(ids.find((id) => id.startsWith("declare-"))!).click();
  } else if (await page.getByTestId("clear").count()) {
    // The Bid Whist kitty: six discards.
    const cards = page.locator(`${PANEL} .hand button`);
    for (let i = 0; i < 6; i += 1) await cards.nth(i).click();
    await page.getByTestId("discard").click();
  } else if (has("draw-stock") || has("draw-discard")) {
    await page.getByTestId(memo.hands > 0 && has("drop") ? "drop" : has("draw-stock") ? "draw-stock" : "draw-discard").click();
  } else if (await page.getByTestId("discard").count()) {
    await playCard(page, "discard");
  } else {
    await playCard(page, "play");
  }
}

/**
 * Plays until the results panel shows on `watcher` (any page at the table). A page
 * of `players` is null where a bot holds the seat. `each` runs before every move;
 * `limit` stops early after that many moves.
 */
export async function playToResults(
  game: GameId,
  players: (Page | null)[],
  watcher: Page,
  each: (moves: number) => Promise<void> = async () => {},
  limit = Infinity,
): Promise<number> {
  const memo = { bid: false, hands: 0 };
  let seen = await revision(watcher);
  for (let moves = 0; moves < 1500; moves += 1) {
    if (moves === limit || (await watcher.getByTestId("results").count())) return moves;
    await each(moves);
    // The seat list marks the seat on turn; between hands nobody is, and any player may deal.
    const seats = await watcher.locator('[data-testid^="seat-"]').allTextContents();
    const turn = seats.findIndex((text) => text.startsWith("▶"));
    const actor = turn >= 0 ? players[turn] : players.find(Boolean);
    if (!actor) throw new Error(`Seat ${turn} is on turn but no page plays it: ${seats.join(" | ")}`);
    await reached(actor, seen);
    await move(actor, game, memo);
    await watcher.waitForFunction((r) => (window.__mansion.getState().table?.revision ?? -1) > r, seen);
    seen = await revision(watcher);
  }
  throw new Error("The game did not finish in 1500 moves");
}

/** The cards a player's panel shows, and the count their own seat line states. */
export async function handShown(page: Page): Promise<{ shown: number; stated: number }> {
  // One read of the page: separate reads can straddle a snapshot and disagree by a card.
  return page.evaluate((panel) => {
    const you = window.__mansion.getState().table?.you ?? -1;
    const line = document.querySelector(`[data-testid="seat-${you}"]`)?.textContent ?? "";
    return {
      shown: document.querySelectorAll(`${panel} .hand button`).length,
      stated: Number(/(\d+) cards?/.exec(line)?.[1] ?? -1),
    };
  }, PANEL);
}
