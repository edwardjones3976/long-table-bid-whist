import { Object3D, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { ground, solids, STEP_UP } from "../../client/src/world/ground";
import { doors, EYE_HEIGHT_STANDING, floorHeight, obstacles, PLAYER_RADIUS, pool, PROPERTY, roomAt, rooms, spawn, tableSpots } from "../../client/src/world/layout";
import { decor, rng, structure, type Part } from "../../client/src/world/plan";
import { FLAT, solidOf, type Solid } from "../../client/src/world/solids";

const R = PLAYER_RADIUS;
/** How far a jump lifts the feet (controls/motion.ts), and how far above them a body in the air still catches a surface. */
const JUMP = 0.85;
const AIR_REACH = 0.05;
/** Parts whose underside is higher than this are over a standing head. */
const HEAD = EYE_HEIGHT_STANDING + 0.2;
const GRID = 0.25;
const mid = (r: { x0: number; z0: number; x1: number; z1: number }): [number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];

interface Stood {
  x: number;
  z: number;
  /** Feet height. */
  y: number;
}

/**
 * Everywhere a walker gets to from (x, z) without jumping or dropping: quarter-metre
 * steps (under the body's radius), up or down no more than STEP_UP at a time.
 */
function walk(x: number, z: number): Stood[] {
  const key = (ix: number, iz: number) => (ix + 500) * 1000 + iz + 500;
  const start: [number, number] = [Math.round(x / GRID), Math.round(z / GRID)];
  const seen = new Map([[key(...start), ground.floor(start[0] * GRID, start[1] * GRID, -Infinity)]]);
  const queue = [start];
  const out: Stood[] = [];
  while (queue.length) {
    const [ix, iz] = queue.pop()!;
    const y = seen.get(key(ix, iz))!;
    out.push({ x: ix * GRID, z: iz * GRID, y });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next: [number, number] = [ix + dx, iz + dz];
      const [nx, nz] = [next[0] * GRID, next[1] * GRID];
      if (seen.has(key(...next)) || ground.blocked(nx, nz, y + STEP_UP)) continue;
      const floor = ground.floor(nx, nz, y + STEP_UP);
      if (floor < y - STEP_UP) continue;
      seen.set(key(...next), floor);
      queue.push(next);
    }
  }
  return out;
}

const reached = walk(spawn.x, spawn.z);
const reachedInside = (r: { x0: number; z0: number; x1: number; z1: number }): Stood[] =>
  reached.filter((p) => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1);

const placer = new Object3D();
/** Puts `placer` where world/Parts.tsx draws the part: the same position, turn and size. */
function place(p: Part): void {
  placer.position.set(p.x, p.y, p.z);
  placer.rotation.set(p.rx, p.ry, p.rz);
  placer.scale.set(p.sx, p.sy, p.sz);
  placer.updateMatrix();
}
/** The box round a part as it is drawn. */
function drawn(p: Part): { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number } {
  place(p);
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      for (const z of [-0.5, 0.5]) {
        const corner = new Vector3(x, y, z).applyMatrix4(placer.matrix);
        Object.assign(box, {
          x0: Math.min(box.x0, corner.x),
          x1: Math.max(box.x1, corner.x),
          y0: Math.min(box.y0, corner.y),
          y1: Math.max(box.y1, corner.y),
          z0: Math.min(box.z0, corner.z),
          z1: Math.max(box.z1, corner.z),
        });
      }
    }
  }
  return box;
}

/** How far (x, z) is from a solid's footprint; 0 inside it. */
function away(s: Solid, x: number, z: number): number {
  const [ox, oz] = [x - s.x, z - s.z];
  return Math.max(0, Math.hypot(Math.max(Math.abs(ox * s.cos - oz * s.sin) - s.hx, 0), Math.max(Math.abs(ox * s.sin + oz * s.cos) - s.hz, 0)) - s.r);
}
const spanX = (s: Solid): number => Math.abs(s.cos) * s.hx + Math.abs(s.sin) * s.hz + s.r;
const spanZ = (s: Solid): number => Math.abs(s.sin) * s.hx + Math.abs(s.cos) * s.hz + s.r;

