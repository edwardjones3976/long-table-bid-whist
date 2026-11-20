/**
 * Moving about in an emulated headset (tests/e2e/headset.ts), with the controllers' sticks and buttons only: walking
 * and running on the move stick, a jump on A onto the foyer bench and off again, teleports aimed with the turn stick,
 * B, the pause between aims, "Teleport only" set from the VR menu with either hand, and a seat where none of it moves
 * the player. Every drawn frame is read through window.__mansion.rig(), which reports where the head is. It says
 * nothing about how any of it feels in a real headset.
 */
import { expect, test, type Page } from "@playwright/test";
import type { Pose } from "../../shared/protocol";
import { closeAll, problems } from "./helpers";
import {
  button,
  click,
  enterHeadset,
  feedbackFrom,
  frames,
  headAt,
  inPage,
  park,
  point,
  rayPress,
  rig,
  sitWithRay,
  startTrace,
  stick,
  stopTrace,
  type Drawn,
  type Rig,
  type Side,
} from "./headset";

test.beforeEach(() => void (problems.length = 0));

/** VR_GAIT in client/src/controls/motion.ts, m/s. */
const WALK = 1.8;
const RUN = 3.2;
/** Seconds from rest to walking speed (VR_GAIT.accel). */
const EASE = 0.08;
/** The foyer bench (as in body.e2e.ts): front face at z = 10.8, seat 0.45 m high. */
const BENCH = { x: -5.5, front: 10.8, top: 0.45 };
/** The body's radius (PLAYER_RADIUS in client/src/world/layout.ts). */
const RADIUS = 0.3;
const OPEN_FLOOR: Pose = { x: 0, z: 15.5, ry: 0 };
const BEHIND_WALL: Pose = { x: 3, z: 11, ry: 0 };

/** Puts the head at a pose (the test hook) and waits until the rig reports it there, standing. */
async function goTo(page: Page, pose: Pose): Promise<void> {
  await page.evaluate((p) => window.__mansion.teleport(p), pose);
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - pose.x, r.z - pose.z) < 0.01 && r.grounded)).toBe(true);
  await frames(page, 3);
}

/** Waits until the head has not moved for ten drawn frames. */
async function stopped(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const a = await rig(page);
      await frames(page, 10);
      const b = await rig(page);
      return Math.hypot(a.x - b.x, a.z - b.z, a.y - b.y);
    })
    .toBeLessThan(0.0005);
}

type Comfort = { locomotion: string; jump: boolean; haptics: boolean; dominantHand: string };
const comfort = (page: Page): Promise<Comfort> => page.evaluate(() => (window.__mansion.local.getState() as unknown as { comfort: Comfort }).comfort);
const menuOpen = (page: Page): Promise<boolean> => page.evaluate(() => (window.__mansion.local.getState() as unknown as { vrMenu: boolean }).vrMenu);

/**
 * Ground speed over each drawn frame, m/s: how far the head went since the frame before, over the time step the game
 * moved it by. Not over the wall-clock gap between the two drawings: that gap jitters by tens of milliseconds on this
 * emulator, which made a frame look up to half as fast again as it was.
 */
const speeds = (trace: Drawn[]): { at: Drawn; v: number }[] =>
  trace.slice(1).map((at, i) => ({ at, v: Math.hypot(at.rig.x - trace[i].rig.x, at.rig.z - trace[i].rig.z) / at.rig.dt }));
const median = (vs: number[]): number => [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)];

/** Points a hand's ray straight ahead, level, from beside and below the eyes: where a teleport is aimed from. */
const pointAhead = (page: Page, hand: Side): Promise<void> => point(page, hand, [hand === "left" ? -0.2 : 0.2, 1.3, -0.3], [0, 0, -1]);

