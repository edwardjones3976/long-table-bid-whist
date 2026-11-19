import { describe, expect, it } from "vitest";
import {
  AIM_PAUSE,
  aimStep,
  ARC_GRAVITY,
  arcFlightTime,
  deadZone,
  DESK_GAIT,
  EYES_ABOVE_WATER,
  flick,
  GRAVITY,
  headPose,
  JUMP_HEIGHT,
  makeAim,
  makeBody,
  moveBody,
  nearestWalkable,
  rigForHead,
  runLatch,
  smoothTurn,
  snapTurn,
  standing,
  standUpPose,
  STEP_TIME,
  stickAim,
  STOP_TIME,
  TELEPORT_RANGE,
  teleportTarget,
  VR_GAIT,
  WATER_SPEED,
  type Body,
  type BodyInput,
  type Gait,
} from "../../client/src/controls/motion";
import { STEP_UP, type Ground } from "../../client/src/world/ground";
import { EYE_HEIGHT_STANDING, isWalkable, PLAYER_RADIUS, spawn, tableSpots, WALL_THICKNESS } from "../../client/src/world/layout";

const DT = 1 / 60;
const R = PLAYER_RADIUS;
/** Facings: a body looking east walks toward +x. */
const EAST = -Math.PI / 2;
const WEST = Math.PI / 2;
const still: BodyInput = { forward: 0, strafe: 0, ry: 0, run: false, jump: false, mayJump: true };
const open = () => true;

/** A bare level floor with nothing on it. */
const flat: Ground = { blocked: () => false, floor: () => 0, water: () => null, wallBetween: () => false };

/** The level floor with one box on it, `top` high, from x0 to x1 and across every z. The body touches it within its own radius. */
function block(top: number, x0: number, x1: number): Ground {
  const touches = (x: number) => x > x0 - R && x < x1 + R;
  return { ...flat, blocked: (x, _z, reach) => touches(x) && top > reach, floor: (x, _z, reach) => (touches(x) && top <= reach ? top : 0) };
}

/** The mansion's own walls, tables and furniture, all as things that simply block. */
const house: Ground = { ...flat, blocked: (x, z) => !isWalkable(x, z) };

const SURFACE = -0.12;
/** Where a body of standing height floats. */
const FLOAT = SURFACE + EYES_ABOVE_WATER - EYE_HEIGHT_STANDING;
/** Going east: the deck, one step down, a shallow shelf, then the deep end. */
const pool: Ground = { ...flat, floor: (x) => (x <= 2 ? 0 : x <= 3 ? -0.3 : x <= 6 ? -0.6 : -1.8), water: (x) => (x > 2 ? SURFACE : null) };
/** A deck and a deep end with no steps. */
const tank: Ground = { ...flat, floor: (x) => (x <= 2 ? 0 : -1.8), water: (x) => (x > 2 ? SURFACE : null) };

/** Runs `count` frames with the same input and returns the cues they gave, in order. */
function frames(body: Body, input: Partial<BodyInput>, count: number, ground: Ground = flat, gait: Gait = DESK_GAIT, dt = DT): string[] {
  const cues: string[] = [];
  for (let i = 0; i < count; i++) {
    const cue = moveBody(body, { ...still, ...input }, dt, ground, gait);
    if (cue) cues.push(cue);
  }
  return cues;
}

const speed = (body: Body): number => Math.hypot(body.vx, body.vz);

/** A body already walking (or running) east at full speed. */
function walker(x: number, y = 0, pace = DESK_GAIT.walk): Body {
  return { ...makeBody(x, 0, y), vx: pace, running: pace > DESK_GAIT.walk };
}

/** One jump from standing still on `ground`; returns the frames it took to land and the highest the feet got. */
function hop(body: Body, input: Partial<BodyInput> = {}, ground: Ground = flat, dt = DT): { count: number; peak: number } {
  let peak = body.y;
  let count = 1;
  frames(body, { ...input, jump: true }, 1, ground, DESK_GAIT, dt);
  while (!body.grounded && !body.floating) {
    peak = Math.max(peak, body.y);
    frames(body, input, 1, ground, DESK_GAIT, dt);
    count += 1;
    if (count > 1000) throw new Error("The body never came down");
  }
  return { count, peak };
}

describe("dead zone", () => {
  it("ignores stick drift and reaches full scale without a jump", () => {
    expect(deadZone(0.1)).toBe(0);
    expect(deadZone(-0.15)).toBe(0);
    expect(deadZone(1)).toBe(1);
    expect(deadZone(-1)).toBe(-1);
    expect(deadZone(0.16)).toBeGreaterThan(0);
    expect(deadZone(0.16)).toBeLessThan(0.02);
    expect(deadZone(1.2)).toBe(1);
  });
});

