/**
 * The emulated headset the VR browser tests use: a Meta Quest 3 with two Touch Plus controllers, from the WebXR
 * emulator the XR library depends on (iwer 2.8, loaded from node_modules into the page; no network, no device).
 *
 * In the page, window.__hs moves each controller and works its buttons and stick. Every pose is in the XR origin's
 * own space, the space the emulator gives poses in, which the rig moves about the house.
 *   a hand's ray     is aimed by putting the controller a little short of a thing, pointing at its middle
 *   a hand's grip    is put on a thing by placing the controller so the grip space, the centre of the hand's grab
 *                    sphere, is at the thing's middle (the grip offset comes from the emulator's own controller layout)
 *   a parked hand    is above the head with its ray pointing at the sky, where it touches and points at nothing
 * Every buzz sent to a controller is written down (window.__pulses): the emulator's actuators take pulses but feel nothing.
 *
 * What the emulator cannot show: how anything feels or looks in a real headset (latency, jitter at 72 to 120 Hz,
 * comfort, buzz strength, real reach). It draws about fifteen frames a second here, on software GL.
 */
import { expect, type Browser, type Page } from "@playwright/test";
import { open, openMenu, still, tableOf, type Hand } from "./helpers";

export type Side = "left" | "right";
export interface CueEntry {
  cue: string;
  hand: string;
  at: number;
}
export interface Pulse {
  hand: Side;
  value: number;
  ms: number;
  at: number;
}
export interface Carried {
  pointerId: number;
  thing: string;
  hand: string;
  how: string;
  from: string;
  carrying: boolean;
  over: string | null;
}
export type Point = { x: number; y: number; z: number };
/** One drawn frame: the named things and both grips in the world, and what the rig reported. */
export interface Drawn {
  t: number;
  things: (Point | null)[];
  grips: Record<Side, Point>;
  rig: { x: number; z: number; ry: number; y: number; grounded: boolean; running: boolean; aiming: boolean; aimValid: boolean; dt: number };
}

/** What install() puts on the page, as the tests call it. */
export interface Hs {
  frame(): number;
  frames(count: number): Promise<void>;
  aim(hand: Side, name: string, back: number): boolean;
  gripOn(hand: Side, name: string, toward: string | null): number | null;
  moveBy(hand: Side, dx: number, dy: number, dz: number): void;
  carryOver(hand: Side, thing: string, zone: string, up: number, steps: number): Promise<boolean>;
  pull(hand: Side, metres: number, steps: number): Promise<void>;
  park(hand: Side): void;
  point(hand: Side, x: number, y: number, z: number, dx: number, dy: number, dz: number): void;
  button(hand: Side, id: string, value: number): void;
  stick(hand: Side, x: number, y: number): void;
  click(hand: Side, id: string): Promise<void>;
  trackHands(on: boolean): void;
  distance(hand: Side, name: string): number | null;
  startTrace(names: string[]): void;
  stopTrace(): Drawn[];
}
type HsWindow = { __hs: Hs; __pulses: Pulse[]; __xr: { position: { set(x: number, y: number, z: number): void }; controllers: Record<Side, { connected: boolean }> } };