describe("what is drawn is what is solid", () => {
  const parts = structure().filter((p) => !p.shape.startsWith("arch:"));

  it("gives every drawn part a solid with the drawn top and footprint, or leaves it out for a reason", () => {
    let kept = 0;
    for (const p of parts) {
      const box = drawn(p);
      const s = solidOf(p);
      if (!s) {
        // Flat on the floor, over a standing head, or one of the boxes a wall is drawn with (the wall itself is solid).
        expect(box.y1 <= FLAT + 1e-9 || box.y0 >= HEAD - 1e-9 || ground.blocked(p.x, p.z, Infinity), `${p.shape} at ${p.x},${p.z}`).toBe(true);
        continue;
      }
      kept++;
      expect(s.top).toBeCloseTo(box.y1, 9);
      expect(s.x - spanX(s)).toBeGreaterThanOrEqual(box.x0 - 1e-9);
      expect(s.x + spanX(s)).toBeLessThanOrEqual(box.x1 + 1e-9);
      expect(s.z - spanZ(s)).toBeGreaterThanOrEqual(box.z0 - 1e-9);
      expect(s.z + spanZ(s)).toBeLessThanOrEqual(box.z1 + 1e-9);
      if (p.shape === "box") {
        expect(spanX(s)).toBeCloseTo((box.x1 - box.x0) / 2, 9);
        expect(spanZ(s)).toBeCloseTo((box.z1 - box.z0) / 2, 9);
      }
    }
    expect(kept).toBeGreaterThan(300);
  });

  it("lets a walker through nothing that is drawn: each part stops them or carries them", () => {
    for (const p of parts) {
      const box = drawn(p);
      if (box.y1 <= FLAT || box.y0 >= HEAD) continue;
      expect(ground.blocked(p.x, p.z, STEP_UP) || ground.floor(p.x, p.z, STEP_UP) > FLAT, `${p.shape} at ${p.x},${p.z}`).toBe(true);
    }
  });

  it("leaves out the theme decor, none of which both themes share and a body could touch", () => {
    const key = (p: Part) => [p.shape, p.x, p.y, p.z, p.sx, p.sy, p.sz, p.rx, p.ry, p.rz].join();
    const newYear = new Set(decor("newyear").map(key));
    const shared = decor("july4").filter((p) => newYear.has(key(p)));
    expect(shared.length).toBeGreaterThan(0);
    // The shared pieces are the string lights overhead and the band round each card table, inside the table's own solid.
    for (const p of shared) expect(solidOf(p) === null || ground.blocked(p.x, p.z, Infinity), `${p.shape} at ${p.x},${p.z}`).toBe(true);
  });
});