describe("walking and running", () => {
  it("walks the way the head faces and strafes to its right", () => {
    const north = makeBody(0, 0);
    frames(north, { forward: 1 }, 60);
    expect(north.x).toBeCloseTo(0);
    expect(north.z).toBeLessThan(-1.9);
    const east = makeBody(0, 0);
    frames(east, { forward: 1, ry: EAST }, 60);
    expect(east.x).toBeGreaterThan(1.9);
    expect(east.z).toBeCloseTo(0);
    const right = makeBody(0, 0);
    frames(right, { strafe: 1 }, 60);
    expect(right.x).toBeGreaterThan(1.9);
    expect(right.z).toBeCloseTo(0);
  });

  it("reaches full speed and stops in the stated times, walking or running, on desktop and in VR", () => {
    for (const gait of [DESK_GAIT, VR_GAIT]) {
      for (const run of [false, true]) {
        const top = run ? gait.run : gait.walk;
        const body = makeBody(0, 0);
        const rise = Math.round(gait.accel / 0.01);
        frames(body, { forward: 1, run }, rise - 1, flat, gait, 0.01);
        expect(speed(body)).toBeGreaterThan(top * 0.8);
        expect(speed(body)).toBeLessThan(top * 0.95);
        frames(body, { forward: 1, run }, 1, flat, gait, 0.01);
        expect(speed(body)).toBeCloseTo(top, 6);
        expect(body.running).toBe(run);
        // The stick goes back to rest, which is also what ends a stick-click run.
        const fall = Math.round(STOP_TIME / 0.01);
        frames(body, {}, fall - 1, flat, gait, 0.01);
        expect(speed(body)).toBeGreaterThan(0);
        expect(speed(body)).toBeLessThan(top * 0.2);
        frames(body, {}, 1, flat, gait, 0.01);
        expect(speed(body)).toBe(0);
        frames(body, {}, 1, flat, gait, 0.01);
        expect(body.running).toBe(false);
      }
    }
    expect(DESK_GAIT).toEqual({ walk: 2.2, run: 4, accel: 0.12 });
    expect(VR_GAIT).toEqual({ walk: 1.8, run: 3.2, accel: 0.08 });
  });

  it("goes as fast as the stick is pushed, and no faster on a diagonal", () => {
    const half = makeBody(0, 0);
    frames(half, { forward: 0.5 }, 60);
    expect(speed(half)).toBeCloseTo(DESK_GAIT.walk / 2);
    const diagonal = makeBody(0, 0);
    frames(diagonal, { forward: 1, strafe: 1 }, 60);
    expect(speed(diagonal)).toBeCloseTo(DESK_GAIT.walk);
    const sprint = makeBody(0, 0);
    frames(sprint, { forward: 1, run: true }, 60);
    expect(speed(sprint)).toBeCloseTo(DESK_GAIT.run);
  });

  it("stays put with no input and after a stalled frame moves no more than a tenth of a second's worth", () => {
    const body = makeBody(1, 2);
    expect(frames(body, {}, 10)).toEqual([]);
    expect([body.x, body.z, body.y, speed(body), body.grounded]).toEqual([1, 2, 0, 0, true]);
    const stalled = walker(0);
    moveBody(stalled, { ...still, forward: 1, ry: EAST }, 5, flat, DESK_GAIT);
    expect(stalled.x).toBeCloseTo(DESK_GAIT.walk * 0.1);
  });

  it("is stopped by a wall and slides along it", () => {
    const wall: Ground = { ...flat, blocked: (x) => x >= 1 };
    const body = makeBody(0.9, 0);
    // Facing north-east: half of the push goes into the wall.
    frames(body, { forward: 1, ry: -Math.PI / 4 }, 60, wall);
    expect(body.x).toBeLessThan(1);
    expect(body.x).toBeGreaterThanOrEqual(0.9);
    expect(body.z).toBeLessThan(-1);
  });

  it("stops right against a wall, not up to a step short of it, at any frame length", () => {
    const wall: Ground = { ...flat, blocked: (x) => x >= 1 };
    for (const dt of [0.1, 1 / 15, 1 / 72]) {
      const body = walker(0.95, 0, DESK_GAIT.run);
      frames(body, { forward: 1, ry: EAST, run: true }, 1, wall, DESK_GAIT, dt);
      expect(body.x).toBeLessThan(1);
      expect(body.x).toBeGreaterThan(0.999);
    }
  });

  it("stays put in a corner", () => {
    const corner: Ground = { ...flat, blocked: (x, z) => x >= 1 || z <= -1 };
    const body = makeBody(0.99, -0.99);
    frames(body, { forward: 1, ry: -Math.PI / 4 }, 60, corner);
    expect(body.x).toBeLessThan(1);
    expect(body.z).toBeGreaterThan(-1);
    expect(Math.hypot(body.x - 0.99, body.z + 0.99)).toBeLessThan(0.02);
  });

  it("is never carried through a thin wall by a long frame at running speed", () => {
    // A band only 0.2 m deep: one 100 ms frame at 4 m/s covers twice that.
    const thin: Ground = { ...flat, blocked: (x) => x > 1 && x < 1.2 };
    for (const dt of [0.1, 1 / 20, 1 / 60]) {
      const body = walker(0, 0, DESK_GAIT.run);
      frames(body, { forward: 1, ry: EAST, run: true }, Math.round(3 / dt), thin, DESK_GAIT, dt);
      expect(body.x).toBeLessThanOrEqual(1);
      expect(body.x).toBeGreaterThan(0.8);
    }
  });

  it("never runs through the mansion's walls, at any frame length", () => {
    // East from the gallery into the solid wall at x = 8 (the nearest doors are at z = 5 and z = -9).
    const body = makeBody(6, 0.5);
    frames(body, { forward: 1, ry: EAST, run: true }, 200, house, DESK_GAIT, 0.5);
    expect(body.x).toBeLessThanOrEqual(8 - WALL_THICKNESS / 2 - PLAYER_RADIUS);
    expect(body.x).toBeGreaterThan(7);
    expect(isWalkable(body.x, body.z)).toBe(true);
  });

  it("walks through a doorway", () => {
    // East door of the gallery at z = 5.
    const body = makeBody(6, 5);
    frames(body, { forward: 1, ry: EAST }, 120, house);
    expect(body.x).toBeGreaterThan(9);
  });

  it("gets out when it starts inside something", () => {
    const table = tableSpots[0];
    const body = makeBody(table.x, table.z);
    frames(body, { forward: 1 }, 1, house);
    expect(isWalkable(body.x, body.z)).toBe(true);
  });
});