/** Runs in the page before the app starts: installs the emulator and the helpers. It is serialised, so it uses nothing from outside. */
function install(): void {
  interface V {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): V;
    clone(): V;
    add(v: V): V;
    sub(v: V): V;
    normalize(): V;
    multiplyScalar(s: number): V;
    applyQuaternion(q: Q): V;
    distanceTo(v: V): number;
    length(): number;
    lengthSq(): number;
    dot(v: V): number;
    setFromMatrixPosition(m: unknown): V;
  }
  interface Q {
    x: number;
    y: number;
    z: number;
    w: number;
    clone(): Q;
    setFromUnitVectors(from: V, to: V): Q;
  }
  interface O {
    visible: boolean;
    parent: O | null;
    position: V;
    quaternion: Q;
    matrixWorld: unknown;
    getWorldPosition(v: V): V;
    worldToLocal(v: V): V;
    localToWorld(v: V): V;
    updateMatrixWorld(force?: boolean): void;
    getObjectByName(name: string): O | undefined;
    onAfterRender: (...args: unknown[]) => void;
  }
  interface Pad {
    hapticActuators: { pulse(value: number, ms: number): Promise<unknown> }[];
  }
  interface Controller {
    position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
    quaternion: { set(x: number, y: number, z: number, w: number): void };
    inputSource: { gamepad: Pad };
    updateButtonValue(id: string, value: number): void;
    updateAxes(id: string, x: number, y: number): void;
  }
  type Side = "left" | "right";
  type Three = { scene: O; camera: O; gl: { info: { render: { frame: number } }; xr: { getCamera(): O } } };
  interface Device {
    installRuntime(options: object): void;
    controllers: Record<Side, Controller>;
    hands: Record<Side, Controller & { updatePinchValue(value: number): void }>;
    primaryInputMode: "controller" | "hand";
  }
  const w = window as unknown as {
    IWER: { XRDevice: new (config: unknown) => Device; metaQuest3: { controllerConfig: { layout: Record<Side, { gripOffsetMatrix: number[] }> } } };
    __mansion: { three(): Three | undefined; rig(): unknown };
    __xr: unknown;
    __hs: unknown;
    __pulses: unknown[];
  };
  const { XRDevice, metaQuest3 } = w.IWER;
  const device = new XRDevice(metaQuest3);
  // Chromium has its own WebXR (with no headset behind it), which the emulator will not replace unless told to.
  device.installRuntime({ forceInstall: true });
  w.__xr = device;
  const SIDES: Side[] = ["left", "right"];
  const pulses: unknown[] = [];
  w.__pulses = pulses;
  for (const hand of SIDES) {
    const actuator = device.controllers[hand].inputSource.gamepad.hapticActuators[0];
    const pulse = actuator.pulse.bind(actuator);
    actuator.pulse = (value, ms) => {
      pulses.push({ hand, value, ms, at: performance.now() });
      return pulse(value, ms);
    };
  }
  // Where each grip space sits in its controller's target-ray space: the translation of the emulator's own grip offset.
  const gripOffset = (hand: Side): number[] => metaQuest3.controllerConfig.layout[hand].gripOffsetMatrix.slice(12, 15);

  const three = (): Three => w.__mansion.three()!;
  const vec = (x = 0, y = 0, z = 0): V => three().camera.position.clone().set(x, y, z);
  const origin = (): O => three().gl.xr.getCamera().parent!;
  const turn = (dir: V): Q => three().camera.quaternion.clone().setFromUnitVectors(vec(0, 0, -1), dir.clone().normalize());
  const DOWN = (): Q => turn(vec(0, -1, 0));
  const UP = (): Q => turn(vec(0, 1, 0));
  const poses: Record<Side, Q | null> = { left: null, right: null };
  // With tracked hands in place of the controllers (trackHands), a hand's ray is aimed the same way and a pinch is its one button.
  let tracked = false;
  const controller = (hand: Side): Controller => (tracked ? device.hands[hand] : device.controllers[hand]);
  const press = (hand: Side, id: string, value: number): void => {
    if (tracked) device.hands[hand].updatePinchValue(value);
    else device.controllers[hand].updateButtonValue(id, value);
  };
  const place = (hand: Side, at: V, q: Q): void => {
    controller(hand).position.set(at.x, at.y, at.z);
    controller(hand).quaternion.set(q.x, q.y, q.z, q.w);
    poses[hand] = q;
  };
  const held = (hand: Side): V => {
    const p = controller(hand).position;
    return vec(p.x, p.y, p.z);
  };
  /** The grip space's place in the origin's space: where the hand's grab sphere is. */
  const grip = (hand: Side): V => held(hand).add(vec(...(gripOffset(hand) as [number, number, number])).applyQuaternion(poses[hand] ?? DOWN()));
  /** A named thing, if it is in the scene and shown: nobody aims at what cannot be seen. */
  const find = (name: string): O | null => {
    const found = three().scene.getObjectByName(name);
    for (let at: O | null = found ?? null; at; at = at.parent) if (!at.visible) return null;
    return found ?? null;
  };
  const at = (name: string): V | null => {
    const found = find(name);
    if (!found) return null;
    three().scene.updateMatrixWorld(true);
    return origin().worldToLocal(found.getWorldPosition(vec()));
  };
  const frame = (): number => w.__mansion.three()?.gl.info.render.frame ?? 0;
  const frames = (count: number): Promise<void> =>
    new Promise((resolve) => {
      const from = frame();
      const timer = setInterval(() => {
        if (frame() < from + count) return;
        clearInterval(timer);
        resolve();
      }, 5);
    });
  let trace: { rows: unknown[]; scene: O; before: O["onAfterRender"] } | null = null;
  const moveBy = (hand: Side, dx: number, dy: number, dz: number): void => place(hand, held(hand).add(vec(dx, dy, dz)), poses[hand] ?? DOWN());

  w.__hs = {
    frame,
    frames,
    aim(hand: Side, name: string, back: number): boolean {
      const target = at(name);
      if (!target) return false;
      const head = three().gl.xr.getCamera().position.clone();
      const from = target.clone().add(head.sub(target).normalize().multiplyScalar(back));
      place(hand, from, turn(target.clone().sub(from)));
      return true;
    },
    /**
     * Puts the hand's grip on the thing's middle, its ray pointing down or at `toward`. Returns how far the ray passes
     * from the middle of `toward` (0 without one), or null when the thing is not there.
     */
    gripOn(hand: Side, name: string, toward: string | null): number | null {
      const target = at(name);
      const aimed = toward ? at(toward) : null;
      if (!target || (toward && !aimed)) return null;
      const offset = vec(...(gripOffset(hand) as [number, number, number]));
      let q = DOWN();
      let from = target.clone().sub(offset.clone().applyQuaternion(q));
      // The ray starts at the controller, 5 cm in front of the grip, so each round of aiming moves the grip's place a
      // little: repeated, it settles on `toward`'s middle. With `toward` 0.12 m away 6 rounds can still miss by 9 mm;
      // 40 settle anything 0.12 m or more away (nearer than about 0.1 m the ray starts past it and cannot).
      for (let round = 0; aimed && round < 40; round += 1) {
        q = turn(aimed.clone().sub(from));
        from = target.clone().sub(offset.clone().applyQuaternion(q));
      }
      place(hand, from, q);
      if (!aimed) return 0;
      const dir = vec(0, 0, -1).applyQuaternion(q);
      const to = aimed.clone().sub(from);
      return to.sub(dir.multiplyScalar(to.dot(vec(0, 0, -1).applyQuaternion(q)))).length();
    },
    moveBy,
    /** Moves the hand, a step a frame, until the thing it holds has its middle `up` above the zone's middle. False when either is missing. */
    async carryOver(hand: Side, thing: string, zone: string, up: number, steps: number): Promise<boolean> {
      const from = at(thing);
      const to = at(zone);
      if (!from || !to) return false;
      const step = to.add(vec(0, up, 0)).sub(from).multiplyScalar(1 / steps);
      for (let i = 0; i < steps; i += 1) {
        moveBy(hand, step.x, step.y, step.z);
        await frames(1);
      }
      return true;
    },
    /** Moves the hand level toward the eyes, a step a frame: pulling a pile toward oneself. */
    async pull(hand: Side, metres: number, steps: number): Promise<void> {
      const head = three().gl.xr.getCamera().position;
      const from = held(hand);
      const step = vec(head.x - from.x, 0, head.z - from.z).normalize().multiplyScalar(metres / steps);
      for (let i = 0; i < steps; i += 1) {
        moveBy(hand, step.x, 0, step.z);
        await frames(1);
      }
    },
    park(hand: Side): void {
      place(hand, vec(hand === "left" ? -0.35 : 0.35, 2.1, 0.2), UP());
    },
    point(hand: Side, x: number, y: number, z: number, dx: number, dy: number, dz: number): void {
      place(hand, vec(x, y, z), turn(vec(dx, dy, dz)));
    },
    button: press,
    stick(hand: Side, x: number, y: number): void {
      controller(hand).updateAxes("thumbstick", x, y);
    },
    /** Down for one drawn frame and up again: a quick click, however slowly frames are drawn. */
    async click(hand: Side, id: string): Promise<void> {
      press(hand, id, 1);
      await frames(1);
      press(hand, id, 0);
      await frames(2);
    },
    trackHands(on: boolean): void {
      device.primaryInputMode = on ? "hand" : "controller";
      tracked = on;
    },
    /** How far the hand's grip is from a thing's middle. */
    distance(hand: Side, name: string): number | null {
      const target = at(name);
      return target && target.distanceTo(grip(hand));
    },
    /** Writes down every drawn frame, read just after it was drawn: the named things and both grips in the world, and the rig. */
    startTrace(names: string[]): void {
      const { scene } = three();
      const rows: unknown[] = [];
      const before = scene.onAfterRender;
      trace = { rows, scene, before };
      scene.onAfterRender = (...args: unknown[]) => {
        before.apply(scene, args);
        const world = (o: O | null): { x: number; y: number; z: number } | null => {
          if (!o) return null;
          const { x, y, z } = vec().setFromMatrixPosition(o.matrixWorld);
          return { x, y, z };
        };
        const gripWorld = (hand: Side) => {
          const { x, y, z } = origin().localToWorld(grip(hand));
          return { x, y, z };
        };
        rows.push({ t: performance.now(), things: names.map((name) => world(three().scene.getObjectByName(name) ?? null)), grips: { left: gripWorld("left"), right: gripWorld("right") }, rig: w.__mansion.rig() });
      };
    },
    stopTrace(): unknown[] {
      if (!trace) return [];
      trace.scene.onAfterRender = trace.before;
      const { rows } = trace;
      trace = null;
      return rows;
    },
  };
}

