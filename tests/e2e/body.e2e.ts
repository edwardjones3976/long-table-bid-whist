/**
 * The player's body on the desktop, driven by the real keyboard and read through window.__mansion.rig() every
 * drawn frame: walking eases in, Shift runs, the furniture is solid and can be jumped onto, the pool is swum in
 * and left by its steps, teleports refuse what they must, and a second page sees the height. The places used
 * are worked out from the real ground (client/src/world/ground.ts), which the rig walks on.
 */
import { expect, test, type Page } from "@playwright/test";
import type { Pose } from "../../shared/protocol";
import { closeAll, enter, openMenu, problems, shoot, sitAt } from "./helpers";

test.beforeEach(() => void (problems.length = 0));

/** What rig() reports, plus the frame's time (ms). */
interface Frame {
  t: number;
  x: number;
  z: number;
  ry: number;
  y: number;
  vy: number;
  grounded: boolean;
  running: boolean;
  floating: boolean;
  aiming: boolean;
  aimValid: boolean;
}

const WALK = 2.2;
const RUN = 4;
/** The foyer bench: a box 1.9 m long and 0.5 m deep with round ends, seat 0.45 m high, its front face at z = 10.8. */
const BENCH = { x: -5.5, front: 10.8, back: 10.3, top: 0.45 };
/** The kitchen counter, 0.95 m high; its north face is at z = -10.0, with open floor north of it. */
const COUNTER = { x: 16, north: -10, top: 0.95 };
/** How far a held T throws the arc from a standing desktop view (eyes 1.6 m, arc from 1.3 m, 8 m/s, level). */
const THROW = 4.12;

const rig = (page: Page): Promise<Frame> => page.evaluate(() => ({ t: performance.now(), ...(window.__mansion as unknown as { rig(): Omit<Frame, "t"> }).rig() }));

/** Puts the player at a pose (the test hook; only onto ground a walker can stand on) and waits until the rig is there. */
async function goTo(page: Page, pose: Pose): Promise<void> {
  await page.evaluate((p) => window.__mansion.teleport(p), pose);
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - pose.x, r.z - pose.z) < 0.01 && r.grounded)).toBe(true);
  await page.waitForTimeout(200);
}