describe("steps and edges", () => {
  it("climbs a 0.2 m step in its stride, eased so the view does not jerk, and steps back down without falling", () => {
    const step = block(0.2, 1, 3);
    const body = makeBody(0, 0);
    let last = body.y;
    let airborne = false;
    for (let i = 0; i < 240; i++) {
      frames(body, { forward: 1, ry: EAST }, 1, step);
      expect(Math.abs(body.y - last)).toBeLessThanOrEqual((STEP_UP / STEP_TIME) * DT + 1e-9);
      last = body.y;
      airborne ||= !body.grounded;
      if (i === 60) expect(body.y).toBe(0.2);
    }
    expect(body.x).toBeGreaterThan(4);
    expect(body.y).toBe(0);
    expect(airborne).toBe(false);
  });

  it("is stopped by a 0.5 m block when walking", () => {
    const body = makeBody(0, 0);
    expect(frames(body, { forward: 1, ry: EAST }, 180, block(0.5, 1, 3))).toEqual([]);
    expect(body.x).toBeLessThanOrEqual(1 - R);
    expect(body.x).toBeGreaterThan(0.6);
    expect(body.y).toBe(0);
    expect(body.grounded).toBe(true);
  });

  it("falls when it walks off an edge higher than a step, and lands exactly on the floor", () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 90, 0.1]) {
      const platform = block(1, -5, 1);
      const body = walker(0.5, 1);
      const cues: string[] = [];
      let fell = 0;
      let lowest = body.y;
      for (let i = 0; i < Math.round(2 / dt); i++) {
        cues.push(...frames(body, { forward: 1, ry: EAST }, 1, platform, DESK_GAIT, dt));
        if (!body.grounded) fell += dt;
        lowest = Math.min(lowest, body.y);
      }
      expect(cues).toEqual(["land"]);
      expect(body.y).toBe(0);
      expect(lowest).toBe(0);
      expect(body.vy).toBe(0);
      expect(body.grounded).toBe(true);
      // A metre takes sqrt(2 / g) seconds to fall.
      expect(fell).toBeGreaterThan(Math.sqrt(2 / GRAVITY) - dt - 1e-9);
      expect(fell).toBeLessThan(Math.sqrt(2 / GRAVITY) + 2 * dt);
    }
  });
});