const hs = <T>(page: Page, run: (hs: Hs, ...args: never[]) => T, ...args: unknown[]): Promise<Awaited<T>> =>
  page.evaluate(`(${run.toString()})(window.__hs, ...${JSON.stringify(args)})`) as Promise<Awaited<T>>;

/** Waits for this many drawn frames: software GL is slow, so steps are counted in frames, not time. */
export const frames = (page: Page, count: number): Promise<void> => hs(page, (h, n: number) => h.frames(n), count);

/** A page in a room, in an immersive session on the emulated headset, both controllers parked. */
export async function enterHeadset(browser: Browser, name: string): Promise<Page> {
  // As a player gets the game: no text table panel.
  const page = await open(browser, true, false);
  await page.addInitScript({ path: "node_modules/iwer/build/iwer.min.js" });
  await page.addInitScript(install);
  await page.reload();
  await page.getByTestId("entry-name").fill(name);
  await page.getByTestId("entry-create").click();
  await openMenu(page);
  await expect(page.getByTestId("enter-vr")).toBeEnabled();
  await page.getByTestId("enter-vr").click();
  await page.waitForFunction(() => (window.__mansion.local.getState() as unknown as { xrActive: boolean }).xrActive);
  await page.waitForFunction(() => (window.__mansion as unknown as { rig(): unknown }).rig() !== undefined);
  await park(page, "left");
  await park(page, "right");
  await frames(page, 3);
  return page;
}

