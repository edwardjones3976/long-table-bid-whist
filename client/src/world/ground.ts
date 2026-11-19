/**
 * What a player's body needs to know about the world, so that movement is real:
 * things are solid, low things can be stepped or jumped onto, edges can be
 * walked off, and the pool can be entered.
 *
 * Heights are metres above the house floor (y = 0). The body is an upright
 * cylinder of PLAYER_RADIUS. `reach` is the highest surface the body can get
 * on top of right now: its feet plus STEP_UP while it walks, barely above its
 * feet while it is in the air.
 *
 * `ground` is the mansion itself. Its solids come from world/solids.ts, which
 * reads them off the drawn scene, and are indexed on a grid the first time
 * anything asks; after that no call allocates.
 */
import { floorHeight, PLAYER_RADIUS, pool, PROPERTY, walls, wallThickness, type Rect } from "./layout";
import { footprint, structure } from "./plan";
import { FLAT, mansionSolids, type Solid } from "./solids";

/** The tallest rise a walking body takes in its stride (a stair, a kerb). */
export const STEP_UP = 0.3;

export interface Ground {
  /**
   * True when the body cannot have its centre at (x, z): off the property,
   * against a wall or fence, or touching something whose top is above `reach`.
   * `feet`, for a body in the air: it is clear of things it cannot stand on whose top is no higher than this,
   * so a jump passes over them.
   */
  blocked(x: number, z: number, reach: number, feet?: number): boolean;
  /**
   * The height the body would stand at here: the highest standable surface
   * under it that is no higher than `reach`, else the bare floor (which dips
   * in the pool basin). floor(x, z, -Infinity) is always the bare floor.
   */
  floor(x: number, z: number, reach: number): number;
  /** The height of the water surface when (x, z) is in the pool, else null. */
  water(x: number, z: number): number | null;
  /** True when the straight line between two points passes through a wall or fence (door gaps are open). */
  wallBetween(x0: number, z0: number, x1: number, z1: number): boolean;
}

// Read once here: every call below needs them.
const R = PLAYER_RADIUS;
const { x0: WEST, z0: NORTH, x1: EAST, z1: SOUTH } = PROPERTY;
const DEEP = pool.deep;
const DEEP_FLOOR = -pool.deepDepth;
/** The property is cut into squares this size; each lists the solids a body centred anywhere in it could touch. */
const CELL = 1;
const ACROSS = Math.ceil((EAST - WEST) / CELL);
const DOWN = Math.ceil((SOUTH - NORTH) / CELL);
const NONE: readonly Solid[] = [];

interface Index {
  solids: Solid[];
  cells: Solid[][];
  /** Each wall and fence piece as the box it is drawn as. */
  walls: Rect[];
  /** The drawn water: where it lies and how high its surface is. */
  water: Rect;
  surface: number;
}

let index: Index | null = null;

function build(): Index {
  const solids = mansionSolids();
  const cells: Solid[][] = Array.from({ length: ACROSS * DOWN }, () => []);
  for (const s of solids) {
    const reachX = Math.abs(s.cos) * s.hx + Math.abs(s.sin) * s.hz + s.r + R;
    const reachZ = Math.abs(s.sin) * s.hx + Math.abs(s.cos) * s.hz + s.r + R;
    const x1 = Math.min(ACROSS - 1, Math.floor((s.x + reachX - WEST) / CELL));
    const z1 = Math.min(DOWN - 1, Math.floor((s.z + reachZ - NORTH) / CELL));
    for (let cz = Math.max(0, Math.floor((s.z - reachZ - NORTH) / CELL)); cz <= z1; cz++) {
      for (let cx = Math.max(0, Math.floor((s.x - reachX - WEST) / CELL)); cx <= x1; cx++) cells[cz * ACROSS + cx].push(s);
    }
  }
  const wet = structure().find((part) => part.mat === "water")!;
  index = {
    solids,
    cells,
    walls: walls.map((wall) => {
      const half = wallThickness(wall) / 2;
      return wall.az === wall.bz ? { x0: wall.ax, z0: wall.az - half, x1: wall.bx, z1: wall.az + half } : { x0: wall.ax - half, z0: wall.az, x1: wall.ax + half, z1: wall.bz };
    }),
    water: footprint(wet),
    surface: wet.y + wet.sy / 2,
  };
  // "Big enough to stand on" has to mean a body fits there: a lamp's base under its pole and a counter's carcass under its top do not count.
  for (const s of solids.filter((each) => each.stand && !roomOn(each))) s.stand = false;
  return index;
}

/** The solids a body centred at (x, z) could be touching. */
function near(x: number, z: number): readonly Solid[] {
  const cx = Math.floor((x - WEST) / CELL);
  const cz = Math.floor((z - NORTH) / CELL);
  if (cx < 0 || cx >= ACROSS || cz < 0 || cz >= DOWN) return NONE;
  return (index ?? build()).cells[cz * ACROSS + cx];
}

