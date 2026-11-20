import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { expect, test, type Browser, type Page } from "@playwright/test";
import type { GameId, Pose, TableId } from "../../shared/protocol";

/**
 * For a file that needs the server set otherwise than the shared one (playwright.config.ts): starts its own game server
 * on a free port with `env` over the shared settings, points every page the file opens at it (open() makes its own
 * context, which takes the baseURL), and stops it after the file. It serves client/dist: run "npm run build" first.
 */
export async function ownServer(env: Record<string, string>): Promise<void> {
  const port = await new Promise<number>((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port: free } = probe.address() as { port: number };
      probe.close(() => resolve(free));
    });
  });
  const base = `http://localhost:${port}`;
  test.use({ baseURL: base });
  let server: ChildProcess | null = null;
  test.beforeAll(async () => {
    server = spawn(process.execPath, ["--import", "tsx", "server/main.ts"], {
      env: { ...process.env, PORT: String(port), BOT_DELAY_MS: "0", TURN_SECONDS: "0", WALKERS: "0", ...env },
      stdio: "ignore",
    });
    await expect
      .poll(() => fetch(base).then((response) => response.ok, () => false), { timeout: 60_000 })
      .toBe(true);
  });
  test.afterAll(() => void server?.kill());
}

export interface Mansion {
  getState(): {
    room: { you: string; members: { id: string; name: string }[] } | null;
    table: { revision: number; you: number | null; view: { phase: string } | null } | null;
  };
  local: { getState(): { playerPose: Pose | null; theme: string; seated: Pose | null; selection: readonly string[] }; set(partial: object): void };
  isWalkable(x: number, z: number): boolean;
  teleport(pose: Pose): void;
  tableNames(): string[];
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
 * Every page asks for the text table panel (?panel=1), which is off by default: these tests drive the game through it.
 * With `panel` false the page is as a player gets it, and the game is handled on the 3D table.
 */
export async function open(browser: Browser, scene = true, panel = true): Promise<Page> {
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
  await page.goto(panel ? "/?e2e=1&panel=1" : "/?e2e=1");
  return page;
}

/** Opens the HUD menu if it is closed: invite, Enter VR, settings, controls, the member list and Leave room live in it. */
export async function openMenu(page: Page): Promise<void> {
  const button = page.getByTestId("hud-menu");
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
}

/** Enters a room: creates one when `code` is missing. Returns the page and the room code. */
export async function enter(browser: Browser, name: string, code?: string, scene = false, panel = true): Promise<{ page: Page; code: string }> {
  const page = await open(browser, scene, panel);
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

// ---- the 3D view, as a player with a mouse and keyboard meets it ----

export type Point = { x: number; y: number };
type Vec = [x: number, y: number, z: number];

/**
 * Where an in-world thing is drawn on the page, in CSS pixels: the named object's point `at` (in its own space; its
 * middle by default), or a world point. Throws when it is not in the scene or not in view.
 */
export async function screenOf(page: Page, what: string | Vec, at: Vec = [0, 0, 0]): Promise<Point> {
  const found = await page.evaluate(
    ({ what, at }) => {
      type V = { x: number; y: number; z: number; set(x: number, y: number, z: number): V; clone(): V; project(c: unknown): V };
      type O = { position: V; localToWorld(v: V): V; updateMatrixWorld(force?: boolean): void };
      const three = (window as unknown as { __mansion: { three(): { scene: O & { getObjectByName(n: string): O | undefined }; camera: O; gl: { domElement: HTMLElement } } } }).__mansion.three();
      three.scene.updateMatrixWorld(true);
      three.camera.updateMatrixWorld(true);
      let point: V;
      if (typeof what === "string") {
        const object = three.scene.getObjectByName(what);
        if (!object) return `${what} is not in the scene`;
        point = object.localToWorld(three.camera.position.clone().set(...at));
      } else point = three.camera.position.clone().set(...what);
      const ndc = point.project(three.camera);
      if (ndc.z > 1 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return `${String(what)} is out of view`;
      const box = three.gl.domElement.getBoundingClientRect();
      return { x: box.left + ((ndc.x + 1) / 2) * box.width, y: box.top + ((1 - ndc.y) / 2) * box.height };
    },
    { what, at },
  );
  if (typeof found === "string") throw new Error(found);
  return found;
}

/** A world point of an in-world object (`at` in its own space), or null when it is not in the scene. */
export const worldOf = (page: Page, name: string): Promise<{ x: number; y: number; z: number } | null> =>
  page.evaluate((n) => (window as unknown as { __mansion: { tablePoint(n: string): { x: number; y: number; z: number } | null } }).__mansion.tablePoint(n), name);

/** Waits until an in-world thing has stopped moving (cards ease to a new place when the hand changes). */
export async function still(page: Page, name: string): Promise<void> {
  let last = "";
  await expect
    .poll(async () => {
      const at = await worldOf(page, name);
      const now = at ? [at.x, at.y, at.z].map((v) => v.toFixed(4)).join() : "gone";
      const same = now === last;
      last = now;
      return same;
    }, { intervals: [150] })
    .toBe(true);
}

/** A real mouse click on an in-world thing. */
export async function click(page: Page, name: string, at?: Vec): Promise<void> {
  const point = await screenOf(page, name, at);
  await page.mouse.click(point.x, point.y);
}

/**
 * A real mouse drag: press at `from`, move there in `steps` small moves a frame apart, let go at `to`. `held` runs
 * with the button still down over `to` (a screenshot of a card in the air).
 */
export async function drag(page: Page, from: Point, to: Point, held?: () => Promise<void>, steps = 12): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(150);
  if (held) await held();
  await page.mouse.up();
}

/** What the server has told this page about its table: the snapshot's own fields, the hand as card ids, and what is legal now. */
export interface Hand {
  you: number | null;
  revision: number;
  phase: string | null;
  turn: number | null;
  hand: string[];
  legal: Record<string, unknown> | null;
}
export const tableOf = (page: Page): Promise<Hand | null> =>
  page.evaluate(() => {
    const table = window.__mansion.getState().table as unknown as {
      you: number | null;
      revision: number;
      view: { phase: string; turn?: number; hand: { id: string }[] | null; legal: Record<string, unknown> | null } | null;
    } | null;
    if (!table) return null;
    const view = table.view;
    return { you: table.you, revision: table.revision, phase: view?.phase ?? null, turn: view?.turn ?? null, hand: (view?.hand ?? []).map((card) => card.id), legal: view?.legal ?? null };
  });

/**
 * Stands the player beside a table, facing its middle, on a spot the real ground lets a walker stand on: where
 * walking up to it would bring them, so its chairs show their markers.
 */
export async function standBy(page: Page, centre: { x: number; z: number }): Promise<void> {
  const spot = await page.evaluate((c) => {
    for (const radius of [2.2, 2.5, 1.9, 2.8]) {
      for (let i = 0; i < 24; i += 1) {
        // From the south-east round: seat 0 (south) and its marker stay in front.
        const angle = Math.PI / 4 + (i * Math.PI) / 12;
        const x = c.x + Math.sin(angle) * radius;
        const z = c.z + Math.cos(angle) * radius;
        if (window.__mansion.isWalkable(x, z)) return { x, z, ry: Math.atan2(x - c.x, z - c.z) };
      }
    }
    return null;
  }, centre);
  if (!spot) throw new Error("No free spot beside the table");
  await page.evaluate((p) => window.__mansion.teleport(p), spot);
  await page.waitForFunction((p) => {
    const at = window.__mansion.local.getState().playerPose;
    return at !== null && Math.hypot(at.x - p.x, at.z - p.z) < 0.05;
  }, spot);
}

/** Sits in seat 0 of the table at `centre` the way a player does: stand beside it and press the chair's marker. */
export async function sitAt(page: Page, centre: { x: number; z: number }): Promise<void> {
  await standBy(page, centre);
  await expect.poll(() => page.evaluate(() => window.__mansion.tableNames())).toContain("sit-0");
  await page.waitForTimeout(400);
  await click(page, "sit-0");
  await expect.poll(() => tableOf(page).then((t) => t?.you)).toBe(0);
  await page.waitForFunction(() => window.__mansion.local.getState().seated !== null);
  // The view moves to the seat on the next frame.
  await page.waitForTimeout(400);
}

/** Draws a few frames: what a moment on screen needs before it is looked at. */
export const settle = (page: Page, ms = 400): Promise<void> => page.waitForTimeout(ms);

/** The page at both window sizes the app is checked at, as client/.e2e-screens/<name>-<width>.png. */
export async function shoot(page: Page, name: string): Promise<void> {
  for (const [width, height] of [
    [1280, 800],
    [820, 533],
  ]) {
    await page.setViewportSize({ width, height });
    await settle(page, 600);
    await page.screenshot({ path: `client/.e2e-screens/${name}-${width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await settle(page);
}