export const park = (page: Page, hand: Side): Promise<void> => hs(page, (h, side: Side) => h.park(side), hand);
/** Holds the controller at `at` in the origin's space, its ray along `toward`: the way a hand points a teleport. */
export const point = (page: Page, hand: Side, at: [number, number, number], toward: [number, number, number]): Promise<void> =>
  hs(page, (h, side: Side, x: number, y: number, z: number, dx: number, dy: number, dz: number) => h.point(side, x, y, z, dx, dy, dz), hand, ...at, ...toward);
/** Runs `run` in the page with the helpers: for steps that must follow each other frame by frame, with no round trip between. */
export const inPage = <T>(page: Page, run: (hs: Hs) => T): Promise<Awaited<T>> => hs(page, run);
export const button = (page: Page, hand: Side, id: string, value: number): Promise<void> => hs(page, (h, side: Side, b: string, v: number) => h.button(side, b, v), hand, id, value);
export const stick = (page: Page, hand: Side, x: number, y: number): Promise<void> => hs(page, (h, side: Side, sx: number, sy: number) => h.stick(side, sx, sy), hand, x, y);
export const click = (page: Page, hand: Side, id: string): Promise<void> => hs(page, (h, side: Side, b: string) => h.click(side, b), hand, id);
export const moveBy = (page: Page, hand: Side, d: [number, number, number]): Promise<void> =>
  hs(page, (h, side: Side, x: number, y: number, z: number) => h.moveBy(side, x, y, z), hand, ...d);