test("standing in a headset: the move stick walks and eases in, its click runs, A jumps onto the bench, walking off drops, and the body is where the head is", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await enterHeadset(browser, "Walker");

  // Walk, then click the stick while walking: a run, until the stick is let go.
  await goTo(page, OPEN_FLOOR);
  await startTrace(page, []);
  await frames(page, 3);
  await stick(page, "left", 0, -1);
  await page.waitForTimeout(900);
  await click(page, "left", "thumbstick");
  await page.waitForTimeout(700);
  await stick(page, "left", 0, 0);
  await page.waitForTimeout(400);
  const walk = await stopTrace(page);
  const all = speeds(walk);
  const walking = all.filter(({ at }) => !at.rig.running);
  const start = walking.findIndex(({ v }) => v > 0.01);
  expect(start).toBeGreaterThan(0);
  const steady = median(walking.slice(start + 2).filter(({ v }) => v > 0.01).map(({ v }) => v));
  expect(steady).toBeGreaterThan(0.93 * WALK);
  expect(steady).toBeLessThan(1.07 * WALK);
  // Eased in: the first frame that moves is no faster than EASE seconds of easing allow. A frame of this emulator can
  // hold the whole ease, so how speed rises is measured in tests/client/controls.test.ts at 100 frames a second.
  const first = walking[start];
  expect(first.v).toBeLessThanOrEqual(WALK * Math.min(1, first.at.rig.dt / EASE) + 1e-6);
  const ran = all.filter(({ at }) => at.rig.running);
  expect(ran.length).toBeGreaterThan(2);
  const running = median(ran.map(({ v }) => v));
  expect(running).toBeGreaterThan(0.93 * RUN);
  expect(running).toBeLessThan(1.07 * RUN);
  // Smooth: never a frame faster than a run, never off the floor, straight ahead, and stopped when the stick is let go.
  expect(Math.max(...all.map(({ v }) => v))).toBeLessThan(1.1 * RUN);
  for (const row of walk) expect(row.rig.y).toBe(0);
  expect(Math.abs(walk.at(-1)!.rig.x - OPEN_FLOOR.x)).toBeLessThan(0.01);
  expect(walk.at(-1)!.rig.running).toBe(false);
  expect(all.at(-1)!.v).toBeLessThan(0.01);

  // A real step in the play space: the head is 0.1 m right of and 0.25 m ahead of the origin. Walking into the bench
  // stops the body under the head at the bench's face, not the origin's, and the head is where the eyes are.
  await headAt(page, 0.1, 1.6, -0.25);
  await goTo(page, { x: BENCH.x, z: 12.2, ry: 0 });
  await stick(page, "left", 0, -1);
  await stopped(page);
  let now = await rig(page);
  expect(now.z).toBeGreaterThan(BENCH.front + RADIUS - 0.01);
  expect(now.z).toBeLessThan(BENCH.front + RADIUS + 0.05);
  expect(now.x).toBeCloseTo(BENCH.x, 3);
  expect(now.y).toBe(0);
  const eyes = await page.evaluate(() => {
    const three = (window.__mansion as unknown as { three(): { gl: { xr: { getCamera(): { cameras: { matrixWorld: { elements: number[] } }[] } } } } }).three();
    const views = three.gl.xr.getCamera().cameras.map((view) => view.matrixWorld.elements);
    return { x: (views[0][12] + views[1][12]) / 2, z: (views[0][14] + views[1][14]) / 2 };
  });
  expect(Math.hypot(eyes.x - now.x, eyes.z - now.z)).toBeLessThan(0.002);

  // Still pushing forward, A: up onto the seat, and it stays there.
  const feedback = await feedbackFrom(page);
  await startTrace(page, []);
  await button(page, "right", "a-button", 1);
  await expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(false);
  await button(page, "right", "a-button", 0);
  await expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(true);
  await stick(page, "left", 0, 0);
  await page.waitForTimeout(500);
  const hop = await stopTrace(page);
  now = await rig(page);
  expect(now.y).toBeCloseTo(BENCH.top, 3);
  expect(now.z).toBeLessThan(BENCH.front + RADIUS);
  const peak = Math.max(...hop.map((row) => row.rig.y));
  expect(peak).toBeGreaterThan(0.8);
  expect(peak).toBeLessThan(0.9);
  await page.waitForTimeout(800);
  const stay = await rig(page);
  expect(stay.y).toBeCloseTo(BENCH.top, 3);
  expect(Math.hypot(stay.x - now.x, stay.z - now.z)).toBeLessThan(0.001);
  // The landing is felt in the hand that jumped.
  const given = await feedback();
  expect(given.cues.filter((c) => c.cue === "land")).toEqual([expect.objectContaining({ hand: "right" })]);
  expect(given.pulses.filter((p) => p.hand === "left")).toEqual([]);

  // Walk off the front: a fall to the floor.
  await stick(page, "left", 0, 1);
  await page.waitForTimeout(800);
  await stick(page, "left", 0, 0);
  await page.waitForTimeout(600);
  now = await rig(page);
  expect(now.z).toBeGreaterThan(BENCH.front + RADIUS);
  expect(now.y).toBe(0);
  expect(now.grounded).toBe(true);

  // A real step into a wall: the foyer's north wall (z = 10, 0.2 m thick) east of the arch. A step of 0.8 m would put
  // the head through it; the head is held at its last free spot, the body's edge no closer than the wall's face.
  await goTo(page, { x: 4, z: 10.6, ry: 0 });
  await headAt(page, 0.1, 1.6, -1.05);
  await frames(page, 6);
  now = await rig(page);
  expect(now.z).toBeGreaterThanOrEqual(10.1 + RADIUS - 0.01);
  expect(now.z).toBeLessThan(10.61);
  expect(now.x).toBeCloseTo(4, 2);
  await headAt(page, 0.1, 1.6, -0.25);

  // Main hand set to left from the VR menu: the left controller's X then jumps, the right one's A opens and closes the menu.
  await goTo(page, OPEN_FLOOR);
  await click(page, "left", "x-button");
  await expect.poll(() => menuOpen(page)).toBe(true);
  await rayPress(page, "right", "vr-menu-hand");
  await expect.poll(() => comfort(page).then((c) => c.dominantHand)).toBe("left");
  await park(page, "right");
  await click(page, "right", "a-button");
  await expect.poll(() => menuOpen(page)).toBe(false);
  const leftJump = await feedbackFrom(page);
  await button(page, "left", "x-button", 1);
  await expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(false);
  await button(page, "left", "x-button", 0);
  await expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(true);
  expect(await menuOpen(page)).toBe(false);
  expect((await leftJump()).cues.filter((c) => c.cue === "land")).toEqual([expect.objectContaining({ hand: "left" })]);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("teleport in a headset: the turn stick aims from that hand and lands on the mark, a wall refuses, the next aim waits out the pause, B cancels, and Teleport only set from the VR menu by either hand makes the move stick aim", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await enterHeadset(browser, "Blinker");
  let now: Rig;

  // A clear aim: the mark is ahead, and letting go puts the head on it.
  await goTo(page, OPEN_FLOOR);
  await pointAhead(page, "right");
  let feedback = await feedbackFrom(page);
  await stick(page, "right", 0, -1);
  await expect.poll(() => rig(page).then((r) => r.aiming && r.aimValid)).toBe(true);
  const aim = await rig(page);
  expect(OPEN_FLOOR.z - aim.aimZ).toBeGreaterThan(3);
  expect(Math.hypot(aim.x - OPEN_FLOOR.x, aim.z - OPEN_FLOOR.z)).toBeLessThan(0.001);
  await stick(page, "right", 0, 0);
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - aim.aimX, r.z - aim.aimZ))).toBeLessThan(0.01);
  expect((await rig(page)).y).toBe(aim.aimY);
  let given = await feedback();
  expect(given.cues.filter((c) => c.cue === "land")).toEqual([expect.objectContaining({ hand: "right" })]);
  expect(given.pulses.filter((p) => p.hand === "left")).toEqual([]);

  // Through the foyer's north wall: refused, and the player stays. Pushed again at once, the stick starts no aim until
  // the pause after the last one is over.
  await goTo(page, BEHIND_WALL);
  await pointAhead(page, "right");
  feedback = await feedbackFrom(page);
  await stick(page, "right", 0, -1);
  await expect.poll(() => rig(page).then((r) => r.aiming)).toBe(true);
  expect((await rig(page)).aimValid).toBe(false);
  await startTrace(page, []);
  await inPage(page, async (h) => {
    h.stick("right", 0, 0);
    await h.frames(1);
    h.stick("right", 0, -1);
    await h.frames(12);
  });
  const again = await stopTrace(page);
  await stick(page, "right", 0, 0);
  await frames(page, 6);
  const released = again.findIndex((row) => !row.rig.aiming);
  const restarted = again.findIndex((row, i) => i > released && row.rig.aiming);
  expect(released).toBeGreaterThanOrEqual(0);
  expect(restarted).toBeGreaterThan(released);
  // The pause is a quarter of a second of game time: the aim comes back on the first frame that ends it, not before.
  const waited = (to: number): number => again.slice(released + 1, to + 1).reduce((sum, row) => sum + row.rig.dt, 0);
  expect(waited(restarted)).toBeGreaterThanOrEqual(0.25 - 1e-9);
  expect(waited(restarted - 1)).toBeLessThan(0.25);
  now = await rig(page);
  expect(Math.hypot(now.x - BEHIND_WALL.x, now.z - BEHIND_WALL.z)).toBeLessThan(0.001);
  given = await feedback();
  expect(given.cues.filter((c) => c.cue === "refuse").length).toBe(2);
  expect(given.cues.filter((c) => c.cue === "land")).toEqual([]);
  expect(given.cues.filter((c) => c.hand !== "right")).toEqual([]);

  // B while aiming: no teleport, and none either when the stick is then let go; the still-pushed stick starts no new aim.
  await goTo(page, OPEN_FLOOR);
  await pointAhead(page, "right");
  feedback = await feedbackFrom(page);
  await stick(page, "right", 0, -1);
  await expect.poll(() => rig(page).then((r) => r.aiming && r.aimValid)).toBe(true);
  await click(page, "right", "b-button");
  await expect.poll(() => rig(page).then((r) => r.aiming)).toBe(false);
  await page.waitForTimeout(600);
  expect((await rig(page)).aiming).toBe(false);
  await stick(page, "right", 0, 0);
  await page.waitForTimeout(600);
  now = await rig(page);
  expect(Math.hypot(now.x - OPEN_FLOOR.x, now.z - OPEN_FLOOR.z)).toBeLessThan(0.001);
  expect((await feedback()).cues.filter((c) => c.cue === "land" || c.cue === "refuse")).toEqual([]);
  await park(page, "right");

  // The VR menu: opened by the left hand's ray, "Move" pressed with the right's, closed with X.
  expect((await comfort(page)).locomotion).toBe("smooth");
  await rayPress(page, "left", "vr-menu");
  await expect.poll(() => menuOpen(page)).toBe(true);
  await park(page, "left");
  await rayPress(page, "right", "vr-menu-move");
  await expect.poll(() => comfort(page).then((c) => c.locomotion)).toBe("teleport");
  await park(page, "right");
  await click(page, "left", "x-button");
  await expect.poll(() => menuOpen(page)).toBe(false);

  // Teleport only: the move stick aims from the left hand and never walks.
  await goTo(page, OPEN_FLOOR);
  await pointAhead(page, "left");
  await stick(page, "left", 0, -1);
  await expect.poll(() => rig(page).then((r) => r.aiming && r.aimValid)).toBe(true);
  await page.waitForTimeout(400);
  const aimed = await rig(page);
  expect(Math.hypot(aimed.x - OPEN_FLOOR.x, aimed.z - OPEN_FLOOR.z)).toBeLessThan(0.001);
  await stick(page, "left", 0, 0);
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - aimed.aimX, r.z - aimed.aimZ))).toBeLessThan(0.01);
  const landed = await rig(page);
  await stick(page, "left", 1, 0);
  await page.waitForTimeout(700);
  now = await rig(page);
  expect(now.aiming).toBe(false);
  expect(Math.hypot(now.x - landed.x, now.z - landed.z)).toBeLessThan(0.001);
  await stick(page, "left", 0, 0);
  await park(page, "left");

  // Back to walking, with jumping and vibration off: X opens the menu, the left ray presses "Move" and "Vibration",
  // the right ray "Jumping" and then closes it.
  await click(page, "left", "x-button");
  await expect.poll(() => menuOpen(page)).toBe(true);
  await rayPress(page, "left", "vr-menu-move");
  await expect.poll(() => comfort(page).then((c) => c.locomotion)).toBe("smooth");
  await rayPress(page, "left", "vr-menu-haptics");
  await expect.poll(() => comfort(page).then((c) => c.haptics)).toBe(false);
  await park(page, "left");
  await rayPress(page, "right", "vr-menu-jump");
  await expect.poll(() => comfort(page).then((c) => c.jump)).toBe(false);
  await rayPress(page, "right", "vr-menu");
  await expect.poll(() => menuOpen(page)).toBe(false);
  await park(page, "right");
  // The move stick walks again.
  const before = await rig(page);
  await stick(page, "left", 0, -1);
  await page.waitForTimeout(600);
  await stick(page, "left", 0, 0);
  now = await rig(page);
  expect(before.z - now.z).toBeGreaterThan(0.3);
  expect(now.aiming).toBe(false);
  // Jumping off: A does nothing.
  await stopped(page);
  await startTrace(page, []);
  await button(page, "right", "a-button", 1);
  await page.waitForTimeout(500);
  await button(page, "right", "a-button", 0);
  await frames(page, 3);
  for (const row of await stopTrace(page)) expect([row.rig.y, row.rig.grounded]).toEqual([0, true]);
  // Vibration off: a teleport still lands, and its cue is named for the right hand, but no controller is buzzed.
  await pointAhead(page, "right");
  feedback = await feedbackFrom(page);
  await stick(page, "right", 0, -1);
  await expect.poll(() => rig(page).then((r) => r.aiming && r.aimValid)).toBe(true);
  await stick(page, "right", 0, 0);
  await expect.poll(() => feedback().then((f) => f.cues.map((c) => `${c.cue} ${c.hand}`))).toEqual(["land right"]);
  expect((await feedback()).pulses).toEqual([]);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("seated in a headset: no walking, running, jumping or teleporting; the turn stick turns and a stick click recentres", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await enterHeadset(browser, "Sitter");
  await sitWithRay(page, { x: -16, z: -4.5 }, "right");
  await frames(page, 4);
  const seat = await rig(page);
  await pointAhead(page, "right");
  await pointAhead(page, "left");
  await startTrace(page, []);
  // Every movement control at once: walk, run, jump and aim.
  await stick(page, "left", 0, -1);
  await click(page, "left", "thumbstick");
  await button(page, "right", "a-button", 1);
  await stick(page, "right", 0, -1);
  await page.waitForTimeout(800);
  await button(page, "right", "a-button", 0);
  await stick(page, "right", 0, 0);
  await stick(page, "left", 0, 0);
  await page.waitForTimeout(500);
  const tried = await stopTrace(page);
  for (const row of tried) {
    expect(Math.hypot(row.rig.x - seat.x, row.rig.z - seat.z)).toBeLessThan(0.001);
    expect(row.rig.y).toBe(0);
    expect(row.rig.aiming).toBe(false);
    expect(row.rig.running).toBe(false);
  }
  expect(await page.evaluate(() => window.__mansion.getState().table?.you)).toBe(0);

  // The turn stick still turns; a click of either stick brings the view back to face the table.
  await stick(page, "right", 1, 0);
  await frames(page, 3);
  await stick(page, "right", 0, 0);
  await frames(page, 3);
  const turned = await rig(page);
  expect(Math.abs(turned.ry - seat.ry)).toBeGreaterThan(0.4);
  expect(Math.hypot(turned.x - seat.x, turned.z - seat.z)).toBeLessThan(0.001);
  await click(page, "right", "thumbstick");
  await expect.poll(() => rig(page).then((r) => Math.abs(Math.atan2(Math.sin(r.ry - seat.ry), Math.cos(r.ry - seat.ry))))).toBeLessThan(0.01);

  // Turned in the seat, then the leave marker: a step back from the table, still facing where the head faces.
  await stick(page, "right", 1, 0);
  await frames(page, 3);
  await stick(page, "right", 0, 0);
  await frames(page, 3);
  const facing = (await rig(page)).ry;
  expect(Math.abs(Math.atan2(Math.sin(facing - seat.ry), Math.cos(facing - seat.ry)))).toBeGreaterThan(0.4);
  await rayPress(page, "right", "leave");
  await expect.poll(() => page.evaluate(() => window.__mansion.getState().table?.you ?? null)).toBeNull();
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - seat.x, r.z - seat.z))).toBeGreaterThan(0.3);
  await frames(page, 4);
  const stood = await rig(page);
  expect(Math.abs(Math.atan2(Math.sin(stood.ry - facing), Math.cos(stood.ry - facing)))).toBeLessThan(0.01);

  await closeAll([page]);
  expect(problems).toEqual([]);
});
