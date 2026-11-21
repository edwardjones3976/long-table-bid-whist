/**
 * The turn clock against a real server whose turns run out. The shared test server runs with the clock off
 * (TURN_SECONDS "0" in playwright.config.ts), so this file starts its own game server on a free port with a
 * two-second turn and instant bots, points its pages there, and stops it at the end.
 *
 * Ann plays on the 3D table and is photographed; Bo plays from the text panel only and never moves, so every one
 * of his turns runs out. Both collect strikes and are taken off the table at three; Bo, taken off a second time
 * at another table, is benched. Screenshots go to client/.e2e-screens/clock-*.png.
 */
import { expect, test, type Page } from "@playwright/test";
import { click, closeAll, enter, ownServer, problems, settle, sitAt } from "./helpers";

await ownServer({ TURN_SECONDS: "2" });
test.beforeEach(() => void (problems.length = 0));

const SPADES_1 = { x: -16, z: -4.5 };
const SPADES_2 = { x: -16, z: -13.5 };

type Strikes = [number, number, number, number];
interface Clocks {
  seated: boolean;
  clock: { seat: number; remainingMs: number; totalMs: number } | null;
  strikes: Strikes | null;
  matchTime: Record<string, { elapsedMs: number; running: boolean } | null>;
}
/** What the server has told a page of the clocks: its own table's turn clock and strikes, and every table's match time. */
const clocks = (page: Page): Promise<Clocks> =>
  page.evaluate(() => {
    const state = window.__mansion.getState() as unknown as {
      room: { tables: { id: string; matchTime?: Clocks["matchTime"][string] }[] } | null;
      table: { clock?: Clocks["clock"]; strikes?: Strikes } | null;
    };
    return {
      seated: state.table !== null,
      clock: state.table?.clock ?? null,
      strikes: state.table?.strikes ?? null,
      matchTime: Object.fromEntries((state.room?.tables ?? []).map((table) => [table.id, table.matchTime ?? null])),
    };
  });

/** The page as it is, at the one window size: a two-second turn leaves no time for the two sizes `shoot` takes. */
const snap = (page: Page, name: string): Promise<Buffer> => page.screenshot({ path: `client/.e2e-screens/clock-${name}.png` });

/** Stands `radius` metres from a table on walkable floor, facing it: as a visitor sees it across the room. */
async function standAcross(page: Page, centre: { x: number; z: number }, radius: number): Promise<void> {
  const spot = await page.evaluate(
    ({ c, r }) => {
      for (let i = 0; i < 48; i += 1) {
        const angle = Math.PI / 4 + (i * Math.PI) / 24;
        const x = c.x + Math.sin(angle) * r;
        const z = c.z + Math.cos(angle) * r;
        if (window.__mansion.isWalkable(x, z)) return { x, z, ry: Math.atan2(x - c.x, z - c.z) };
      }
      return null;
    },
    { c: centre, r: radius },
  );
  if (!spot) throw new Error("No free spot across the room");
  await page.evaluate((p) => window.__mansion.teleport(p), spot);
  await page.waitForFunction((p) => {
    const at = window.__mansion.local.getState().playerPose;
    return at !== null && Math.hypot(at.x - p.x, at.z - p.z) < 0.05;
  }, spot);
}

const look = (page: Page, x: number, y: number): Promise<void> =>
  page.evaluate(([dx, dy]) => (window.__mansion as unknown as { look(x: number, y: number): void }).look(dx, dy), [x, y]);
const myClockHurry = (page: Page): Promise<boolean | null> =>
  page.evaluate(() => {
    const found = (window.__mansion as unknown as { three(): { scene: { getObjectByName(n: string): { userData: { hurry: boolean } } | undefined } } }).three().scene.getObjectByName("my-clock");
    return found ? found.userData.hurry : null;
  });