describe("jumping", () => {
  const flight = 2 * Math.sqrt((2 * JUMP_HEIGHT) / GRAVITY);

  it("peaks about 0.85 m up, is over in about 0.7 s and lands exactly, at any frame rate", () => {
    expect(JUMP_HEIGHT).toBe(0.85);
    expect(GRAVITY).toBe(13);
    expect(flight).toBeGreaterThan(0.7);
    expect(flight).toBeLessThan(0.75);
    for (const dt of [1 / 30, 1 / 60, 1 / 72, 1 / 90, 1 / 120, 0.1]) {
      const body = makeBody(0, 0);
      const { count, peak } = hop(body, {}, flat, dt);
      expect(peak).toBeGreaterThan(JUMP_HEIGHT - 0.02);
      expect(peak).toBeLessThanOrEqual(JUMP_HEIGHT + 1e-9);
      expect(count * dt).toBeGreaterThanOrEqual(flight - 1e-9);
      expect(count * dt).toBeLessThan(flight + dt + 1e-9);
      expect(body.y).toBe(0);
      expect(body.vy).toBe(0);
    }
  });

  it("gets onto a 0.75 m block, landing at exactly that height", () => {
    const bench = block(0.75, 1, 3);
    const body = makeBody(0, 0);
    // Walk into it first: the block stops a walker.
    frames(body, { forward: 1, ry: EAST }, 60, bench);
    expect(body.x).toBeLessThanOrEqual(1 - R);
    const cues = frames(body, { forward: 1, ry: EAST, jump: true }, 1, bench);
    cues.push(...frames(body, { forward: 1, ry: EAST }, 59, bench));
    expect(cues).toEqual(["land"]);
    expect(body.y).toBe(0.75);
    expect(body.grounded).toBe(true);
    expect(body.x).toBeGreaterThan(1 - R);
  });

  it("gets onto the same block from a standing jump with the stick pushed in the air", () => {
    const bench = block(0.75, 1, 3);
    const body = makeBody(1 - R - 0.01, 0);
    hop(body, { forward: 1, ry: EAST }, bench);
    expect(body.y).toBe(0.75);
  });

  it("cannot get onto a 0.95 m block", () => {
    const counter = block(0.95, 1, 3);
    for (const run of [false, true]) {
      const body = makeBody(-1, 0);
      frames(body, { forward: 1, ry: EAST, run }, 60, counter);
      const cues = frames(body, { forward: 1, ry: EAST, run, jump: true }, 1, counter);
      cues.push(...frames(body, { forward: 1, ry: EAST, run }, 89, counter));
      expect(cues).toEqual(["land"]);
      expect(body.y).toBe(0);
      expect(body.x).toBeLessThanOrEqual(1 - R);
    }
  });

  it("jumps clean over something low", () => {
    const board = block(0.5, 1, 1.2);
    const body = walker(-1.5, 0, DESK_GAIT.run);
    while (body.x < 0) frames(body, { forward: 1, ry: EAST, run: true }, 1, board);
    hop(body, { forward: 1, ry: EAST, run: true }, board);
    expect(body.y).toBe(0);
    expect(body.x).toBeGreaterThan(1.2 + R);
  });

  it("passes over something it cannot stand on only with its feet above it, and never sinks into it", () => {
    // A lounger's back: 0.7 m high from x = 1 to 1.2, nothing to stand on (Ground.blocked's `feet`).
    const top = 0.7;
    const touches = (x: number) => x > 1 - R && x < 1.2 + R;
    const back: Ground = { ...flat, blocked: (x, _z, _reach, feet = -Infinity) => touches(x) && top > Math.max(0.06, feet) };
    // Walking, it is in the way.
    const walking = makeBody(0, 0);
    frames(walking, { forward: 1, ry: EAST }, 60, back);
    expect(walking.x).toBeLessThanOrEqual(1 - R);
    // Jumps taken from all along the run-up, walking and running: whether a jump clears it, comes down on it and slides
    // off, or meets its side, the feet are never below its top while the body is over it.
    let cleared = 0;
    for (const run of [false, true]) {
      for (let from = -0.8; from <= 0.6; from += 0.1) {
        const body = walker(from, 0, run ? DESK_GAIT.run : DESK_GAIT.walk);
        frames(body, { forward: 1, ry: EAST, run, jump: true }, 1, back);
        for (let count = 0; !body.grounded; count++) {
          if (touches(body.x)) expect(body.y, `from ${from.toFixed(1)}`).toBeGreaterThanOrEqual(top - 1e-9);
          frames(body, { forward: 1, ry: EAST, run }, 1, back);
          if (count > 600) throw new Error("The body never came down");
        }
        expect(body.y).toBe(0);
        expect(touches(body.x)).toBe(false);
        if (body.x >= 1.2 + R) cleared += 1;
      }
    }
    expect(cleared).toBeGreaterThan(3);
  });

  it("carries its take-off speed, so a running jump lands farther than a walking one", () => {
    const leap = (run: boolean): number => {
      const body = makeBody(0, 0);
      frames(body, { forward: 1, ry: EAST, run }, 30);
      const from = body.x;
      hop(body, { forward: 1, ry: EAST, run });
      return body.x - from;
    };
    const walked = leap(false);
    const ran = leap(true);
    expect(walked).toBeGreaterThan(DESK_GAIT.walk * flight - 0.01);
    expect(walked).toBeLessThan(DESK_GAIT.walk * (flight + DT) + 0.01);
    expect(ran).toBeGreaterThan(DESK_GAIT.run * flight - 0.01);
    expect(ran).toBeGreaterThan(walked + 1);
  });

  it("keeps its speed in the air when the stick is let go, and is only nudged by the stick", () => {
    const body = walker(0);
    frames(body, { forward: 1, ry: EAST, jump: true }, 1);
    frames(body, {}, 20);
    expect(body.grounded).toBe(false);
    expect(body.vx).toBeCloseTo(DESK_GAIT.walk);
    const fromRest = makeBody(0, 0);
    hop(fromRest, { forward: 1, ry: EAST });
    expect(fromRest.x).toBeGreaterThan(0.3);
    expect(fromRest.x).toBeLessThan(0.6);
  });

  it("jumps once per press: not again in the air, and not again on landing while the control is still down", () => {
    const body = makeBody(0, 0);
    let takeOffs = 0;
    let peak = 0;
    const tick = (jump: boolean): void => {
      const was = body.grounded;
      frames(body, { jump }, 1);
      if (was && !body.grounded) takeOffs += 1;
      peak = Math.max(peak, body.y);
    };
    tick(true);
    for (let i = 0; i < 10; i++) tick(false);
    // A second press in the air, long before landing.
    tick(true);
    for (let i = 0; i < 120; i++) tick(true);
    expect(takeOffs).toBe(1);
    expect(peak).toBeLessThanOrEqual(JUMP_HEIGHT + 1e-9);
    expect(body.grounded).toBe(true);
    // Let go and press again: that is a new jump.
    tick(false);
    tick(true);
    expect(takeOffs).toBe(2);
  });

  it("still jumps when pressed just before landing, and not when pressed long before", () => {
    const landing = hop(makeBody(0, 0)).count;
    const early = (before: number): Body => {
      const body = makeBody(0, 0);
      frames(body, { jump: true }, 1);
      frames(body, {}, landing - 1 - before);
      frames(body, { jump: true }, before + 2);
      return body;
    };
    // About 0.07 s before the feet touch down.
    const caught = early(4);
    expect(caught.grounded).toBe(false);
    expect(caught.vy).toBeGreaterThan(0);
    // About 0.2 s before: forgotten by the time it lands.
    const missed = early(12);
    expect(missed.grounded).toBe(true);
    expect(missed.y).toBe(0);
  });

  it("still jumps just after walking off an edge, and not once it has been falling a while", () => {
    const late = (after: number): Body => {
      const body = walker(1, 1);
      const platform = block(1, -5, 1);
      while (body.grounded) frames(body, { forward: 1, ry: EAST }, 1, platform);
      frames(body, { forward: 1, ry: EAST }, after, platform);
      frames(body, { forward: 1, ry: EAST, jump: true }, 1, platform);
      return body;
    };
    // 0.05 s after the edge.
    const caught = late(3);
    expect(caught.vy).toBeGreaterThan(0);
    expect(caught.jumped).toBe(true);
    // 0.15 s after.
    const missed = late(9);
    expect(missed.vy).toBeLessThan(0);
    expect(missed.jumped).toBe(false);
  });

  it("does not jump while jumping is not allowed, and forgets a press made then", () => {
    const body = makeBody(0, 0);
    frames(body, { jump: true, mayJump: false }, 3);
    expect(body.grounded).toBe(true);
    // Allowed again with the control still down from before: no jump until it is let go and pressed.
    frames(body, { jump: true }, 3);
    expect(body.grounded).toBe(true);
    frames(body, {}, 1);
    frames(body, { jump: true }, 1);
    expect(body.grounded).toBe(false);
  });
});

