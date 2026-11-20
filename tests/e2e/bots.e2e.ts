/**
 * Bots are seen as people: once a match starts, every seat a bot plays has an avatar in the random look the server
 * picked for it, under a framed steel blue plate with an antenna that no person's plate has, seen from the person's own
 * seat and from across the room, and it leaves with the match (the last person leaving drops it). The room's three
 * walkers stroll their loops for anyone to see. "Show others as simple shapes" covers them all.
 *
 * The bot's reach over its own turn is checked in tests/client/bots.test.ts: these tests run the server's bots with no
 * pause (playwright.config.ts), so a bot's turn here lasts no frame at all. The shared test server has no walkers, so
 * this file runs its own with all three.
 *
 * Screenshots for a person to judge, in client/.e2e-screens/bots/: table (a person and three bots at Spades Table 1,
 * seen from beside it) and walker-1 to walker-3 (each walker a few metres ahead, walking on).
 */
import { expect, test, type Page } from "@playwright/test";
import { WALKERS, type Pose, type RoomSnapshot } from "../../shared/protocol";
import { tableSpot } from "../../client/src/world/layout";
import { closeAll, enter, ownServer, problems, settle, standBy } from "./helpers";

await ownServer({ WALKERS: String(WALKERS) });
test.beforeEach(() => void (problems.length = 0));

interface Drawn {
  memberId: string;
  lookKey: string;
  detail: string;
  animated: number;
}
/** The debug hooks this file needs beyond the shared Mansion type. */
interface Hooks {
  avatars(): Drawn[];
  local: { setComfort(partial: object): void };
  three(): { scene: import("three").Scene };
}

/** The figures drawn now whose id starts with `prefix`, by id. */
const drawn = (page: Page, prefix: string): Promise<Drawn[]> =>
  page.evaluate(
    (p) => (window.__mansion as unknown as Hooks).avatars().filter((a) => a.memberId.startsWith(p)).sort((a, b) => a.memberId.localeCompare(b.memberId)),
    prefix,
  );

const room = (page: Page): Promise<RoomSnapshot> => page.evaluate(() => window.__mansion.getState().room as unknown as RoomSnapshot);

/** Where a figure is now. */
const figureAt = (page: Page, id: string) =>
  page.evaluate((i) => {
    const { x, z } = (window.__mansion as unknown as Hooks).three().scene.getObjectByName(`avatar-${i}`)!.position;
    return { x, z };
  }, id);

/** A figure's plate colour (the plate's corner pixel), whether it carries the bots' frame and antenna, and the card backs in its hand. */
const marksOf = (page: Page, id: string) =>
  page.evaluate((i) => {
    const group = (window.__mansion as unknown as Hooks).three().scene.getObjectByName(`avatar-${i}`)!;
    const plate = group.getObjectByName("plate") as import("three").Mesh;
    const canvas = (plate.material as import("three").MeshBasicMaterial).map!.image as HTMLCanvasElement;
    return {
      colour: [...canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data.slice(0, 3)],
      frame: !!plate.getObjectByName("frame"),
      antenna: !!group.getObjectByName("antenna"),
      cards: (group.getObjectByName("fan") as import("three").InstancedMesh | undefined)?.count ?? 0,
    };
  }, id);

async function goTo(page: Page, pose: Pose): Promise<void> {
  await page.evaluate((p) => window.__mansion.teleport(p), pose);
  await page.waitForFunction((p) => {
    const at = window.__mansion.local.getState().playerPose;
    return at !== null && Math.hypot(at.x - p.x, at.z - p.z) < 0.05;
  }, pose);
}