describe("walking the mansion", () => {
  it("starts on free, level floor", () => {
    expect(ground.blocked(spawn.x, spawn.z, STEP_UP)).toBe(false);
    expect(ground.floor(spawn.x, spawn.z, STEP_UP)).toBe(0);
    expect(ground.water(spawn.x, spawn.z)).toBeNull();
  });

  it("opens every door gap and closes the wall beside it", () => {
    for (const door of doors) {
      // (ux, uz) goes through the door, (vx, vz) along its wall.
      const [ux, uz] = door.wallAxis === "x" ? [0, 1] : [1, 0];
      const [vx, vz] = [uz, ux];
      const name = `door at ${door.x},${door.z}`;
      for (let t = -1; t <= 1.001; t += 0.05) expect(ground.blocked(door.x + ux * t, door.z + uz * t, STEP_UP), name).toBe(false);
      expect(ground.wallBetween(door.x - ux, door.z - uz, door.x + ux, door.z + uz), name).toBe(false);
      for (const side of [-1, 1]) {
        const off = side * (door.width / 2 + 0.6);
        const [wx, wz] = [door.x + vx * off, door.z + vz * off];
        expect(ground.wallBetween(wx - ux, wz - uz, wx + ux, wz + uz), name).toBe(true);
        expect(ground.blocked(wx, wz, Infinity), name).toBe(true);
      }
    }
  });

  it("stops at walls and fences whatever the body can reach, and at the edge of the property", () => {
    expect(ground.blocked(-8, 0, Infinity)).toBe(true);
    // A house wall is 0.2 thick and the hedge 0.3: the body's centre stays its radius off each face.
    expect(ground.blocked(PROPERTY.x0 + 0.39, 5, Infinity)).toBe(true);
    expect(ground.blocked(PROPERTY.x0 + 0.41, 5, STEP_UP)).toBe(false);
    expect(ground.blocked(PROPERTY.x0 + 0.44, -35, Infinity)).toBe(true);
    expect(ground.blocked(PROPERTY.x0 + 0.46, -35, STEP_UP)).toBe(false);
    expect(ground.blocked(0, PROPERTY.z1 + 1, Infinity)).toBe(true);
    expect(ground.blocked(500, 500, Infinity)).toBe(true);
    expect(ground.wallBetween(0, 15, 0, 20)).toBe(true);
    expect(ground.wallBetween(0, -30, 0, -50)).toBe(true);
    expect(ground.wallBetween(spawn.x, spawn.z, spawn.x + 3, spawn.z - 2)).toBe(false);
  });

  it("reaches every room and yard area, and a standing spot beside every seat and host's corner", () => {
    for (const room of rooms) {
      const { rect } = room;
      expect(reachedInside({ x0: rect.x0 + 1, z0: rect.z0 + 1, x1: rect.x1 - 1, z1: rect.z1 - 1 }).length, room.id).toBeGreaterThan(0);
    }
    for (const spot of tableSpots) {
      for (const pose of [...spot.seats, spot.host]) {
        // The chair itself is solid; a walker stands within arm's reach of it.
        expect(reached.some((p) => p.y === 0 && Math.hypot(p.x - pose.x, p.z - pose.z) <= 0.75), spot.id).toBe(true);
        // A step back from it, where controls/motion.ts stands a player up, is open floor.
        expect(ground.blocked(pose.x + Math.sin(pose.ry) * 0.6, pose.z + Math.cos(pose.ry) * 0.6, STEP_UP), spot.id).toBe(false);
      }
    }
  });

  it("cannot walk through a named obstacle, a sofa or a bench", () => {
    for (const obstacle of obstacles) {
      const [cx, cz] = mid(obstacle.rect);
      const over = reachedInside(obstacle.rect);
      if (obstacle.height > STEP_UP) {
        expect(ground.blocked(cx, cz, STEP_UP), obstacle.id).toBe(true);
        expect(over, obstacle.id).toEqual([]);
      } else {
        // A lawn-toss board is low enough to walk over: the walker is carried up, never passed through.
        expect(over.length, obstacle.id).toBeGreaterThan(0);
        for (const p of over) expect(p.y, obstacle.id).toBeGreaterThan(FLAT);
      }
    }
    // Indoor sofa seats are 0.42 high and benches 0.45; neither carries a tag.
    const seats = structure().filter((p) => !p.tag && p.shape === "box" && [0.42, 0.45].some((top) => Math.abs(p.y + p.sy / 2 - top) < 1e-9));
    expect(seats.length).toBeGreaterThanOrEqual(8);
    for (const p of seats) {
      const box = drawn(p);
      expect(ground.blocked(p.x, p.z, STEP_UP)).toBe(true);
      expect(reachedInside(box)).toEqual([]);
    }
  });

  it("walks up a lawn-toss board as the ramp it is drawn as", () => {
    for (const board of obstacles.filter((o) => o.kind === "toss-board")) {
      const p = structure().find((part) => part.tag === board.id && part.shape === "box" && part.rx !== 0)!;
      place(p);
      // The two ends of the board's top face, lower end first.
      const ends = [-0.5, 0.5].map((end) => new Vector3(0, 0.5, end).applyMatrix4(placer.matrix)).sort((a, b) => a.y - b.y);
      const [low, high] = ends;
      expect(high.y - low.y).toBeGreaterThan(0.2);
      const toHigh = Math.sign(high.z - low.z);
      for (let t = 0; t <= 1.001; t += 0.1) {
        const z = low.z + (high.z - low.z) * t;
        // The body stands as high as the board is under its uphill edge.
        const uphill = Math.min(1, t + R / Math.abs(high.z - low.z));
        expect(ground.blocked(p.x, z, STEP_UP), board.id).toBe(false);
        expect(Math.abs(ground.floor(p.x, z, STEP_UP) - (low.y + (high.y - low.y) * uphill)), board.id).toBeLessThan(0.01);
      }
      // On from the grass at either end, and off again without a fall.
      for (const end of [low.z - toHigh * 0.2, high.z + toHigh * 0.2]) {
        expect(ground.blocked(p.x, end, STEP_UP), board.id).toBe(false);
        expect(ground.floor(p.x, end, STEP_UP), board.id).toBeLessThanOrEqual(STEP_UP);
      }
      expect(ground.floor(p.x, high.z + toHigh * 0.4, STEP_UP)).toBe(0);
    }
  });
});

