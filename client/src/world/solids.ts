/**
 * What in the mansion a body can bump into or stand on, worked out from the
 * same data the scene is drawn from: every plan.ts part and every layout.ts
 * wall becomes a Solid (a footprint and a top). What is drawn is what is solid.
 *
 *   mansionSolids()   a fresh list, for world/ground.ts to index
 *   solidOf(part)     one drawn part as a Solid, or null when a body cannot touch it
 *
 * Left out: whatever lies flat (floors, rugs, tiles, base plates, and the pool
 * basin, which ground.ts walks as the bare floor), whatever hangs above a
 * standing head (rafters, door arches, umbrella tops, table marker boards), the
 * boxes a wall is drawn with (the walls themselves come from layout.walls, door
 * gaps open) and the theme decor, which two people in one room may see differently.
 *
 * A flat top at least MIN_STAND across can be stood on: a box, an upright
 * cylinder, or a wide squashed ball (a cushion). A box tipped gently about one
 * axis is a ramp. Everything else (balls, cones, thin posts, steeply tilted
 * pieces) is only ever in the way. A card table, its chairs and its dealer's
 * stand are in the way at any height, so nobody can get on them. No part of a
 * counter, the grill or the music booth is a top to stand on.
 */
import { EYE_HEIGHT_STANDING, obstacles, tableSpots, walls, wallThickness, type WallSegment } from "./layout";
import { structure, type Part } from "./plan";

export interface Solid {
  /** Centre of the footprint. */
  x: number;
  z: number;
  /**
   * The footprint: a box of half-size hx by hz, turned so that its own +x axis
   * points along (cos, -sin) on the plan, and grown by r all round. A disc is hx = hz = 0.
   */
  cos: number;
  sin: number;
  hx: number;
  hz: number;
  r: number;
  /** Its highest point, metres above the house floor. */
  top: number;
  /** A body can stand on it. ground.ts clears this where nothing leaves a body room to. */
  stand: boolean;
  /** In the way whatever the body can reach: walls, fences and card-table furniture. */
  always: boolean;
  /** A ramp: metres its top climbs per metre along its own +x, reaching `top` at the +x edge. 0 for a level top. */
  rise: number;
}

/** Anything rising no more than this above the surface under it is trodden on, not bumped into. */
export const FLAT = 0.06;
/** A top has to be this far across to stand on. */
const MIN_STAND = 0.3;
/** A squashed ball this wide is a cushion to stand on; a smaller one is a lid or a helping of food. */
const CUSHION = 0.5;
/** A box tipped no further than this (radians) is a ramp. */
const GENTLE = 0.3;
/** Parts whose underside is above this are over a standing head. */
// shortcut: nothing overhead is solid, so a jumping head passes through a door arch or an umbrella; stopping it needs the body's height in the Ground interface.
const HEAD = EYE_HEIGHT_STANDING + 0.2;

const solid = (x: number, z: number, hx: number, hz: number, r: number, top: number, extra: Partial<Solid>): Solid => ({
  x,
  z,
  cos: 1,
  sin: 0,
  hx,
  hz,
  r,
  top,
  stand: false,
  always: false,
  rise: 0,
  ...extra,
});

/** Wall segments run along x or z from (ax, az) to (bx, bz), a before b. */
const offWall = (x: number, z: number, w: WallSegment): number =>
  Math.hypot(x - Math.max(w.ax, Math.min(w.bx, x)), z - Math.max(w.az, Math.min(w.bz, z)));

/** A table's furniture is everything drawn nearer its centre than its host stands. */
const atTable = (x: number, z: number): boolean =>
  tableSpots.some((spot) => Math.hypot(x - spot.x, z - spot.z) < Math.hypot(spot.host.x - spot.x, spot.host.z - spot.z));