/** Starts writing down the rig every drawn frame; resolves once a few frames are down, so input given after it is all seen. */
const record = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((started) => {
        const w = window as unknown as { __trace: unknown[] | null; __mansion: { rig(): object } };
        const trace: unknown[] = [];
        w.__trace = trace;
        const step = (t: number): void => {
          if (w.__trace !== trace) return;
          trace.push({ t, ...w.__mansion.rig() });
          if (trace.length === 3) started();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
const recorded = (page: Page): Promise<Frame[]> =>
  page.evaluate(() => {
    const w = window as unknown as { __trace: unknown[] | null };
    const trace = w.__trace ?? [];
    w.__trace = null;
    return trace;
  }) as Promise<Frame[]>;

/** Ground speed between each frame and the one before, m/s. */
const speeds = (trace: Frame[]): { at: Frame; v: number }[] =>
  trace.slice(1).map((at, i) => ({ at, v: Math.hypot(at.x - trace[i].x, at.z - trace[i].z) / ((at.t - trace[i].t) / 1000) }));

/** A key held for `ms`: a real press lasts several frames. */
async function tap(page: Page, key: string, ms = 120): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Space held until the feet have left the ground: with two pages drawing, a frame can outlast a short tap. */
async function jump(page: Page): Promise<void> {
  await page.keyboard.down("Space");
  await expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(false);
  await page.keyboard.up("Space");
}
/** Until the feet are down again. */
const landed = (page: Page): Promise<void> => expect.poll(() => rig(page).then((r) => r.grounded), { intervals: [20] }).toBe(true);

/** Each take-off: where the feet left the ground and where they came down again. */
function jumps(trace: Frame[]): { from: Frame; to: Frame; peak: number }[] {
  const out: { from: Frame; to: Frame; peak: number }[] = [];
  for (let i = 1; i < trace.length; i += 1) {
    if (!(trace[i - 1].grounded && !trace[i].grounded)) continue;
    let j = i;
    while (j < trace.length && !trace[j].grounded) j += 1;
    if (j === trace.length) break;
    out.push({ from: trace[i - 1], to: trace[j], peak: Math.max(...trace.slice(i, j).map((f) => f.y)) });
  }
  return out;
}

const cues = (page: Page): Promise<string[]> => page.evaluate(() => (window.__mansion as unknown as { cues(): { cue: string }[] }).cues().map((c) => c.cue));

async function inRoom(page: Page): Promise<void> {
  await page.waitForFunction(() => (window.__mansion as unknown as { rig(): object | undefined }).rig() !== undefined);
}

test("walking eases in over several frames and Shift runs faster", async ({ browser }) => {
  const { page } = await enter(browser, "Walker", undefined, true, false);
  await inRoom(page);
  // The foyer from the front door, looking north: 7 m of open floor.
  await goTo(page, { x: 0, z: 15.5, ry: 0 });
  await record(page);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(800);
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(800);
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(300);
  const trace = await recorded(page);

  const all = speeds(trace);
  const walking = all.filter(({ at }) => !at.running);
  const start = walking.findIndex(({ v }) => v > 0.01);
  expect(start).toBeGreaterThan(0);
  // The first frame that moves is well short of walking speed: it eases in, not all at once.
  expect(walking[start].v).toBeLessThan(0.75 * WALK);
  // The steady speeds; a median, because a frame's time stamp and the time the rig was given can differ by a few ms.
  const median = (vs: number[]): number => [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)];
  const walk = median(walking.slice(start + 2).filter(({ v }) => v > 0.01).map(({ v }) => v));
  expect(walk).toBeGreaterThan(0.93 * WALK);
  expect(walk).toBeLessThan(1.07 * WALK);
  const run = median(all.filter(({ at }) => at.running).map(({ v }) => v));
  expect(run).toBeGreaterThan(0.93 * RUN);
  expect(run).toBeLessThan(1.07 * RUN);
  // Never off the floor, and straight ahead.
  for (const frame of trace) expect(frame.y).toBe(0);
  expect(Math.abs(trace.at(-1)!.x)).toBeLessThan(0.01);

  // The arrow keys walk too: left is a step sideways, with no turn.
  await goTo(page, { x: 0, z: 15.5, ry: 0 });
  const before = await rig(page);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowLeft");
  await page.waitForTimeout(300);
  const after = await rig(page);
  expect(before.x - after.x).toBeGreaterThan(0.5);
  expect(Math.abs(after.z - before.z)).toBeLessThan(0.01);
  expect(after.ry).toBeCloseTo(before.ry, 6);

  // Space jumps after the Menu is closed, by Esc or by a click on its button: the focus left behind does not take it.
  const menu = page.getByTestId("hud-menu");
  for (const close of ["Escape", "click"] as const) {
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    if (close === "Escape") await page.keyboard.press("Escape");
    else await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await jump(page);
    await landed(page);
    await page.waitForTimeout(300);
    await expect(menu, close).toHaveAttribute("aria-expanded", "false");
  }

  // A standard gamepad connected: the text panel shows, since the gamepad's bumpers step through its controls.
  const docked = page.locator('aside.panel[data-testid="table-picker"]');
  await expect(docked).toHaveCount(0);
  await page.evaluate(() => {
    const pad = { mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    window.dispatchEvent(new Event("gamepadconnected"));
  });
  await expect(docked).toHaveCount(1);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("furniture is solid: a bench stops a walker, a jump lands on its seat and stays, walking off drops to the floor, and another page sees the height", async ({ browser }) => {
  const { page, code } = await enter(browser, "Jumper", undefined, true, false);
  // The watcher draws the scene too, to photograph the jumper on the bench.
  const other = (await enter(browser, "Watcher", code, true, false)).page;
  await inRoom(page);
  await inRoom(other);
  await goTo(other, { x: -3.5, z: 13.5, ry: Math.atan2(-3.5 - BENCH.x, 13.5 - 10.55) });
  const me = await page.evaluate(() => window.__mansion.getState().room!.you);
  const seen = (): Promise<number | null> =>
    other.evaluate((id) => (window.__mansion.getState() as unknown as { poses: Record<string, Pose> }).poses[id]?.y ?? null, me);

  // Walk into the bench: stopped with the body's edge at its front face, still on the floor.
  await goTo(page, { x: BENCH.x, z: 12.2, ry: 0 });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1200);
  let now = await rig(page);
  expect(now.z).toBeGreaterThan(BENCH.front + 0.3 - 0.01);
  expect(now.y).toBe(0);

  // Still pushing forward, jump: the feet land on the seat.
  await record(page);
  await jump(page);
  await landed(page);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(500);
  now = await rig(page);
  expect(now.y).toBeCloseTo(BENCH.top, 3);
  expect(now.grounded).toBe(true);
  expect(now.z).toBeLessThan(BENCH.front + 0.3);
  // And stays there.
  await page.waitForTimeout(800);
  const still = await rig(page);
  expect(still.y).toBeCloseTo(BENCH.top, 3);
  expect(Math.hypot(still.x - now.x, still.z - now.z)).toBeLessThan(0.001);
  const [hop] = jumps(await recorded(page));
  expect(hop.peak).toBeGreaterThan(0.8);
  expect(hop.peak).toBeLessThan(0.9);
  expect(await cues(page)).toContain("land");
  // The other page has my pose with the height I stand at.
  await expect.poll(seen).toBeCloseTo(BENCH.top, 2);
  await shoot(other, "standing-on-bench");

  // Step off the front: a fall, landing exactly on the floor.
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(800);
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(800);
  now = await rig(page);
  expect(now.z).toBeGreaterThan(BENCH.front + 0.3);
  expect(now.y).toBe(0);
  expect(now.grounded).toBe(true);
  await expect.poll(seen).toBe(0);

  await closeAll([page, other]);
  expect(problems).toEqual([]);
});

test("jumping: one jump per press, a running jump goes farther, and 0.95 m is out of reach", async ({ browser }) => {
  const { page } = await enter(browser, "Hopper", undefined, true, false);
  await inRoom(page);

  /** A jump taken after `run`-up of 0.6 s, with a second press of Space at the top of it. */
  async function jumpAfterRunUp(shift: boolean): Promise<{ from: Frame; to: Frame; peak: number }[]> {
    await goTo(page, { x: 0, z: 15.5, ry: 0 });
    await record(page);
    if (shift) await page.keyboard.down("ShiftLeft");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(600);
    await jump(page);
    // Near the top of the jump, long before the landing: a second press does nothing.
    await expect.poll(() => rig(page).then((r) => r.y), { intervals: [20] }).toBeGreaterThan(0.6);
    await tap(page, "Space");
    expect((await rig(page)).grounded).toBe(false);
    await landed(page);
    await page.waitForTimeout(300);
    await page.keyboard.up("KeyW");
    if (shift) await page.keyboard.up("ShiftLeft");
    await page.waitForTimeout(600);
    return jumps(await recorded(page));
  }

  const walked = await jumpAfterRunUp(false);
  expect(walked).toHaveLength(1);
  expect(walked[0].peak).toBeGreaterThan(0.8);
  expect(walked[0].peak).toBeLessThan(0.9);
  expect(walked[0].to.y).toBe(0);
  const ran = await jumpAfterRunUp(true);
  expect(ran).toHaveLength(1);
  const far = (j: { from: Frame; to: Frame }): number => Math.hypot(j.to.x - j.from.x, j.to.z - j.from.z);
  // About 1.6 m walking and 2.9 m running: the take-off speed carries through the air.
  expect(far(walked[0])).toBeGreaterThan(1.2);
  expect(far(ran[0])).toBeGreaterThan(far(walked[0]) * 1.4);

  // The kitchen counter, from the open floor north of it: jumping at it all the way in, the feet never get on top.
  await goTo(page, { x: COUNTER.x, z: COUNTER.north - 0.6, ry: Math.PI });
  await record(page);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(700);
  await jump(page);
  await landed(page);
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyW");
  const trace = await recorded(page);
  const end = trace.at(-1)!;
  expect(end.y).toBe(0);
  expect(end.z).toBeLessThan(COUNTER.north - 0.3 + 0.01);
  expect(Math.max(...trace.map((f) => f.y))).toBeLessThan(COUNTER.top - 0.05);
  expect(jumps(trace)).toHaveLength(1);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("seated at a table: no walking, jumping or teleporting; turning still works", async ({ browser }) => {
  const { page } = await enter(browser, "Sitter", undefined, true, false);
  await inRoom(page);
  await sitAt(page, { x: -16, z: 13.5 });
  const seat = await rig(page);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyT");
  await page.waitForTimeout(200);
  await tap(page, "Space", 300);
  await page.waitForTimeout(600);
  const during = await rig(page);
  await page.keyboard.up("KeyT");
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(400);
  const after = await rig(page);
  for (const now of [during, after]) {
    expect(Math.hypot(now.x - seat.x, now.z - seat.z)).toBeLessThan(0.001);
    expect(now.y).toBe(0);
    expect(now.vy).toBe(0);
    expect(now.aiming).toBe(false);
  }
  expect(await page.evaluate(() => window.__mansion.getState().table?.you)).toBe(0);
  // A snap turn still turns.
  await tap(page, "KeyE");
  await page.waitForTimeout(300);
  expect(Math.abs((await rig(page)).ry - seat.ry)).toBeGreaterThan(0.4);
  await tap(page, "KeyR");

  // The menu over the seated view.
  await openMenu(page);
  await shoot(page, "menu-open-seated");

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("the pool: walk in and float, no jumping out of the deep end, out by the steps", async ({ browser }) => {
  test.setTimeout(240_000);
  const { page } = await enter(browser, "Swimmer", undefined, true, false);
  await inRoom(page);
  // On the deck south of the deep end, facing the water.
  await goTo(page, { x: -10, z: -30.4, ry: 0 });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyW");
  await expect.poll(() => rig(page).then((r) => r.floating)).toBe(true);
  // The eyes ride 0.25 m above the water (surface -0.12 m): feet at -1.47 m.
  await expect.poll(() => rig(page).then((r) => r.y)).toBeCloseTo(-1.47, 2);
  expect(await cues(page)).toContain("splash");
  await shoot(page, "floating-in-pool");

  // Back to the edge and jump, again and again: still in the water.
  await page.keyboard.down("KeyS");
  for (let i = 0; i < 4; i += 1) {
    await tap(page, "Space", 300);
    await page.waitForTimeout(250);
  }
  await page.keyboard.up("KeyS");
  const edge = await rig(page);
  expect(edge.floating).toBe(true);
  expect(edge.z).toBeLessThan(-31);
  expect(edge.y).toBeCloseTo(-1.47, 2);

  // West along the edge to the shallow end, where the feet touch, then up the steps and out.
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyA");
  await expect.poll(() => rig(page).then((r) => r.x), { timeout: 30_000 }).toBeLessThan(-22.5);
  await page.keyboard.up("KeyA");
  await page.keyboard.up("ShiftLeft");
  await page.waitForTimeout(400);
  const out = await rig(page);
  expect(out.floating).toBe(false);
  expect(out.grounded).toBe(true);
  expect(out.y).toBe(0);

  await closeAll([page]);
  expect(problems).toEqual([]);
});

test("teleport: refused through a wall and onto furniture without moving, and a clear aim moves", async ({ browser }) => {
  const { page } = await enter(browser, "Blinker", undefined, true, false);
  await inRoom(page);

  /** Holds T, reads the aim, lets go; returns the aim and where the player is afterwards. */
  async function teleport(from: Pose, shot?: string): Promise<{ aim: Frame; after: Frame }> {
    await goTo(page, from);
    await page.keyboard.down("KeyT");
    await page.waitForTimeout(500);
    const aim = await rig(page);
    if (shot) await shoot(page, shot);
    await page.keyboard.up("KeyT");
    await page.waitForTimeout(700);
    return { aim, after: await rig(page) };
  }

  // Through the foyer's north wall into the room beyond.
  const refusalsBefore = (await cues(page)).filter((c) => c === "refuse").length;
  const wall = await teleport({ x: 3, z: 11, ry: 0 }, "teleport-refused-wall");
  expect(wall.aim.aiming).toBe(true);
  expect(wall.aim.aimValid).toBe(false);
  expect(Math.hypot(wall.after.x - 3, wall.after.z - 11)).toBeLessThan(0.001);
  // Onto the bench's seat: furniture tops are for jumping.
  const bench = await teleport({ x: BENCH.x, z: 10.55 + THROW, ry: 0 });
  expect(bench.aim.aimValid).toBe(false);
  expect(Math.hypot(bench.after.x - BENCH.x, bench.after.z - (10.55 + THROW))).toBeLessThan(0.001);
  expect((await cues(page)).filter((c) => c === "refuse").length).toBe(refusalsBefore + 2);

  // Straight ahead over open floor.
  const clear = await teleport({ x: 0, z: 15.5, ry: 0 });
  expect(clear.aim.aimValid).toBe(true);
  expect(clear.after.x).toBeCloseTo(0, 2);
  expect(clear.after.z).toBeCloseTo(15.5 - THROW, 1);
  expect(clear.after.y).toBe(0);
  expect(await cues(page)).toContain("land");

  await closeAll([page]);
  expect(problems).toEqual([]);
});