describe("water", () => {
  it("wades in by the steps, floats in the deep end at half speed and comes out the same way", () => {
    const body = makeBody(0, 0);
    const cues: string[] = [];
    let lowest = 0;
    let wading = 0;
    for (let i = 0; i < 600; i++) {
      cues.push(...frames(body, { forward: 1, ry: EAST }, 1, pool));
      lowest = Math.min(lowest, body.y);
      if (body.x > 4 && body.x < 5) {
        // The shallow shelf is ordinary walking.
        expect(body.grounded).toBe(true);
        expect(body.y).toBe(-0.6);
        expect(speed(body)).toBeCloseTo(DESK_GAIT.walk);
        wading += 1;
      }
    }
    expect(wading).toBeGreaterThan(10);
    expect(cues).toEqual(["splash"]);
    expect(body.floating).toBe(true);
    expect(body.grounded).toBe(false);
    // Eyes a quarter of a metre above the surface, and never any lower on the way there.
    expect(body.y + EYE_HEIGHT_STANDING).toBeCloseTo(SURFACE + 0.25);
    expect(lowest).toBeGreaterThanOrEqual(FLOAT - 1e-9);
    expect(speed(body)).toBeCloseTo(DESK_GAIT.walk * WATER_SPEED);
    expect(WATER_SPEED).toBe(0.5);

    // No jumping out of deep water.
    frames(body, { jump: true }, 1, pool);
    frames(body, {}, 20, pool);
    expect(body.floating).toBe(true);
    expect(body.y).toBeCloseTo(FLOAT);

    // Back to the shelf, up the step and out.
    const out = frames(body, { forward: 1, ry: WEST }, 900, pool);
    expect(out).toEqual([]);
    expect(body.x).toBeLessThan(2);
    expect(body.y).toBe(0);
    expect(body.grounded).toBe(true);
    expect(body.wet).toBe(false);
  });

  it("can be jumped into, and has no way out over the side", () => {
    const body = makeBody(0, 0);
    frames(body, { forward: 1, ry: EAST, run: true }, 20, tank);
    const cues = frames(body, { forward: 1, ry: EAST, run: true, jump: true }, 1, tank);
    let lowest = 0;
    for (let i = 0; i < 180; i++) {
      cues.push(...frames(body, {}, 1, tank));
      lowest = Math.min(lowest, body.y);
    }
    expect(cues).toEqual(["splash"]);
    expect(body.floating).toBe(true);
    expect(body.y).toBeCloseTo(FLOAT);
    expect(lowest).toBeGreaterThanOrEqual(FLOAT - 1e-9);
    // Swimming at the wall, and trying to jump at it, gets nowhere.
    frames(body, { forward: 1, ry: WEST }, 300, tank);
    frames(body, { forward: 1, ry: WEST, jump: true }, 1, tank);
    frames(body, { forward: 1, ry: WEST }, 60, tank);
    expect(body.x).toBeGreaterThan(2);
    expect(body.floating).toBe(true);
  });

  it("lets a wader jump, since shallow water is ordinary walking", () => {
    const body = makeBody(4.5, 0, -0.6);
    frames(body, {}, 2, pool);
    const { peak } = hop(body, {}, pool);
    expect(peak).toBeGreaterThan(-0.6 + JUMP_HEIGHT - 0.02);
    expect(body.y).toBe(-0.6);
  });
});