export const pull = (page: Page, hand: Side, metres: number, steps = 5): Promise<void> => hs(page, (h, side: Side, m: number, s: number) => h.pull(side, m, s), hand, metres, steps);
export const distance = (page: Page, hand: Side, name: string): Promise<number | null> => hs(page, (h, side: Side, n: string) => h.distance(side, n), hand, name);
export const startTrace = (page: Page, names: string[]): Promise<void> => hs(page, (h, n: string[]) => h.startTrace(n), names);
export const stopTrace = (page: Page): Promise<Drawn[]> => hs(page, (h) => h.stopTrace());

/** Points the hand's ray at the named thing, from `back` metres short of it on the side of the eyes, once it is shown. */
export async function aim(page: Page, hand: Side, name: string, back = 0.4): Promise<void> {
  await expect.poll(() => hs(page, (h, side: Side, n: string, b: number) => h.aim(side, n, b), hand, name, back)).toBe(true);
  await frames(page, 2);
}

/** Points the hand's ray at a thing and clicks the trigger: a quick press. */
export async function rayPress(page: Page, hand: Side, name: string): Promise<void> {
  await aim(page, hand, name);
  await click(page, hand, "trigger");
  await frames(page, 2);
}

/** Puts the hand's grip on the thing's middle (its ray pointing down, or at `toward`); returns how far that ray passes from `toward`'s middle. */
export async function gripOn(page: Page, hand: Side, name: string, toward: string | null = null): Promise<number> {
  let miss: number | null = null;
  await expect.poll(async () => (miss = await hs(page, (h, side: Side, n: string, t: string | null) => h.gripOn(side, n, t), hand, name, toward))).not.toBeNull();
  await frames(page, 2);
  return miss!;
}

/** Moves the hand, a few steps a frame apart, until what it holds is `up` above the zone's middle. */
export async function carryOver(page: Page, hand: Side, thing: string, zone: string, up = 0.15, steps = 6): Promise<void> {
  expect(await hs(page, (h, side: Side, t: string, z: string, u: number, s: number) => h.carryOver(side, t, z, u, s), hand, thing, zone, up, steps)).toBe(true);
  await frames(page, 2);
}

export const carried = (page: Page): Promise<Carried[]> => page.evaluate(() => (window.__mansion as unknown as { carried(): Carried[] }).carried());
export const cues = (page: Page): Promise<CueEntry[]> => page.evaluate(() => (window.__mansion as unknown as { cues(): CueEntry[] }).cues());
export const pulses = (page: Page): Promise<Pulse[]> => page.evaluate(() => [...(window as unknown as HsWindow).__pulses]);

/** The cues and buzzes given from here on: call the result after an action to see them. */
export async function feedbackFrom(page: Page): Promise<() => Promise<{ cues: CueEntry[]; pulses: Pulse[] }>> {
  const [c, p] = [(await cues(page)).length, (await pulses(page)).length];
  // The cue log keeps the last 200; these tests stay far below that between two reads.
  return async () => ({ cues: (await cues(page)).slice(c), pulses: (await pulses(page)).slice(p) });
}

/** Puts tracked hands in place of the controllers, or the controllers back: from then on every helper drives that pair. */
export const trackHands = (page: Page, on: boolean): Promise<void> => hs(page, (h, value: boolean) => h.trackHands(value), on);