test("bots sit at the table as avatars in the server's random looks, three walkers stroll the house, and the bots leave with the match", async ({ browser }) => {
  const viewer = await enter(browser, "Viewer", undefined, true, false);
  const solo = await enter(browser, "Solo", viewer.code, true);
  const tableId = "spades-1";
  await solo.page.getByTestId(`table-${tableId}`).click();
  await solo.page.getByTestId("sit-0").click();
  await solo.page.getByTestId("ready").click();
  await solo.page.getByTestId("start").click();
  await standBy(viewer.page, tableSpot(tableId));

  // Seats 1 to 3 are bots, seen from Solo's own seat and from across the room alike, and no other table has any.
  const ids = [1, 2, 3].map((seat) => `bot-${tableId}-${seat}`);
  for (const page of [solo.page, viewer.page]) await expect.poll(async () => (await drawn(page, "bot-")).map((bot) => bot.memberId)).toEqual(ids);
  expect(await drawn(viewer.page, "bot-tonk-1")).toEqual([]);

  // Each in the look its seat carries, no two alike.
  const seats = (await room(viewer.page)).tables.find((table) => table.id === tableId)!.seats;
  const bots = await drawn(viewer.page, "bot-");
  expect(bots.map((bot) => JSON.parse(bot.lookKey))).toEqual(seats.slice(1).map((seat) => seat.look));
  expect(new Set(bots.map((bot) => bot.lookKey)).size).toBe(3);

  // Every bot under a framed steel blue plate with an antenna; the person at the table has neither mark.
  for (const id of ids) expect(await marksOf(viewer.page, id)).toMatchObject({ colour: [0x7f, 0x9c, 0xbf], frame: true, antenna: true });
  const soloId = (await room(viewer.page)).members.find((member) => member.name === "Solo")!.id;
  expect(await marksOf(viewer.page, soloId)).toMatchObject({ frame: false, antenna: false });

  // At Solo's own table each bot holds as many card backs as its public hand count.
  await solo.page.waitForFunction(() => !!window.__mansion.getState().table?.view);
  const counts = await solo.page.evaluate(() => (window.__mansion.getState().table!.view as unknown as { handCounts: number[] }).handCounts);
  await expect.poll(async () => Promise.all(ids.map(async (id) => (await marksOf(solo.page, id)).cards))).toEqual(counts.slice(1));
  await settle(viewer.page, 1500);
  await viewer.page.screenshot({ path: "client/.e2e-screens/bots/table.png" });

  // Three walkers, not members, each in its own look from the room, no two alike.
  const { walkers, members } = await room(viewer.page);
  expect(walkers!.map((walker) => walker.id)).toEqual(["walker-1", "walker-2", "walker-3"]);
  expect(members.map((member) => member.id)).not.toContain("walker-1");
  await expect.poll(async () => (await drawn(viewer.page, "walker-")).map((walker) => JSON.parse(walker.lookKey))).toEqual(walkers!.map((walker) => walker.look));
  expect(new Set((await drawn(viewer.page, "walker-")).map((walker) => walker.lookKey)).size).toBe(3);

  // Each walker seen from where it was a few seconds ago (on its loop, so open floor), looking the way it went: near
  // detail, and posed frame after frame, so its legs walk and not only its place moves.
  for (const id of ["walker-1", "walker-2", "walker-3"]) {
    const from = await figureAt(viewer.page, id);
    await viewer.page.waitForTimeout(3000);
    const to = await figureAt(viewer.page, id);
    expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(1.5);
    // Forward is (-sin ry, -cos ry) (world/layout.ts).
    await goTo(viewer.page, { ...from, ry: Math.atan2(from.x - to.x, from.z - to.z) });
    await settle(viewer.page, 300);
    const [before] = await drawn(viewer.page, id);
    await settle(viewer.page, 500);
    const [after] = await drawn(viewer.page, id);
    expect(after.detail).toBe("near");
    expect(after.animated).toBeGreaterThan(before.animated);
    await viewer.page.screenshot({ path: `client/.e2e-screens/bots/${id}.png` });
  }

  // The comfort switch draws bots and walkers as simple shapes too.
  await viewer.page.evaluate(() => (window.__mansion as unknown as Hooks).local.setComfort({ simpleShapes: true }));
  await expect.poll(async () => [...(await drawn(viewer.page, "bot-")), ...(await drawn(viewer.page, "walker-"))].map((figure) => figure.detail)).toEqual(Array(6).fill("simple"));

  // The only person stands up: a match with nobody left to play it is over, and its bots go.
  await solo.page.getByTestId("leave").click();
  await expect.poll(async () => (await drawn(viewer.page, "bot-")).length).toBe(0);
  await closeAll([viewer.page, solo.page]);
  expect(problems).toEqual([]);
});
