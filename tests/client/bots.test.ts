import { describe, expect, it } from "vitest";
import { CATALOG, cleanLook, hexOf, shuffleLook, STARTING_LOOKS } from "../../shared/avatar";
import { WALKERS, type RoomSnapshot } from "../../shared/protocol";
import { BOT_PLATE, plateColour, reachToward } from "../../client/src/world/Avatars";
import { botSeats, WALK_SPEED, WALKER_LOOPS, walkerAt } from "../../client/src/world/Bots";
import { ground, setMovers } from "../../client/src/world/ground";
import { isWalkable } from "../../client/src/world/layout";
import { FLAT } from "../../client/src/world/solids";

const look = shuffleLook(() => 0.42);
const seat = (occupant: "open" | "human" | "bot") => ({ occupant, memberId: null, name: null, ready: false, connected: false, ...(occupant === "bot" && { look }) });

describe("visible bots", () => {
  it("puts a bot in every seat a bot plays, at every table, named as the plates name them and in the server's look", () => {
    const room = {
      tables: [
        { id: "spades-1", seats: [seat("human"), seat("bot"), seat("bot"), seat("bot")] },
        { id: "tonk-1", seats: [seat("open"), seat("human"), seat("open"), seat("open")] },
        { id: "bid-whist-2", seats: [seat("bot"), seat("human"), seat("human"), seat("bot")] },
      ],
    } as unknown as RoomSnapshot;
    expect(botSeats(room)).toEqual([
      { tableId: "spades-1", seat: 1, name: "Bot 2", look },
      { tableId: "spades-1", seat: 2, name: "Bot 3", look },
      { tableId: "spades-1", seat: 3, name: "Bot 4", look },
      { tableId: "bid-whist-2", seat: 0, name: "Bot 1", look },
      { tableId: "bid-whist-2", seat: 3, name: "Bot 4", look },
    ]);
  });

  it("draws none before a room is joined or while every table is in its lobby, nor a bot the server has not described yet", () => {
    expect(botSeats(null)).toEqual([]);
    // The seat I am standing up from is a bot before the server's snapshot arrives, with no look yet: it appears once, in its own.
    expect(botSeats({ tables: [{ id: "tonk-1", seats: [seat("human"), { ...seat("bot"), look: undefined }, seat("open"), seat("open")] }] } as unknown as RoomSnapshot)).toEqual([]);
    expect(botSeats({ tables: [{ id: "tonk-1", seats: [seat("human"), seat("open"), seat("open"), seat("open")] }] } as unknown as RoomSnapshot)).toEqual([]);
  });

  it("gives every bot the old robots' steel blue plate, and every person their own colour, never one close to it", () => {
    expect(BOT_PLATE).toBe("#7f9cbf");
    expect(deltaE("#000000", "#ffffff")).toBeCloseTo(100, 1);
    for (const { id } of CATALOG.plateColor) {
      const worn = cleanLook({ ...STARTING_LOOKS[0], plateColor: id });
      expect(plateColour(worn, true)).toBe(BOT_PLATE);
      expect(plateColour(worn, false)).toBe(hexOf("plateColor", id));
      // Sky blue is the nearest, about 13 apart: plainly another colour side by side; the bots' frame and antenna, which no person's plate has, carry it across the room.
      expect(deltaE(plateColour(worn, false), BOT_PLATE), id).toBeGreaterThan(10);
    }
  });

  it("reaches a bot in over about a second of its turn at my table and back after, never in one frame", () => {
    let reach = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      const next = reachToward(reach, true, 1 / 60);
      expect(next - reach).toBeLessThanOrEqual(0.05 + 1e-9);
      reach = next;
    }
    expect(reach).toBeGreaterThan(0.9);
    for (let frame = 0; frame < 60; frame += 1) reach = reachToward(reach, false, 1 / 60);
    expect(reach).toBeLessThan(0.1);
    // A stalled frame lands on the target, never past it.
    expect(reachToward(0.3, true, 5)).toBe(1);
  });
});

/** CIE L*a*b* (D65) of a #rrggbb colour. */
function lab(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
/** The CIE76 colour difference: about 2 is just noticeable side by side. */
const deltaE = (a: string, b: string): number => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

/** Distance from a point to the loop's nearest leg. */
function offLoop(loop: (typeof WALKER_LOOPS)[number], x: number, z: number): number {
  return Math.min(
    ...loop.map(([ax, az], i) => {
      const [bx, bz] = loop[(i + 1) % loop.length];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
      return Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az)));
    }),
  );
}

