import { describe, expect, it } from "vitest";
import { ARTWORK_META, artwork, type ArtworkId } from "../../client/src/world/art";
import { doors, isWalkable, MIRROR, obstacles, pool, rooms, signs, TABLE_HEIGHT, TABLE_RADIUS, tableSpots } from "../../client/src/world/layout";
import { GROOVES } from "../../client/src/world/Music";
import { ARTWORKS, decor, footprint, labels, rng, structure, subtract, type Part } from "../../client/src/world/plan";
import {
  BURST_POINTS,
  DRINKING_GOURD_EDGES,
  DRINKING_GOURD_STARS,
  LOOKS,
  burstDirections,
  burstFrame,
  burstPlan,
  burstStyle,
  countdownText,
} from "../../client/src/world/theme";

const area = (r: { x0: number; z0: number; x1: number; z1: number }) => (r.x1 - r.x0) * (r.z1 - r.z0);
const count = (parts: readonly Part[], test: (p: Part) => boolean) => parts.filter(test).length;

describe("world plan", () => {
  it("cuts a hole out of a rectangle without losing or doubling ground", () => {
    const outer = rooms.find((room) => room.id === "pool")!.rect;
    const pieces = subtract(outer, pool.water);
    expect(pieces.reduce((sum, piece) => sum + area(piece), 0)).toBeCloseTo(area(outer) - area(pool.water));
    expect(subtract(outer, outer)).toEqual([]);
  });

  it("is the same every time and has only finite, positive-sized parts", () => {
    expect(structure()).toBe(structure());
    for (const p of [...structure(), ...decor("golden"), ...decor("july4"), ...decor("newyear")]) {
      for (const n of [p.x, p.y, p.z, p.rx, p.ry, p.rz]) expect(Number.isFinite(n)).toBe(true);
      for (const n of [p.sx, p.sy, p.sz]) expect(n).toBeGreaterThan(0);
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("builds the house walls in gray, not the old cream", () => {
    const colours = structure().map((p) => p.color);
    expect(colours).toContain("#a9acb0");
    expect(colours).not.toContain("#e6e2da");
  });

  it("draws every obstacle inside its collider and no taller than it", () => {
    for (const obstacle of obstacles) {
      const parts = structure().filter((p) => p.tag === obstacle.id);
      expect(parts.length, obstacle.id).toBeGreaterThan(0);
      for (const p of parts) {
        const f = footprint(p);
        expect(f.x0, obstacle.id).toBeGreaterThanOrEqual(obstacle.rect.x0 - 1e-6);
        expect(f.x1, obstacle.id).toBeLessThanOrEqual(obstacle.rect.x1 + 1e-6);
        expect(f.z0, obstacle.id).toBeGreaterThanOrEqual(obstacle.rect.z0 - 1e-6);
        expect(f.z1, obstacle.id).toBeLessThanOrEqual(obstacle.rect.z1 + 1e-6);
      }
    }
  });

  it("draws each card table inside its round collider with the felt at table height", () => {
    for (const spot of tableSpots) {
      const parts = structure().filter((p) => p.tag === spot.id);
      expect(parts.length).toBeGreaterThanOrEqual(4);
      for (const p of parts) expect(Math.hypot(p.x - spot.x, p.z - spot.z) + p.sx / 2).toBeLessThanOrEqual(TABLE_RADIUS + 1e-6);
      expect(Math.max(...parts.map((p) => p.y + p.sy / 2))).toBeCloseTo(TABLE_HEIGHT);
    }
  });

  it("gives every door an arch and keeps furniture out of the doorways", () => {
    expect(count(structure(), (p) => p.shape.startsWith("arch:"))).toBe(doors.length);
    // Flat things (rugs, floors) may run under a door; anything you would bump into may not.
    // Obstacles are placed by layout.ts, not by the plan, so they are not judged here.
    const solid = structure().filter((p) => !p.tag && !p.shape.startsWith("arch:") && p.y + p.sy / 2 > 0.1 && p.y - p.sy / 2 < 2 && p.sx < 20 && p.sz < 20);
    for (const door of doors) {
      const half = door.width / 2 - 0.2;
      const gap = door.wallAxis === "x" ? { x0: door.x - half, x1: door.x + half, z0: door.z - 0.5, z1: door.z + 0.5 } : { x0: door.x - 0.5, x1: door.x + 0.5, z0: door.z - half, z1: door.z + half };
      for (const p of solid) {
        const f = footprint(p);
        const overlaps = f.x0 < gap.x1 && f.x1 > gap.x0 && f.z0 < gap.z1 && f.z1 > gap.z0;
        expect(overlaps, `${p.shape} at ${p.x},${p.z} blocks the door at ${door.x},${door.z}`).toBe(false);
      }
    }
  });

  it("seats four chairs at every table, each on a spot people can reach", () => {
    for (const spot of tableSpots) {
      for (const seat of spot.seats) {
        expect(count(structure(), (p) => p.shape === "ball" && Math.hypot(p.x - seat.x, p.z - seat.z) < 0.3)).toBe(1);
        expect(isWalkable(seat.x, seat.z)).toBe(true);
      }
    }
  });

  it("labels every layout sign and both faces of every table marker", () => {
    const all = labels();
    expect(new Set(all.map((label) => label.key)).size).toBe(all.length);
    for (const sign of signs) expect(all.some((label) => label.key === sign.id && label.text === sign.label)).toBe(true);
    for (const spot of tableSpots) expect(all.filter((label) => label.text === spot.label)).toHaveLength(2);
    for (const room of rooms.filter((r) => r.kind === "lounge")) {
      expect(all.find((label) => label.key === `${room.game}-inside`)!.height).toBeGreaterThan(0.8);
    }
  });

  it("hangs the artworks on solid walls, clear of doors, signs and the foyer mirror", () => {
    expect(ARTWORKS.map((art) => art.id)).toContain("gathering");
    expect(ARTWORKS.map((art) => art.id)).toContain("rhythm");
    expect(ARTWORKS).toHaveLength(12);
    for (const art of ARTWORKS) {
      expect(Math.abs(art.x)).toBeGreaterThan(7.7);
      const onZWall = Math.abs(Math.sin(art.ry)) > 0.5;
      for (const door of doors.filter((d) => (onZWall ? d.wallAxis === "z" && Math.abs(d.x - art.x) < 1 : d.wallAxis === "x" && Math.abs(d.z - art.z) < 1))) {
        expect(Math.abs(onZWall ? door.z - art.z : door.x - art.x)).toBeGreaterThan(art.w / 2 + door.width / 2);
      }
      for (const sign of signs.filter((s) => (onZWall ? Math.abs(s.x - art.x) < 0.5 : Math.abs(s.z - art.z) < 0.5))) {
        expect(Math.abs(onZWall ? sign.z - art.z : sign.x - art.x)).toBeGreaterThan(art.w / 2 + 2);
      }
      if (Math.abs(art.x - MIRROR.x) < 0.5) {
        expect(Math.abs(art.z - MIRROR.z)).toBeGreaterThan(art.w / 2 + MIRROR.w / 2);
      }
    }
  });
});

describe("celebration themes", () => {
  it("dresses the same layout differently for each theme", () => {
    const july = decor("july4");
    const newYear = decor("newyear");
    expect(decor("july4")).toEqual(july);
    expect(decor("newyear")).toEqual(newYear);
    // July 4: bunting and star lanterns, no balloons or streamers.
    expect(count(july, (p) => p.shape === "cone")).toBeGreaterThan(100);
    expect(count(july, (p) => p.shape === "star" && p.mat === "glow")).toBeGreaterThan(8);
    expect(count(newYear, (p) => p.shape === "cone" || p.shape === "star")).toBe(0);
    // New Year: balloons and streamers in gold, silver and black.
    expect(count(newYear, (p) => p.shape === "ball" && p.mat === "lit")).toBeGreaterThanOrEqual(30);
    expect(count(newYear, (p) => p.shape === "box" && p.sz === 0.01 && p.sx === 0.06)).toBeGreaterThan(100);
    expect(count(july, (p) => p.shape === "ball" && p.mat === "lit")).toBe(0);
    // Both: string lights over the patio and a coloured band on all six tables.
    for (const parts of [july, newYear]) {
      expect(count(parts, (p) => p.mat === "glow" && p.shape === "ball" && p.z < -18)).toBe(60);
      expect(count(parts, (p) => p.shape === "cyl" && tableSpots.some((spot) => spot.x === p.x && spot.z === p.z))).toBe(6);
    }
    // Nothing in the daytime set hangs where a standing head would be (the cylinders are the table bands).
    for (const p of july) if (p.shape !== "cyl") expect(p.y - p.sy / 2).toBeGreaterThan(2.2);
  });

  it("has a daytime look and a night look", () => {
    expect(LOOKS.july4.stars).toBe(false);
    expect(LOOKS.newyear.stars).toBe(true);
    expect(LOOKS.newyear.burstEvery).toBeLessThan(LOOKS.july4.burstEvery);
  });

  it("plans firework bursts deterministically, beyond the back fence", () => {
    const directions = burstDirections(1);
    expect(directions).toEqual(burstDirections(1));
    expect(directions).not.toEqual(burstDirections(2));
    for (let i = 0; i < BURST_POINTS; i++) expect(Math.hypot(directions[i * 3], directions[i * 3 + 1], directions[i * 3 + 2])).toBeCloseTo(1);
    const plan = burstPlan("newyear", 0, 3);
    expect(plan).toEqual(burstPlan("newyear", 0, 3));
    expect(plan).not.toEqual(burstPlan("newyear", 1, 3));
    expect(plan.z).toBeLessThan(-42);
    expect(LOOKS.newyear.burstColors).toContain(plan.color);

    const out = new Float32Array(BURST_POINTS * 3);
    burstFrame(out, directions, 1, 20, -50, 0);
    expect([out[0], out[1], out[2]]).toEqual([1, 20, -50]);
    burstFrame(out, directions, 1, 20, -50, 1);
    expect(Math.hypot(out[0] - 1, out[2] + 50)).toBeLessThan(6);
  });

  it("counts down to local midnight", () => {
    expect(countdownText(new Date(2026, 11, 31, 23, 58, 30), true)).toBe("00:01:30");
    expect(countdownText(new Date(2026, 11, 31, 20, 0, 0), false)).toBe("04:00");
  });

  it("has a different sixteen-step groove for each theme", () => {
    for (const groove of Object.values(GROOVES)) {
      for (const pattern of [groove.kick, groove.snap, groove.hat, groove.bass]) expect(pattern).toHaveLength(16);
      expect(groove.bars).toHaveLength(4);
      for (const step of groove.stabs) expect(step).toBeLessThan(16);
    }
    expect(GROOVES.july4.bpm).not.toBe(GROOVES.newyear.bpm);
    expect(GROOVES.july4.kick).not.toEqual(GROOVES.newyear.kick);
  });
});

describe("gallery artwork", () => {
  it("is deterministic, stays on the canvas and differs between the two pieces", () => {
    expect(artwork("gathering")).toEqual(artwork("gathering"));
    expect(artwork("rhythm")).toEqual(artwork("rhythm"));
    expect(artwork("gathering")).not.toEqual(artwork("rhythm"));
    for (const op of [...artwork("gathering"), ...artwork("rhythm")]) {
      const xs = op.kind === "tri" ? [op.points[0], op.points[2], op.points[4]] : [op.x];
      const ys = op.kind === "tri" ? [op.points[1], op.points[3], op.points[5]] : [op.y];
      for (const n of [...xs, ...ys]) {
        expect(n).toBeGreaterThanOrEqual(-0.001);
        expect(n).toBeLessThanOrEqual(1.05);
      }
    }
  });

  it("uses a seeded generator, not Math.random", () => {
    const [a, b] = [rng(5), rng(5)];
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("golden time of day, centerpiece & heritage gallery", () => {
  it("gives Golden Time of Day an open-sky twilight look, original slow-jam groove and clean decor", () => {
    const golden = decor("golden");
    expect(decor("golden")).toEqual(golden);
    expect(LOOKS.golden.stars).toBe(true);
    expect(LOOKS.golden.moon).toBe("crescent");
    expect(LOOKS.golden.constellations).toBe(true);
    expect(count(golden, (p) => p.mat === "glow" && p.shape === "ball" && p.z < -18)).toBe(60);
    expect(count(golden, (p) => p.shape === "cyl" && tableSpots.some((spot) => spot.x === p.x && spot.z === p.z))).toBe(6);
    for (const p of golden) if (p.shape !== "cyl") expect(p.y - p.sy / 2).toBeGreaterThan(2.2);

    expect(GROOVES.golden.bpm).not.toBe(GROOVES.july4.bpm);
    expect(GROOVES.golden.bpm).not.toBe(GROOVES.newyear.bpm);
    expect(GROOVES.golden.kick).not.toEqual(GROOVES.july4.kick);
    expect(GROOVES.golden.kick).not.toEqual(GROOVES.newyear.kick);
    for (const pattern of [GROOVES.golden.kick, GROOVES.golden.snap, GROOVES.golden.hat, GROOVES.golden.bass]) {
      expect(pattern).toHaveLength(16);
    }
  });

  it("places the Drinking Gourd constellation in the northern open sky and varies burst styles", () => {
    expect(DRINKING_GOURD_STARS).toHaveLength(8);
    expect(DRINKING_GOURD_EDGES.length).toBeGreaterThanOrEqual(7);
    for (const star of DRINKING_GOURD_STARS) {
      expect(star.dir[2]).toBeLessThan(0);
      expect(star.dir[1]).toBeGreaterThan(0.35);
      expect(Math.hypot(...star.dir)).toBeCloseTo(1);
    }
    expect(new Set([burstStyle("golden", 0, 0), burstStyle("golden", 0, 1), burstStyle("golden", 0, 2)]).size).toBe(3);
  });

  it("builds the Five-Element Gallery Centerpiece inside its collider and above jump height", () => {
    const center = obstacles.find((o) => o.kind === "centerpiece");
    expect(center).toBeTruthy();
    expect(center!.height).toBeGreaterThan(0.9);
    const parts = structure().filter((p) => p.tag === center!.id);
    expect(parts.length).toBeGreaterThanOrEqual(6);
    expect(parts.some((p) => p.mat === "water")).toBe(false);
    expect(isWalkable(-3, -4)).toBe(true);
    expect(isWalkable(3, -4)).toBe(true);
  });

  it("generates all 12 heritage & house-party artworks deterministically within bounds", () => {
    const ids = Object.keys(ARTWORK_META) as ArtworkId[];
    expect(ids).toHaveLength(12);
    for (const id of ids) {
      const ops = artwork(id);
      expect(artwork(id)).toEqual(ops);
      expect(ops.length).toBeGreaterThan(4);
      expect(ARTWORK_META[id].title.length).toBeGreaterThan(0);
      for (const op of ops) {
        const xs = op.kind === "tri" ? [op.points[0], op.points[2], op.points[4]] : [op.x];
        const ys = op.kind === "tri" ? [op.points[1], op.points[3], op.points[5]] : [op.y];
        for (const n of [...xs, ...ys]) {
          expect(n, `${id} coord`).toBeGreaterThanOrEqual(-0.001);
          expect(n, `${id} coord`).toBeLessThanOrEqual(1.05);
        }
      }
    }
  });
});