/** Turns a controller off (asleep, out of battery) or back on. */
export const connect = (page: Page, hand: Side, on: boolean): Promise<void> =>
  page.evaluate(([side, value]) => void ((window as unknown as HsWindow).__xr.controllers[side as Side].connected = value as boolean), [hand, on] as const);

/** Moves the emulated head inside the play space (a real step), in the origin's space. */
export const headAt = (page: Page, x: number, y: number, z: number): Promise<void> =>
  page.evaluate(([hx, hy, hz]) => (window as unknown as HsWindow).__xr.position.set(hx, hy, hz), [x, y, z]);

export interface Rig {
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
  aimX: number;
  aimY: number;
  aimZ: number;
  dt: number;
}
export const rig = (page: Page): Promise<Rig> => page.evaluate(() => (window.__mansion as unknown as { rig(): Rig }).rig());

/** A thing's middle in the world, or null. */
export const where = (page: Page, name: string): Promise<Point | null> =>
  page.evaluate((n) => (window.__mansion as unknown as { tablePoint(n: string): Point | null }).tablePoint(n), name);

/** Stands beside a table and sits in seat 0 by pressing the chair's marker with the right hand's ray. */
export async function sitWithRay(page: Page, centre: { x: number; z: number }, hand: Side = "right"): Promise<void> {
  const spot = await page.evaluate((c) => {
    for (const radius of [2.2, 2.5, 1.9, 2.8]) {
      for (let i = 0; i < 24; i += 1) {
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
  await expect.poll(() => rig(page).then((r) => Math.hypot(r.x - spot.x, r.z - spot.z))).toBeLessThan(0.05);
  await rayPress(page, hand, "sit-0");
  await expect.poll(() => tableOf(page).then((t) => t?.you)).toBe(0);
  await page.waitForFunction(() => window.__mansion.local.getState().seated !== null);
  // The view moves to the seat on the next frames; the hands are parked again where the seat puts them.
  await frames(page, 4);
  await park(page, hand);
}

const names = (page: Page): Promise<string[]> => page.evaluate(() => window.__mansion.tableNames());

/** Readies and starts with the table's tokens: `ready` by one hand's ray, `start` by the other's. Bots take the other seats. */
export async function readyAndStart(page: Page, tableId: string, readyHand: Side, startHand: Side): Promise<void> {
  await expect.poll(() => names(page)).toContain("ready");
  const ready = () =>
    page.evaluate((id) => (window.__mansion.getState().room as unknown as { tables: { id: string; seats: { ready: boolean }[] }[] }).tables.find((t) => t.id === id)!.seats[0].ready, tableId);
  await rayPress(page, readyHand, "ready");
  await expect.poll(ready).toBe(true);
  await park(page, readyHand);
  await rayPress(page, startHand, "start");
  await expect.poll(() => tableOf(page).then((t) => t?.phase ?? null)).not.toBeNull();
  await park(page, startHand);
}

/** Waits until the server says it is my move (in `phase`, when given), dealing again by ray if a hand ends first. */
export async function myTurn(page: Page, phase?: string): Promise<Hand> {
  const until = Date.now() + 120_000;
  for (;;) {
    const table = await tableOf(page);
    if (table?.legal && (!phase || table.phase === phase)) {
      // Cards ease into their new places when the hand changes: aim only once they have stopped.
      for (const id of table.hand) await still(page, `card-${id}`);
      return table;
    }
    if (table?.phase === "hand-over" && (await names(page)).includes("next-hand")) {
      await rayPress(page, "right", "next-hand");
      await park(page, "right");
      await expect.poll(() => tableOf(page).then((t) => t!.revision)).toBeGreaterThan(table.revision);
    }
    if (Date.now() > until) throw new Error(`Never my turn: ${JSON.stringify(table)}`);
    await page.waitForTimeout(200);
  }
}

/** The same thing's middle in two frames, in metres apart. */
export const apart = (a: Point | null, b: Point | null): number => (a && b ? Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) : Infinity);