const lapMs = (loop: (typeof WALKER_LOOPS)[number]) =>
  (loop.reduce((sum, [x, z], i) => sum + Math.hypot(loop[(i + 1) % loop.length][0] - x, loop[(i + 1) % loop.length][1] - z), 0) / WALK_SPEED) * 1000;

describe("walkers", () => {
  it(`has a loop for each of the ${WALKERS} walkers the server sends`, () => {
    expect(WALKER_LOOPS).toHaveLength(WALKERS);
  });

  it("puts a walker on its loop at every moment, moving smoothly at a calm pace and facing the way it walks", () => {
    for (const loop of WALKER_LOOPS) {
      const lap = lapMs(loop);
      expect(lap).toBeGreaterThan(15_000);
      const start = walkerAt(loop, 0);
      expect([start.x, start.z]).toEqual(loop[0]);
      // One lap later it is back where it set off; before it set off (a clock behind the server's) it is still on the loop.
      const again = walkerAt(loop, lap);
      expect(Math.hypot(again.x - start.x, again.z - start.z)).toBeLessThan(1e-6);
      let last = walkerAt(loop, -5000);
      expect(offLoop(loop, last.x, last.z)).toBeLessThan(1e-9);
      for (let ms = -4984; ms < lap * 2; ms += 16) {
        const now = walkerAt(loop, ms);
        expect(offLoop(loop, now.x, now.z)).toBeLessThan(1e-9);
        const step = Math.hypot(now.x - last.x, now.z - last.z);
        expect(step).toBeLessThanOrEqual(WALK_SPEED * 0.016 + 1e-9);
        // Forward (-sin ry, -cos ry) points along the step, with a little lead round a corner.
        if (step > 0) expect(-(Math.sin(now.ry) * (now.x - last.x) + Math.cos(now.ry) * (now.z - last.z)) / step).toBeGreaterThan(0.5);
        last = now;
      }
    }
  });

  /** A step from (x0, z0) to (x, z) on open floor: walkable by the plan, clear of every solid and the water, through no wall. */
  const open = (x0: number, z0: number, x: number, z: number): boolean =>
    isWalkable(x, z) && !ground.blocked(x, z, FLAT) && ground.floor(x, z, FLAT) === 0 && ground.water(x, z) === null && !ground.wallBetween(x0, z0, x, z);

  it("walks every loop on open floor: walkable, clear of furniture and water, through no wall", () => {
    // The rule refuses a card table, a gallery armchair, the pool and a wall.
    expect([open(-16, 12, -16, 13.5), open(-3.9, -13, -3.9, -14.5), open(-10, -29, -10, -35), open(-7, 2, -9, 2)]).toEqual([false, false, false, false]);
    const stuck: string[] = [];
    for (const [n, loop] of WALKER_LOOPS.entries()) {
      const steps = Math.ceil(lapMs(loop) / 100);
      let last = walkerAt(loop, 0);
      for (let i = 0; i <= steps; i += 1) {
        // About 0.1 m a step.
        const now = walkerAt(loop, (i * lapMs(loop)) / steps);
        if (!open(last.x, last.z, now.x, now.z)) stuck.push(`loop ${n} at (${now.x.toFixed(2)}, ${now.z.toFixed(2)})`);
        last = now;
      }
    }
    expect(stuck).toEqual([]);
  });

  it("is solid: a player's body cannot stand where a walker is, and is free again once it has walked on", () => {
    const at = walkerAt(WALKER_LOOPS[0], 0);
    const later = walkerAt(WALKER_LOOPS[0], 3000);
    expect(ground.blocked(at.x, at.z, FLAT)).toBe(false);
    try {
      setMovers([{ x: at.x, z: at.z }]);
      expect(ground.blocked(at.x, at.z, FLAT)).toBe(true);
      // Touching distance is PLAYER_RADIUS + MOVER_RADIUS; a step beyond it is open.
      expect(ground.blocked(at.x, at.z + 1, FLAT)).toBe(false);
      setMovers([{ x: later.x, z: later.z }]);
      expect(ground.blocked(at.x, at.z, FLAT)).toBe(false);
    } finally {
      setMovers([]);
    }
  });
});