export function solidOf(p: Part): Solid | null {
  if (p.shape.startsWith("arch:")) return null;
  if (p.shape === "box" && walls.some((wall) => offWall(p.x, p.z, wall) < 0.01)) return null;
  // Parts.tsx turns a part by (rx, ry, rz) in three's default XYZ order; these are the terms of that matrix.
  const [a, b, c, d, e, f] = [Math.cos(p.rx), Math.sin(p.rx), Math.cos(p.ry), Math.sin(p.ry), Math.cos(p.rz), Math.sin(p.rz)];
  /** How much of the part's own up is still up: 1 unless it is tilted. */
  const upright = Math.abs(a * e - b * f * d);
  const height = Math.abs(a * f + b * e * d) * p.sx + upright * p.sy + Math.abs(b * c) * p.sz;
  const top = p.y + height / 2;
  if (top <= FLAT || top - height >= HEAD) return null;
  const always = atTable(p.x, p.z);

  if (upright > 0.999) {
    const across = Math.min(p.sx, p.sz);
    const cushion = p.shape === "ball" && p.sy <= across / 2 && across >= CUSHION;
    // No part of a named obstacle taller than a jump reaches (JUMP_HEIGHT + AIR_REACH in controls/motion.ts; a literal,
    // because importing it would make an import cycle) can be stood on: the counters, the grill's side shelf, the music booth.
    const tall = (obstacles.find((o) => o.id === p.tag)?.height ?? 0) > 0.9;
    const stand = !always && !tall && (p.shape === "box" || p.shape === "cyl" || cushion) && across >= MIN_STAND;
    if (p.shape !== "box" && p.sx === p.sz) return solid(p.x, p.z, 0, 0, p.sx / 2, top, { stand, always });
    // shortcut: a round part that is not a circle on the plan is its box (a chair back's corners stand 3 cm proud); give it an ellipse if a big one is ever drawn.
    return solid(p.x, p.z, p.sx / 2, p.sz / 2, 0, top, { cos: c, sin: d, stand, always });
  }

  // Tilted or lying down: the box around it, square to the world.
  // shortcut: exact for a box turned about x or z alone and for a cylinder on its side, which is all the scene has; anything else tilted gets a footprint a little too big.
  const hx = (Math.abs(c * e) * p.sx + Math.abs(c * f) * p.sy + Math.abs(d) * p.sz) / 2;
  const hz = (Math.abs(b * f - a * e * d) * p.sx + Math.abs(b * e + a * f * d) * p.sy + Math.abs(a * c) * p.sz) / 2;
  const tilt = p.rz || p.rx;
  const ramp = !always && p.shape === "box" && !p.ry && !(p.rx && p.rz) && Math.abs(tilt) <= GENTLE && Math.min(hx, hz) * 2 >= MIN_STAND;
  if (!ramp) return solid(p.x, p.z, hx, hz, 0, top, { always });
  // The top climbs toward +x or -x when the box is turned about z, toward -z or +z when it is turned about x.
  // shortcut: the slope is taken to reach `top` at the footprint's edge, which is the board's thickness times its tilt out (under 1 cm on a toss board).
  const rise = Math.tan(Math.abs(tilt));
  return p.rz
    ? solid(p.x, p.z, hx, hz, 0, top, { cos: Math.sign(p.rz), stand: true, rise })
    : solid(p.x, p.z, hz, hx, 0, top, { cos: 0, sin: Math.sign(p.rx), stand: true, rise });
}

export function mansionSolids(): Solid[] {
  const out: Solid[] = [];
  for (const wall of walls) {
    const alongX = wall.az === wall.bz;
    const half = Math.hypot(wall.bx - wall.ax, wall.bz - wall.az) / 2;
    out.push(solid((wall.ax + wall.bx) / 2, (wall.az + wall.bz) / 2, half, 0, wallThickness(wall) / 2, wall.height, { cos: alongX ? 1 : 0, sin: alongX ? 0 : -1, always: true }));
  }
  for (const part of structure()) {
    const made = solidOf(part);
    if (made) out.push(made);
  }
  return out;
}