describe("smooth turn", () => {
  it("turns to the right for a positive turn and hands back the same pose for none", () => {
    const pose = { x: 1, z: 2, ry: 0.3 };
    expect(smoothTurn(pose, 0, DT)).toBe(pose);
    const right = smoothTurn(pose, 1, 0.1);
    expect(right).toEqual({ x: 1, z: 2, ry: expect.closeTo(0.1) });
    expect(smoothTurn(pose, 1, 5).ry).toBeCloseTo(0.1);
  });
});

describe("snap turn", () => {
  it("turns by the given angle and keeps the position", () => {
    const right = snapTurn({ x: 1, z: 2, ry: 0 }, 1, 30);
    expect(right).toEqual({ x: 1, z: 2, ry: expect.closeTo(-Math.PI / 6) });
    expect(snapTurn(right, -1, 30).ry).toBeCloseTo(0);
  });

  it("comes back to the start after a full circle and stays in range", () => {
    let pose = { x: 0, z: 0, ry: 0 };
    for (let i = 0; i < 12; i++) {
      pose = snapTurn(pose, 1, 30);
      expect(Math.abs(pose.ry)).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
    expect(Math.sin(pose.ry)).toBeCloseTo(0);
    expect(Math.cos(pose.ry)).toBeCloseTo(1);
  });
});

describe("sticks", () => {
  it("flick fires once per push and re-arms only near the centre", () => {
    const stick = { armed: true };
    expect(flick(0.9, stick)).toBe(1);
    expect(flick(0.9, stick)).toBe(0);
    expect(flick(0.45, stick)).toBe(0);
    expect(flick(0.9, stick)).toBe(0);
    expect(flick(0.1, stick)).toBe(0);
    expect(flick(-0.7, stick)).toBe(-1);
    expect(flick(0.5, { armed: true })).toBe(0);
  });

  it("a stick click while walking runs until the stick is back at rest", () => {
    expect(runLatch(false, true, true)).toBe(true);
    expect(runLatch(true, false, true)).toBe(true);
    expect(runLatch(true, false, false)).toBe(false);
    // A click with the stick at rest starts nothing, and walking alone is not running.
    expect(runLatch(false, true, false)).toBe(false);
    expect(runLatch(false, false, true)).toBe(false);
  });

  it("a stick aims a teleport only when pushed mostly forward, and until it is back near rest", () => {
    expect(stickAim(false, 0, -0.9)).toBe(true);
    expect(stickAim(false, 0, -0.5)).toBe(false);
    // Sideways is a turn and back is nothing.
    expect(stickAim(false, 0.9, -0.3)).toBe(false);
    expect(stickAim(false, 0.7, -0.65)).toBe(false);
    expect(stickAim(false, 0, 0.9)).toBe(false);
    // Once aiming, it wanders freely until let go.
    expect(stickAim(true, 0.8, 0.2)).toBe(true);
    expect(stickAim(true, 0.1, -0.2)).toBe(false);
  });
});

describe("teleport", () => {
  const here = { x: 0, z: 0 };

  it("lands on bare floor within range", () => {
    expect(teleportTarget(flat, here, 2, -3)).toEqual({ x: 2, z: -3, y: 0, water: null, why: null });
    expect(teleportTarget(flat, here, 0, -TELEPORT_RANGE + 0.1).why).toBeNull();
    expect(teleportTarget(house, spawn, spawn.x + 2, spawn.z - 3).why).toBeNull();
  });

  it("refuses targets out of range, in walls, on tables, off the property and not-a-number", () => {
    expect(teleportTarget(flat, here, 0, -TELEPORT_RANGE - 0.1).why).toBe("Too far");
    expect(teleportTarget(house, { x: 6, z: 0.5 }, 8, 0.5).why).toBe("Blocked");
    const table = tableSpots[0];
    expect(teleportTarget(house, { x: table.x + 2, z: table.z }, table.x, table.z).why).toBe("Blocked");
    expect(teleportTarget(house, spawn, spawn.x, 19).why).toBe("Blocked");
    expect(teleportTarget(flat, here, NaN, 0).why).toBe("Blocked");
    expect(teleportTarget(flat, here, 0, Infinity).why).toBe("Blocked");
  });

  it("refuses a target with a wall between, even a close one", () => {
    const walled: Ground = { ...flat, wallBetween: (x0, _z0, x1) => (x0 < 1) !== (x1 < 1) };
    expect(teleportTarget(walled, here, 2, 0).why).toBe("Blocked");
    expect(teleportTarget(walled, here, 0.5, -2).why).toBeNull();
    expect(teleportTarget(walled, { x: 3, z: 0 }, 2, 0).why).toBeNull();
  });

  it("lands on what a walker could step onto, and leaves furniture tops to jumping", () => {
    expect(teleportTarget(block(0.3, 1, 3), here, 2, 0)).toEqual({ x: 2, z: 0, y: 0.3, water: null, why: null });
    expect(teleportTarget(block(0.45, 1, 3), here, 2, 0)).toMatchObject({ y: 0, why: "Blocked" });
    expect(standing(block(0.3, 1, 3), 2, 0)).toBe(0.3);
    expect(standing(block(0.45, 1, 3), 2, 0)).toBeNull();
    expect(standing(flat, 5, 5)).toBe(0);
  });

  it("lands in water shallow enough to stand in and refuses the deep end", () => {
    expect(teleportTarget(pool, { x: 3, z: 0 }, 4.5, 0)).toEqual({ x: 4.5, z: 0, y: -0.6, water: SURFACE, why: null });
    expect(teleportTarget(pool, { x: 3, z: 0 }, 7, 0)).toMatchObject({ y: -1.8, water: SURFACE, why: "Too deep" });
  });

  it("times the arc so the ball is on the floor when it lands", () => {
    for (const [y, vy] of [[1.6, 0], [1.2, 4], [1.6, -6], [0, 3]]) {
      const t = arcFlightTime(y, vy);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(y + vy * t - (ARC_GRAVITY / 2) * t * t).toBeCloseTo(0);
    }
  });
});

describe("teleport aim", () => {
  const rest = { left: false, right: false, view: false };

  it("is held by whoever pushed first, and letting go is reported once", () => {
    const aim = makeAim();
    expect(aimStep(aim, { ...rest, right: true }, true, false, DT)).toBe(false);
    expect(aim.source).toBe("right");
    // The other stick pushed as well changes nothing.
    expect(aimStep(aim, { ...rest, left: true, right: true }, true, false, DT)).toBe(false);
    expect(aim.source).toBe("right");
    expect(aimStep(aim, { ...rest, left: true }, true, false, DT)).toBe(true);
    expect(aim.source).toBeNull();
    // The stick still pushed from before does not start an aim of its own, however long it is held.
    for (let i = 0; i < 60; i++) expect(aimStep(aim, { ...rest, left: true }, true, false, DT)).toBe(false);
    expect(aim.source).toBeNull();
    // Back to rest, then pushed again: a new aim.
    aimStep(aim, rest, true, false, DT);
    aimStep(aim, { ...rest, left: true }, true, false, DT);
    expect(aim.source).toBe("left");
  });

  it("pauses a quarter of a second after an aim, so a bouncing stick cannot teleport twice", () => {
    expect(AIM_PAUSE).toBe(0.25);
    const aim = makeAim();
    aimStep(aim, { ...rest, view: true }, true, false, DT);
    expect(aimStep(aim, rest, true, false, DT)).toBe(true);
    // The stick bounces forward again for a few frames and settles.
    for (let i = 0; i < 6; i++) {
      expect(aimStep(aim, { ...rest, view: true }, true, false, DT)).toBe(false);
      expect(aim.source).toBeNull();
    }
    for (let i = 0; i < 30; i++) expect(aimStep(aim, rest, true, false, DT)).toBe(false);
    expect(aim.source).toBeNull();

    // A push that is held through the pause starts when the pause is over, not before.
    const held = makeAim();
    aimStep(held, { ...rest, view: true }, true, false, DT);
    aimStep(held, rest, true, false, DT);
    aimStep(held, { ...rest, view: true }, true, false, 0.2);
    expect(held.source).toBeNull();
    aimStep(held, { ...rest, view: true }, true, false, 0.1);
    expect(held.source).toBe("view");
  });

  it("is ended by cancel without a teleport, and the control must be let go before it aims again", () => {
    const aim = makeAim();
    aimStep(aim, { ...rest, left: true }, true, false, DT);
    expect(aimStep(aim, { ...rest, left: true }, true, true, DT)).toBe(false);
    expect(aim.source).toBeNull();
    for (let i = 0; i < 60; i++) aimStep(aim, { ...rest, left: true }, true, false, DT);
    expect(aim.source).toBeNull();
    // Cancel at the very moment of letting go is still a cancel.
    const other = makeAim();
    aimStep(other, { ...rest, right: true }, true, false, DT);
    expect(aimStep(other, rest, true, true, DT)).toBe(false);
  });

  it("cannot start where it is not allowed (in the air), and starts on landing if still pushed", () => {
    const aim = makeAim();
    for (let i = 0; i < 10; i++) aimStep(aim, { ...rest, right: true }, false, false, DT);
    expect(aim.source).toBeNull();
    aimStep(aim, { ...rest, right: true }, true, false, DT);
    expect(aim.source).toBe("right");
    // One that is already running is not ended by leaving the ground.
    expect(aimStep(aim, { ...rest, right: true }, false, false, DT)).toBe(false);
    expect(aim.source).toBe("right");
  });
});

describe("never trapped", () => {
  it("finds walkable floor next to an unwalkable point", () => {
    const table = tableSpots[0];
    const out = nearestWalkable(table.x, table.z, isWalkable, spawn);
    expect(isWalkable(out.x, out.z)).toBe(true);
    expect(Math.hypot(out.x - table.x, out.z - table.z)).toBeLessThan(1.5);
  });

  it("leaves a walkable point alone and falls back to the spawn when lost", () => {
    expect(nearestWalkable(spawn.x, spawn.z, isWalkable, spawn)).toEqual({ x: spawn.x, z: spawn.z });
    expect(nearestWalkable(500, 500, isWalkable, spawn)).toEqual({ x: spawn.x, z: spawn.z });
    expect(nearestWalkable(3, 4, open, spawn)).toEqual({ x: 3, z: 4 });
  });

  it("the spawn point is walkable", () => {
    expect(isWalkable(spawn.x, spawn.z)).toBe(true);
  });
});

describe("seats", () => {
  it("stands up on walkable floor beside the table, still facing it", () => {
    for (const spot of tableSpots) {
      for (const seat of [...spot.seats, spot.host]) {
        const up = standUpPose(seat, isWalkable, spawn);
        expect(isWalkable(up.x, up.z)).toBe(true);
        expect(up.ry).toBe(seat.ry);
        const distance = Math.hypot(up.x - spot.x, up.z - spot.z);
        expect(distance).toBeGreaterThan(Math.hypot(seat.x - spot.x, seat.z - spot.z));
        expect(distance).toBeLessThan(3);
      }
    }
  });
});

describe("head and rig", () => {
  it("are the same thing when the head is at the rig's centre", () => {
    const rig = { x: 3, z: -4, ry: 1 };
    expect(headPose(rig, { x: 0, z: 0, ry: 0 })).toEqual({ x: 3, z: -4, ry: expect.closeTo(1) });
  });

  it("carries the head's offset round with the rig", () => {
    // Head half a metre in front of the rig centre (rig space -z); the rig faces east.
    const head = headPose({ x: 0, z: 0, ry: -Math.PI / 2 }, { x: 0, z: -0.5, ry: 0 });
    expect(head.x).toBeCloseTo(0.5);
    expect(head.z).toBeCloseTo(0);
  });

  it("rigForHead puts the head exactly where asked", () => {
    const local = { x: 0.4, z: -0.7, ry: 0.9 };
    const target = { x: -16, z: 14.55, ry: -2 };
    const head = headPose(rigForHead(target, local), local);
    expect(head.x).toBeCloseTo(target.x);
    expect(head.z).toBeCloseTo(target.z);
    expect(Math.cos(head.ry - target.ry)).toBeCloseTo(1);
  });
});
