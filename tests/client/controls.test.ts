import { describe, expect, it } from "vitest";
import {
  ARC_GRAVITY,
  arcFlightTime,
  deadZone,
  flick,
  headPose,
  nearestWalkable,
  rigForHead,
  RUN_SPEED,
  snapTurn,
  standUpPose,
  step,
  TELEPORT_RANGE,
  teleportTarget,
  WALK_SPEED,
  type MoveInput,
} from "../../client/src/controls/motion";
import { isWalkable, PLAYER_RADIUS, spawn, tableSpots, WALL_THICKNESS } from "../../client/src/world/layout";

const still: MoveInput = { forward: 0, strafe: 0, turn: 0, run: false };
const open = () => true;
const DT = 1 / 60;

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

describe("step", () => {
  it("walks the way the pose faces and strafes to its right", () => {
    const north = step({ x: 0, z: 0, ry: 0 }, { ...still, forward: 1 }, 0.1, open);
    expect(north.x).toBeCloseTo(0);
    expect(north.z).toBeCloseTo(-WALK_SPEED * 0.1);
    const east = step({ x: 0, z: 0, ry: -Math.PI / 2 }, { ...still, forward: 1 }, 0.1, open);
    expect(east.x).toBeCloseTo(WALK_SPEED * 0.1);
    expect(east.z).toBeCloseTo(0);
    const right = step({ x: 0, z: 0, ry: 0 }, { ...still, strafe: 1 }, 0.1, open);
    expect(right.x).toBeCloseTo(WALK_SPEED * 0.1);
  });

  it("runs faster, caps diagonals and caps a long frame", () => {
    const run = step({ x: 0, z: 0, ry: 0 }, { ...still, forward: 1, run: true }, 0.1, open);
    expect(run.z).toBeCloseTo(-RUN_SPEED * 0.1);
    const diagonal = step({ x: 0, z: 0, ry: 0 }, { ...still, forward: 1, strafe: 1 }, 0.1, open);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(WALK_SPEED * 0.1);
    const stalled = step({ x: 0, z: 0, ry: 0 }, { ...still, forward: 1 }, 5, open);
    expect(stalled.z).toBeCloseTo(-WALK_SPEED * 0.1);
  });

  it("returns the same pose when there is no input", () => {
    const pose = { x: 1, z: 2, ry: 0.3 };
    expect(step(pose, still, DT, open)).toBe(pose);
  });

  it("turns smoothly, positive to the right", () => {
    expect(step({ x: 0, z: 0, ry: 0 }, { ...still, turn: 1 }, 0.1, open).ry).toBeLessThan(0);
  });

  it("slides along a wall instead of stopping", () => {
    const wall = (x: number, _z: number) => x < 1;
    const next = step({ x: 0.99, z: 0, ry: -Math.PI / 4 }, { ...still, forward: 1 }, 0.1, wall);
    expect(next.x).toBe(0.99);
    expect(next.z).toBeLessThan(0);
  });

  it("stays put in a corner", () => {
    const corner = (x: number, z: number) => x < 1 && z > -1;
    const pose = { x: 0.99, z: -0.99, ry: -Math.PI / 4 };
    expect(step(pose, { ...still, forward: 1 }, 0.1, corner)).toBe(pose);
  });

  it("never walks through the mansion's walls, at any speed", () => {
    // Run east from the gallery into the solid wall at x = 8 (the nearest doors are at z = 5 and z = -9).
    let pose = { x: 6, z: 0.5, ry: -Math.PI / 2 };
    for (let i = 0; i < 200; i++) pose = step(pose, { ...still, forward: 1, run: true }, 0.5, isWalkable);
    expect(pose.x).toBeLessThanOrEqual(8 - WALL_THICKNESS / 2 - PLAYER_RADIUS);
    expect(pose.x).toBeGreaterThan(7);
    expect(isWalkable(pose.x, pose.z)).toBe(true);
  });

  it("walks through a doorway", () => {
    // East door of the gallery at z = 5.
    let pose = { x: 6, z: 5, ry: -Math.PI / 2 };
    for (let i = 0; i < 120; i++) pose = step(pose, { ...still, forward: 1 }, DT, isWalkable);
    expect(pose.x).toBeGreaterThan(9);
  });

  it("locks walking but not turning while seated", () => {
    const seat = tableSpots[0].seats[0];
    const next = step(seat, { forward: 1, strafe: 1, turn: 1, run: true }, 0.1, isWalkable, true);
    expect(next.x).toBe(seat.x);
    expect(next.z).toBe(seat.z);
    expect(next.ry).not.toBe(seat.ry);
    expect(step(seat, { ...still, forward: 1 }, 0.1, isWalkable, true)).toBe(seat);
  });

  it("gets out when it starts inside something", () => {
    const table = tableSpots[0];
    const next = step({ x: table.x, z: table.z, ry: 0 }, { ...still, forward: 1 }, DT, isWalkable);
    expect(isWalkable(next.x, next.z)).toBe(true);
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

describe("flick", () => {
  it("fires once per push and re-arms only near the centre", () => {
    const stick = { armed: true };
    expect(flick(0.9, stick)).toBe(1);
    expect(flick(0.9, stick)).toBe(0);
    expect(flick(0.45, stick)).toBe(0);
    expect(flick(0.9, stick)).toBe(0);
    expect(flick(0.1, stick)).toBe(0);
    expect(flick(-0.7, stick)).toBe(-1);
    expect(flick(0.5, { armed: true })).toBe(0);
  });
});

describe("teleport", () => {
  it("accepts walkable floor within range", () => {
    expect(teleportTarget(spawn, spawn.x + 2, spawn.z - 3, isWalkable)).toEqual({ x: spawn.x + 2, z: spawn.z - 3, valid: true });
  });

  it("refuses targets out of range, in walls, on tables, off the property and not-a-number", () => {
    expect(teleportTarget(spawn, spawn.x, spawn.z - TELEPORT_RANGE - 0.1, open).valid).toBe(false);
    expect(teleportTarget(spawn, spawn.x, spawn.z - TELEPORT_RANGE + 0.1, open).valid).toBe(true);
    expect(teleportTarget({ x: 6, z: 0.5, ry: 0 }, 8, 0.5, isWalkable).valid).toBe(false);
    const table = tableSpots[0];
    expect(teleportTarget({ x: table.x + 2, z: table.z, ry: 0 }, table.x, table.z, isWalkable).valid).toBe(false);
    expect(teleportTarget(spawn, spawn.x, 19, isWalkable).valid).toBe(false);
    expect(teleportTarget(spawn, NaN, 0, open).valid).toBe(false);
  });

  it("times the arc so the ball is on the floor when it lands", () => {
    for (const [y, vy] of [[1.6, 0], [1.2, 4], [1.6, -6], [0, 3]]) {
      const t = arcFlightTime(y, vy);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(y + vy * t - (ARC_GRAVITY / 2) * t * t).toBeCloseTo(0);
    }
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