test("turns run out: countdowns on the plates and by my hand, strikes, a bot takes the seat at three, a second removal benches", async ({ browser }) => {
  const ann = await enter(browser, "Ann", undefined, true, false);
  const { page } = ann;
  await page.waitForFunction(() => window.__mansion.local.getState().playerPose !== null);
  await sitAt(page, SPADES_1);
  const bo = (await enter(browser, "Bo", ann.code)).page;
  await bo.getByTestId("table-spades-1").click();
  await bo.getByTestId("sit-2").click();
  await bo.getByTestId("ready").click();
  await click(page, "ready");
  await expect
    .poll(() => page.evaluate(() => (window.__mansion.getState().room as unknown as { tables: { id: string; seats: { ready: boolean }[] }[] }).tables.find((t) => t.id === "spades-1")!.seats.filter((s) => s.ready).length))
    .toBe(2);
  await click(page, "start");

  // This file's server, with its two-second clock: a person is on it soon after the deal.
  await expect.poll(async () => (await clocks(page)).clock?.totalMs ?? null, { timeout: 15_000 }).toBe(2000);
  expect((await clocks(page)).matchTime["spades-1"]?.running).toBe(true);

  // The match clock over the table, from my seat: looking up, as a seated player does to read it.
  await look(page, 0, -340);
  await settle(page, 500);
  await snap(page, "match-from-seat");
  await look(page, 0, 340);

  // The countdowns and a strike on each side, each photographed while it is on: the turns come round until Ann is taken off.
  const wanted = new Set(["seat-plate", "my-countdown", "strikes"]);
  for (let tries = 0; wanted.size && tries < 400; tries += 1) {
    const now = await clocks(page);
    if (!now.seated) break;
    if (wanted.has("seat-plate") && now.clock?.seat === 2) {
      await settle(page, 250);
      await snap(page, "seat-plate");
      wanted.delete("seat-plate");
    } else if (wanted.has("my-countdown") && now.clock?.seat === 0) {
      await settle(page, 250);
      // In the last ten seconds (all of a two-second turn): drawn red, with a triangle for its dot.
      expect(await myClockHurry(page)).toBe(true);
      await snap(page, "my-countdown");
      wanted.delete("my-countdown");
    } else if (wanted.has("strikes") && now.strikes && now.strikes[0] >= 1 && now.strikes[2] >= 1) {
      await settle(page, 250);
      await snap(page, "strikes");
      wanted.delete("strikes");
      await expect(page.getByTestId("hud-error")).toContainText(/Strike [12] of 3/);
    } else await page.waitForTimeout(100);
  }
  expect([...wanted]).toEqual([]);
  // My last seconds ticked (the sound; the buzz needs a controller).
  expect(await page.evaluate(() => (window.__mansion as unknown as { cues(): { cue: string }[] }).cues().some((c) => c.cue === "tick"))).toBe(true);

  // Bo's text panel: his countdown marked for the last seconds, said once, his strikes in his seat's line, the match time.
  await expect(bo.getByTestId("turn-clock")).toContainText(/▲ Your time: [12] s left/);
  await expect(bo.getByTestId("turn-alert")).toHaveText("2 seconds left");
  await expect(bo.getByTestId("seat-2")).toContainText(/Strike [12] of 3/);
  await expect(bo.getByTestId("match-time")).toContainText(/Match time: 0:\d\d/);

  // Three strikes each: both are taken off, told why, and with nobody left the match and its clock are gone.
  const removed = "Time ran out on 3 of your turns, so a bot took your seat.";
  await expect(page.getByTestId("hud-error")).toContainText(removed, { timeout: 60_000 });
  await expect(bo.getByTestId("hud-error")).toContainText(removed, { timeout: 60_000 });
  // A first removal does not bench.
  await expect(bo.getByTestId("hud-error")).not.toContainText("take a seat again");
  await expect.poll(async () => (await clocks(page)).matchTime["spades-1"], { timeout: 20_000 }).toBeNull();

  // Bo opens the other table alone while Ann watches it from across the room.
  await standAcross(page, SPADES_2, 7.5);
  await bo.getByTestId("tables-back").click();
  await bo.getByTestId("table-spades-2").click();
  await bo.getByTestId("sit-0").click();
  await bo.getByTestId("ready").click();
  await bo.getByTestId("start").click();
  await expect.poll(async () => (await clocks(page)).matchTime["spades-2"]?.running ?? false).toBe(true);
  // Long enough to count past 0:00, and well inside his three two-second turns.
  await settle(page, 1300);
  await snap(page, "match-across-room");

  // His second removal in this room benches him: sitting anywhere is refused, with the time left.
  await expect(bo.getByTestId("hud-error")).toContainText("You can take a seat again in 10 minutes 0 seconds.", { timeout: 60_000 });
  await expect.poll(async () => (await clocks(page)).matchTime["spades-2"], { timeout: 20_000 }).toBeNull();
  await bo.getByTestId("sit-0").click();
  // Rounded up, so in its first second the bench still reads 10 minutes 0 seconds.
  const benched = /You ran out of time on too many turns\. You can take a seat again in (10 minutes 0|9 minutes \d+) seconds?\./;
  await expect(bo.getByTestId("table-error")).toContainText(benched);
  await expect(bo.getByTestId("hud-error")).toContainText(benched);
  // He is still in the room and can watch.
  await expect(bo.getByTestId("members")).toContainText("Bo");

  await closeAll([page, bo]);
  expect(problems).toEqual([]);
});
