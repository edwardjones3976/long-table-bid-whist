import { describe, expect, it } from "vitest";
import { TABLES } from "../../shared/protocol";
import {
  HOUSE,
  isWalkable,
  nearestTable,
  obstacles,
  pool,
  PROPERTY,
  rooms,
  SEAT_DISTANCE,
  signs,
  spawn,
  tableSpots,
  walls,
  YARD,
} from "../../client/src/world/layout";

const STEP = 0.5;
const key = (x: number, z: number) => `${x},${z}`;

/** Every grid point a walker can reach from the spawn point by half-metre steps. */
function reachable(): Set<string> {
  const start: [number, number] = [Math.round(spawn.x / STEP) * STEP, Math.round(spawn.z / STEP) * STEP];
  const seen = new Set([key(...start)]);
  const queue = [start];
  while (queue.length) {
    const [x, z] = queue.pop()!;
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const next: [number, number] = [x + dx, z + dz];
      if (seen.has(key(...next)) || !isWalkable(...next)) continue;
      seen.add(key(...next));
      queue.push(next);
    }
  }
  return seen;
}

const reached = reachable();
const reachedNear = (x: number, z: number, within: number): boolean =>
  [...reached].some((point) => {
    const [px, pz] = point.split(",").map(Number);
    return Math.hypot(px - x, pz - z) <= within;
  });