describe("jumping onto things", () => {
  it("lets a body onto a sofa seat once its feet are that high, and onto the sofa's back only by a jump from there", () => {
    for (const sofa of obstacles.filter((o) => o.kind === "sofa")) {
      const pieces = structure().filter((p) => p.tag === sofa.id && p.shape === "box");
      const seat = pieces.reduce((a, b) => (a.y + a.sy / 2 < b.y + b.sy / 2 ? a : b));
      const back = pieces.find((p) => p !== seat)!;
      const [seatTop, backTop] = [seat.y + seat.sy / 2, back.y + back.sy / 2];
      // Stand on the half of the seat away from the back.
      const z = seat.z + Math.sign(seat.z - back.z) * 0.25;
      expect(ground.blocked(seat.x, z, seatTop - 0.01), sofa.id).toBe(true);
      expect(ground.blocked(seat.x, z, seatTop), sofa.id).toBe(false);
      expect(ground.floor(seat.x, z, seatTop), sofa.id).toBeCloseTo(seatTop, 9);
      expect(ground.floor(seat.x, z, -Infinity), sofa.id).toBe(0);
      // From the seat the back is more than a step up, and a jump reaches it.
      expect(ground.blocked(back.x, back.z, seatTop + STEP_UP), sofa.id).toBe(true);
      expect(ground.blocked(back.x, back.z, backTop), sofa.id).toBe(false);
      expect(ground.floor(back.x, back.z, backTop), sofa.id).toBeCloseTo(backTop, 9);
      expect(backTop).toBeLessThanOrEqual(JUMP + AIR_REACH);
    }
  });

  it("keeps counters, the grill, the music booth and card tables out of a jump's reach", () => {
    for (const obstacle of obstacles.filter((o) => o.kind !== "sofa" && o.kind !== "toss-board")) {
      expect(ground.blocked(...mid(obstacle.rect), JUMP), obstacle.id).toBe(true);
    }
    // Every part of them, not only the middle: the grill's side shelf (0.76 m) is not a perch either.
    const offLimits = ["potluck-counter", "kitchen-counter", "grill", "dj-booth"];
    const parts = structure().filter((p) => offLimits.includes(p.tag ?? "") && solidOf(p) !== null);
    expect(parts.length).toBeGreaterThan(10);
    for (const p of parts) expect(ground.blocked(p.x, p.z, JUMP + AIR_REACH), `${p.tag} ${p.shape} at ${p.x},${p.z}`).toBe(true);
    const shelf = structure().find((p) => p.tag === "grill" && p.shape === "box" && p.sy === 0.04 && p.sx === 0.45)!;
    expect(shelf.y + shelf.sy / 2).toBeLessThan(JUMP + AIR_REACH);
    expect(ground.blocked(shelf.x + 0.2, shelf.z, JUMP + AIR_REACH)).toBe(true);
    expect(ground.floor(shelf.x + 0.2, shelf.z, JUMP + AIR_REACH)).toBe(0);
    for (const spot of tableSpots) {
      expect(ground.blocked(spot.x, spot.z, JUMP), spot.id).toBe(true);
      // Nobody gets onto a table, a chair or a dealer's stand, however high their feet.
      expect(ground.blocked(spot.x, spot.z, Infinity), spot.id).toBe(true);
      for (const seat of spot.seats) expect(ground.blocked(seat.x, seat.z, Infinity), spot.id).toBe(true);
      const stand = { x: spot.x + (spot.host.x - spot.x) * 0.72, z: spot.z + (spot.host.z - spot.z) * 0.72 };
      expect(ground.blocked(stand.x, stand.z, Infinity), spot.id).toBe(true);
    }
  });

  it("stands a body on a pouffe's cushion, and keeps it off the dishes on the potluck counter", () => {
    const cushions = structure().filter((p) => p.shape === "ball" && p.sx === 0.55 && p.sy === 0.16);
    expect(cushions.length).toBeGreaterThan(10);
    for (const p of cushions) {
      const top = p.y + p.sy / 2;
      expect(top).toBeLessThanOrEqual(JUMP + AIR_REACH);
      expect(ground.blocked(p.x, p.z, STEP_UP)).toBe(true);
      expect(ground.blocked(p.x, p.z, top)).toBe(false);
      expect(ground.floor(p.x, p.z, top)).toBe(top);
    }
    // A lid or a helping of food is a squashed ball too, and too small to be a cushion.
    const dishes = structure().filter((p) => p.tag === "potluck-counter" && (p.shape === "ball" || p.shape === "cone"));
    expect(dishes.length).toBeGreaterThan(4);
    for (const p of dishes) expect(ground.blocked(p.x, p.z, Infinity)).toBe(true);
  });

  it("keeps a kitchen stool from being a step up to the potluck counter", () => {
    const counter = obstacles.find((o) => o.kind === "potluck-counter")!;
    const stools = structure().filter((p) => p.shape === "cyl" && p.sx === 0.38 && p.sy === 0.08);
    expect(stools.length).toBeGreaterThan(4);
    for (const p of stools) {
      const seat = p.y + p.sy / 2;
      expect(seat).toBeLessThanOrEqual(JUMP + AIR_REACH);
      expect(ground.floor(p.x, p.z, seat)).toBe(seat);
      // Where the body's edge first comes over the counter: out of reach from the floor, and from the stool too.
      const z = counter.rect.z1 + R - 0.05;
      expect(ground.blocked(p.x, z, JUMP)).toBe(true);
      expect(ground.blocked(p.x, z, seat + STEP_UP)).toBe(true);
      // The body there is still over its stool, which is what it would stand on.
      expect(ground.floor(p.x, z, seat + STEP_UP)).toBe(seat);
    }
  });

  it("lets a jump pass over what cannot be stood on: a lounger's back stops a body whose feet are below its top, not one whose feet are above", () => {
    const backs = structure().filter((p) => p.shape === "box" && p.rx === -0.7 && p.sx === 0.6 && p.sz === 0.7);
    expect(backs.length).toBe(4);
    const back = solidOf(backs[0])!;
    expect(back.stand).toBe(false);
    expect(back.top).toBeGreaterThan(0.65);
    expect(back.top).toBeLessThan(0.75);
    expect(ground.blocked(back.x, back.z, Infinity)).toBe(true);
    expect(ground.blocked(back.x, back.z, 0.55, 0.5)).toBe(true);
    expect(ground.blocked(back.x, back.z, 0.75, 0.7)).toBe(false);
    expect(ground.blocked(back.x, back.z, 0.85, 0.8)).toBe(false);
  });

  it("offers knee-high and waist-high places to jump onto, indoors and out, with open floor beside them", () => {
    const beside = (s: Solid) => reached.some((p) => p.y === 0 && away(s, p.x, p.z) <= R + 0.25);
    const places = solids().filter((s) => s.stand && s.top > STEP_UP && s.top <= JUMP + AIR_REACH && beside(s));
    for (const [from, to] of [[STEP_UP, 0.5], [0.65, JUMP + AIR_REACH]]) {
      const tier = places.filter((s) => s.top > from && s.top <= to);
      expect(tier.filter((s) => roomAt(s.x, s.z)?.kind !== "yard").length, `${from} to ${to} indoors`).toBeGreaterThanOrEqual(8);
      expect(tier.filter((s) => roomAt(s.x, s.z)?.kind === "yard").length, `${from} to ${to} in the yard`).toBeGreaterThanOrEqual(4);
    }
  });

  it("makes no perch of a top with no room on it: a lamp's base under its pole and globe is only in the way", () => {
    const bases = structure().filter((p) => p.shape === "cyl" && p.sx === 0.5 && p.sy === 0.5 && p.y === 0.25);
    expect(bases.length).toBeGreaterThan(4);
    for (const p of bases) {
      // Half a metre into the room from the lamp: touching the base, clear of the pole, the globe and the wall.
      const x = p.x - Math.sign(p.x) * 0.5;
      expect(ground.blocked(x + Math.sign(p.x) * 0.2, p.z, Infinity)).toBe(true);
      for (const reach of [STEP_UP, JUMP, Infinity]) expect(ground.blocked(x, p.z, reach)).toBe(true);
      expect(ground.blocked(x - Math.sign(p.x) * 0.1, p.z, STEP_UP)).toBe(false);
    }
  });

  it("puts nothing that can be stood on in a doorway", () => {
    for (const door of doors) {
      const half = door.width / 2;
      const gap = door.wallAxis === "x" ? { x0: door.x - half, x1: door.x + half, z0: door.z - 0.5, z1: door.z + 0.5 } : { x0: door.x - 0.5, x1: door.x + 0.5, z0: door.z - half, z1: door.z + half };
      for (const s of solids().filter((each) => each.stand)) {
        const overlaps = s.x - spanX(s) < gap.x1 && s.x + spanX(s) > gap.x0 && s.z - spanZ(s) < gap.z1 && s.z + spanZ(s) > gap.z0;
        expect(overlaps, `a top at ${s.x},${s.z} in the door at ${door.x},${door.z}`).toBe(false);
      }
    }
  });
});