/** The top of `s` under a body centred at (x, z), or -Infinity when the body's footprint does not reach it. */
function over(s: Solid, x: number, z: number): number {
  const ox = x - s.x;
  const oz = z - s.z;
  const lx = ox * s.cos - oz * s.sin;
  const dx = Math.max(Math.abs(lx) - s.hx, 0);
  const dz = Math.max(Math.abs(ox * s.sin + oz * s.cos) - s.hz, 0);
  const gap = s.r + R;
  if (dx * dx + dz * dz >= gap * gap) return -Infinity;
  if (!s.rise) return s.top;
  // A ramp climbs along its own +x, and the body stands as high as its uphill edge reaches.
  return s.top - s.rise * (s.hx - Math.min(lx + Math.sqrt(R * R - dz * dz), s.hx));
}

/** Whether a body can be centred somewhere over `s` and stand on it there. */
// shortcut: tried every 0.1 m across the top, so a free spot smaller than that between two things is missed; no top in the scene depends on one.
function roomOn(s: Solid): boolean {
  const level = s.top + FLAT;
  const wide = (s.hx + s.r) * 0.9;
  const deep = (s.hz + s.r) * 0.9;
  for (let u = -wide; u <= wide; u += 0.1) {
    for (let v = -deep; v <= deep; v += 0.1) {
      if (Math.hypot(Math.max(Math.abs(u) - s.hx, 0), Math.max(Math.abs(v) - s.hz, 0)) > s.r) continue;
      const x = s.x + u * s.cos + v * s.sin;
      const z = s.z - u * s.sin + v * s.cos;
      if (!ground.blocked(x, z, level) && ground.floor(x, z, level) === over(s, x, z)) return true;
    }
  }
  return false;
}

/** The bare floor at the point (x, z): layout's own everywhere (level, and the steps and shallow end of the pool) but in the deep end, which has a floor of its own. */
function bareAt(x: number, z: number): number {
  return x > DEEP.x0 && x <= DEEP.x1 && z >= DEEP.z0 && z <= DEEP.z1 ? DEEP_FLOOR : floorHeight(x, z);
}

/**
 * The highest bare floor under the body's footprint, so a head leaning over the pool's edge stays on the deck.
 * Exact here: the basin is axis-aligned rectangles and the steps only fall toward +x.
 */
function bare(x: number, z: number): number {
  return Math.max(bareAt(x, z), bareAt(x - R, z), bareAt(x + R, z), bareAt(x, z - R), bareAt(x, z + R));
}

/** Whether the line from (x0, z0) to (x1, z1) passes through `box`. */
function crosses(x0: number, z0: number, x1: number, z1: number, box: Rect): boolean {
  const dx = x1 - x0;
  const dz = z1 - z0;
  let from = 0;
  let to = 1;
  if (dx) {
    const a = (box.x0 - x0) / dx;
    const b = (box.x1 - x0) / dx;
    from = Math.max(from, Math.min(a, b));
    to = Math.min(to, Math.max(a, b));
  } else if (x0 < box.x0 || x0 > box.x1) return false;
  if (dz) {
    const a = (box.z0 - z0) / dz;
    const b = (box.z1 - z0) / dz;
    from = Math.max(from, Math.min(a, b));
    to = Math.min(to, Math.max(a, b));
  } else if (z0 < box.z0 || z0 > box.z1) return false;
  return from <= to;
}

export const ground: Ground = {
  blocked(x, z, reach, feet = -Infinity) {
    if (x < WEST + R || x > EAST - R || z < NORTH + R || z > SOUTH - R) return true;
    let floor = bare(x, z);
    if (floor > reach) return true;
    /** The tallest thing here that cannot be stood on. */
    let poke = -Infinity;
    const list = near(x, z);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const top = over(s, x, z);
      if (top === -Infinity) continue;
      if (s.always) return true;
      if (!s.stand) {
        if (top > poke) poke = top;
      } else if (top > reach) return true;
      else if (top > floor) floor = top;
    }
    // Something that cannot be stood on is in the way unless the body stands, or is in the air, clear above it.
    return poke > Math.max(floor + FLAT, feet);
  },

  floor(x, z, reach) {
    let floor = bare(x, z);
    const list = near(x, z);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s.stand) continue;
      const top = over(s, x, z);
      if (top <= reach && top > floor) floor = top;
    }
    return floor;
  },

  water(x, z) {
    const { water, surface } = index ?? build();
    return x >= water.x0 && x <= water.x1 && z >= water.z0 && z <= water.z1 ? surface : null;
  },

  wallBetween(x0, z0, x1, z1) {
    const boxes = (index ?? build()).walls;
    for (let i = 0; i < boxes.length; i++) if (crosses(x0, z0, x1, z1, boxes[i])) return true;
    return false;
  },
};

/** Every solid the ground is made of, as indexed: walls, fences and each drawn part a body can touch. For tests and reports. */
export function solids(): readonly Solid[] {
  return (index ?? build()).solids;
}