describe("mansion layout", () => {
  it("is a 48 x 36 house with a 48 x 24 backyard behind it", () => {
    expect([HOUSE.x1 - HOUSE.x0, HOUSE.z1 - HOUSE.z0]).toEqual([48, 36]);
    expect([YARD.x1 - YARD.x0, YARD.z1 - YARD.z0]).toEqual([48, 24]);
    expect(YARD.z1).toBe(HOUSE.z0);
  });

  it("has every required room and zone, all inside the property", () => {
    const ids = rooms.map((room) => room.id);
    for (const id of ["foyer", "gallery", "tonk-lounge", "spades-lounge", "bid-whist-lounge", "kitchen", "cookout", "pool", "yard-lounge", "dance", "lawn"]) {
      expect(ids).toContain(id);
    }
    for (const { rect } of rooms) {
      expect(rect.x0).toBeGreaterThanOrEqual(PROPERTY.x0);
      expect(rect.x1).toBeLessThanOrEqual(PROPERTY.x1);
      expect(rect.z0).toBeGreaterThanOrEqual(PROPERTY.z0);
      expect(rect.z1).toBeLessThanOrEqual(PROPERTY.z1);
    }
    expect(obstacles.some((obstacle) => obstacle.kind === "potluck-counter")).toBe(true);
  });

  it("starts in the foyer on walkable ground", () => {
    expect(isWalkable(spawn.x, spawn.z)).toBe(true);
    const foyer = rooms.find((room) => room.id === "foyer")!.rect;
    expect(spawn.x > foyer.x0 && spawn.x < foyer.x1 && spawn.z > foyer.z0 && spawn.z < foyer.z1).toBe(true);
  });

  it("lets a walker reach the middle of every room from the spawn point", () => {
    for (const room of rooms) {
      const { rect } = room;
      // The pool's middle is deep water, so any reachable point inside the room counts.
      const inRoom = [...reached].some((point) => {
        const [x, z] = point.split(",").map(Number);
        return x > rect.x0 + 1 && x < rect.x1 - 1 && z > rect.z0 + 1 && z < rect.z1 - 1;
      });
      expect(inRoom, room.id).toBe(true);
    }
  });

  it("has no dead ends: every room has at least two openings", () => {
    const openings = (rect: (typeof rooms)[number]["rect"]): number => {
      let count = 0;
      const edge = (x: number, z: number) => isWalkable(x, z) && count++;
      for (let x = rect.x0 + 0.5; x < rect.x1; x += 0.5) {
        edge(x, rect.z0);
        edge(x, rect.z1);
      }
      for (let z = rect.z0 + 0.5; z < rect.z1; z += 0.5) {
        edge(rect.x0, z);
        edge(rect.x1, z);
      }
      return count;
    };
    // A 2 m door gives two or three walkable half-metre samples on the wall line.
    for (const room of rooms) expect(openings(room.rect), room.id).toBeGreaterThanOrEqual(4);
  });

  it("blocks walls, tables, counters and deep water but opens doors, steps and the shallow end", () => {
    expect(isWalkable(-8, 0)).toBe(false);
    expect(isWalkable(-8, 5)).toBe(true);
    expect(isWalkable(0, -18)).toBe(true);
    expect(isWalkable(0, 19)).toBe(false);
    expect(isWalkable(tableSpots[0].x, tableSpots[0].z)).toBe(false);
    const counter = obstacles.find((obstacle) => obstacle.kind === "potluck-counter")!.rect;
    expect(isWalkable((counter.x0 + counter.x1) / 2, (counter.z0 + counter.z1) / 2)).toBe(false);
    expect(isWalkable((pool.deep.x0 + pool.deep.x1) / 2, (pool.deep.z0 + pool.deep.z1) / 2)).toBe(false);
    expect(isWalkable((pool.steps.x0 + pool.steps.x1) / 2, -35)).toBe(true);
    expect(isWalkable(pool.shallow.x1 - 2, -35)).toBe(true);
    expect(reachedNear(pool.shallow.x1 - 2, -35, STEP)).toBe(true);
  });

  it("has a spot for each of the six tables, at least 8 m apart", () => {
    expect(tableSpots.map((spot) => spot.id).sort()).toEqual(TABLES.map((table) => table.id).sort());
    for (const a of tableSpots) {
      for (const b of tableSpots) {
        if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id} to ${b.id}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("puts each game's two tables in that game's lounge", () => {
    for (const spot of tableSpots) {
      const lounge = rooms.find((room) => room.game === spot.game)!.rect;
      expect(spot.x > lounge.x0 && spot.x < lounge.x1 && spot.z > lounge.z0 && spot.z < lounge.z1, spot.id).toBe(true);
    }
  });

  it("seats four clockwise with partners opposite, facing the table, all reachable", () => {
    for (const spot of tableSpots) {
      spot.seats.forEach((seat, n) => {
        expect(Math.hypot(seat.x - spot.x, seat.z - spot.z)).toBeCloseTo(SEAT_DISTANCE);
        // Looking along the pose's forward vector lands on the table centre.
        expect(seat.x - Math.sin(seat.ry) * SEAT_DISTANCE).toBeCloseTo(spot.x);
        expect(seat.z - Math.cos(seat.ry) * SEAT_DISTANCE).toBeCloseTo(spot.z);
        const partner = spot.seats[(n + 2) % 4];
        expect((seat.x + partner.x) / 2).toBeCloseTo(spot.x);
        expect((seat.z + partner.z) / 2).toBeCloseTo(spot.z);
        // Clockwise from above with +z drawn downward: the next seat is to this seat's left-hand side on the map.
        const next = spot.seats[(n + 1) % 4];
        const cross = (seat.x - spot.x) * (next.z - spot.z) - (seat.z - spot.z) * (next.x - spot.x);
        expect(cross).toBeGreaterThan(0);
      });
      for (const pose of [...spot.seats, spot.host]) {
        expect(isWalkable(pose.x, pose.z), spot.id).toBe(true);
        expect(reachedNear(pose.x, pose.z, STEP), spot.id).toBe(true);
      }
      expect(nearestTable(spot.host.x, spot.host.z).spot.id).toBe(spot.id);
    }
  });

  it("signs every game area on a solid stretch of wall or fence", () => {
    const labels = signs.map((sign) => sign.label);
    for (const label of ["Tonk Lounge", "Spades Lounge", "Bid Whist Lounge", "Communal Kitchen", "Cookout Patio", "Lawn-Toss Lawn"]) {
      expect(labels).toContain(label);
    }
    for (const sign of signs) {
      const onWall = walls.some((wall) => {
        const alongX = wall.az === wall.bz;
        const off = alongX ? Math.abs(sign.z - wall.az) : Math.abs(sign.x - wall.ax);
        const along = alongX ? sign.x : sign.z;
        const [from, to] = alongX ? [wall.ax, wall.bx] : [wall.az, wall.bz];
        return off < 0.3 && along > from + 0.5 && along < to - 0.5;
      });
      expect(onWall, sign.id).toBe(true);
    }
  });
});