describe("the pool", () => {
  const { water, shallow, deep, shallowDepth, deepDepth } = pool;
  const [deepX, deepZ] = mid(deep);
  /** Well into the shallow end, off the steps. */
  const shallowX = shallow.x1 - 2;
  const surface = ground.water(deepX, deepZ)!;

  it("has the drawn water surface inside the basin and none outside", () => {
    const wet = structure().find((p) => p.mat === "water")!;
    expect(surface).toBeCloseTo(wet.y + wet.sy / 2, 9);
    expect(surface).toBeCloseTo(-0.12, 9);
    expect(ground.water(water.x0 + 0.01, water.z0 + 0.01)).toBe(surface);
    expect(ground.water(water.x0 - 0.01, deepZ)).toBeNull();
    expect(ground.water(deepX, water.z1 + 0.01)).toBeNull();
  });

  it("has a deck edge that is a drop, not a wall", () => {
    for (const z of [water.z1 + 0.05, water.z1 - 0.05, water.z0 + 0.05, water.z0 - 0.05]) {
      expect(ground.blocked(deepX, z, STEP_UP), `z ${z}`).toBe(false);
    }
    // The floor is the highest under the whole body: leaning a little over the edge stays on the deck, and once the
    // body is past it, the floor is the deep end's.
    expect(ground.floor(deepX, water.z1 + 0.05, STEP_UP)).toBe(0);
    expect(ground.floor(deepX, water.z1 - 0.05, STEP_UP)).toBe(0);
    expect(ground.floor(deepX, water.z1 - R - 0.05, STEP_UP)).toBe(-deepDepth);
    expect(ground.floor(deepX, deepZ, STEP_UP)).toBe(-deepDepth);
    expect(ground.floor(deepX, deepZ, -Infinity)).toBe(-deepDepth);
    expect(ground.floor(shallowX, deepZ, STEP_UP)).toBe(-shallowDepth);
  });

  it("has layout's own floor everywhere but the deep end, the highest under the body's footprint", () => {
    const at = (x: number, z: number): number => (x > deep.x0 && x <= deep.x1 && z >= deep.z0 && z <= deep.z1 ? -deepDepth : floorHeight(x, z));
    for (let x = PROPERTY.x0 + 0.13; x < PROPERTY.x1; x += 0.37) {
      for (let z = PROPERTY.z0 + 0.13; z < PROPERTY.z1; z += 0.37) {
        const highest = Math.max(at(x, z), at(x - R, z), at(x + R, z), at(x, z - R), at(x, z + R));
        expect(ground.floor(x, z, -Infinity)).toBe(highest);
      }
    }
  });

  it("is walked into and out of by the steps, in rises no bigger than a step", () => {
    // In from the house: the walk from the spawn point gets to the shallow end's floor.
    expect(reachedInside(shallow).some((p) => p.y === -shallowDepth)).toBe(true);
    // Out again: from the shallow floor back onto the deck. walk() takes no rise above STEP_UP.
    const out = walk(shallowX, deepZ);
    expect(out[0].y).toBe(-shallowDepth);
    expect(out.some((p) => p.y === 0 && p.x < water.x0)).toBe(true);
    // The steps are a slope, with no jolt at the top or the bottom.
    for (let x = water.x0 - 0.5; x < shallow.x1 - 0.1; x += 0.05) {
      expect(Math.abs(ground.floor(x + 0.05, deepZ, Infinity) - ground.floor(x, deepZ, Infinity))).toBeLessThan(0.03);
    }
  });

  it("holds a body in the deep end to the water: the shallow end is within a swimmer's reach, the deck is not", () => {
    // A walker does not wade into the deep end; it is a drop of more than a step.
    expect(reachedInside({ x0: deep.x0 + R + 0.01, z0: deep.z0 + R, x1: deep.x1 - R, z1: deep.z1 - R })).toEqual([]);
    // Afloat (controls/motion.ts), the feet hang this far down and the reach is whatever is under the surface: the shallow end's shelf, not the deck.
    const feet = surface + 0.25 - EYE_HEIGHT_STANDING;
    const shelf = deep.x0 - 0.05;
    expect(ground.floor(deepX, deepZ, surface)).toBeLessThan(feet);
    expect(ground.blocked(shelf, deepZ, surface)).toBe(false);
    expect(ground.floor(shelf, deepZ, surface)).toBe(-shallowDepth);
    expect(ground.blocked(deepX, water.z1 + 0.05, surface)).toBe(true);
    expect(ground.blocked(water.x1 + 0.05, deepZ, surface)).toBe(true);
    // A walker's step up from that depth would not reach the shelf: the deep end is left by swimming.
    expect(ground.blocked(shelf, deepZ, feet + STEP_UP)).toBe(true);
    // Standing in the shallow end the deck is a wall to walk at, and a jump clears it.
    expect(ground.blocked(shallowX, water.z1 + 0.05, -shallowDepth + STEP_UP)).toBe(true);
    expect(ground.blocked(shallowX, water.z1 + 0.05, -shallowDepth + JUMP)).toBe(false);
  });
});

describe("ground speed", () => {
  it("answers 20,000 blocked() calls spread over the property inside one headset frame", () => {
    const random = rng(1);
    const count = 20_000;
    const xs = Float64Array.from({ length: count }, () => PROPERTY.x0 + random() * (PROPERTY.x1 - PROPERTY.x0));
    const zs = Float64Array.from({ length: count }, () => PROPERTY.z0 + random() * (PROPERTY.z1 - PROPERTY.z0));
    let best = Infinity;
    let hits = 0;
    for (let round = 0; round < 6; round++) {
      hits = 0;
      const start = performance.now();
      for (let i = 0; i < count; i++) if (ground.blocked(xs[i], zs[i], STEP_UP)) hits++;
      best = Math.min(best, performance.now() - start);
    }
    // Some of the property is in the way and most of it is not.
    expect(hits).toBeGreaterThan(count * 0.05);
    expect(hits).toBeLessThan(count * 0.5);
    // Measured about 2 ms here (2026-11-18). The limit is one 90 Hz headset frame, and a frame asks a few dozen calls, not 20,000.
    expect(best).toBeLessThan(1000 / 90);
  });
});
