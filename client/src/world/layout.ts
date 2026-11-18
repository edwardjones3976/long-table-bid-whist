/**
 * The mansion's geometry: pure data and pure helpers, the single source of truth
 * for where everything is. Metres, y up, origin at the centre of the house.
 *
 *   +x is east, +z is south (the front of the house), -z is north (the backyard).
 *   A Pose faces `ry` radians about y, matching Object3D.rotation.y:
 *   ry = 0 looks toward -z, and the forward vector is (-sin ry, 0, -cos ry).
 *
 * The house is 48 x 36 (x -24..24, z -18..18); the backyard is 48 x 24 behind it
 * (z -42..-18). Nothing outside PROPERTY is walkable.
 */
import { TABLES, type GameId, type Pose, type Seat, type TableId } from "../../../shared/protocol";

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 });

export const HOUSE: Rect = rect(-24, -18, 24, 18);
export const YARD: Rect = rect(-24, -42, 24, -18);
export const PROPERTY: Rect = rect(-24, -42, 24, 18);

export const WALL_HEIGHT = 3.2;
export const WALL_THICKNESS = 0.2;
export const DOOR_WIDTH = 2;
export const DOOR_HEIGHT = 2.2;
/** The backyard fence is low enough to see over. */
export const FENCE_HEIGHT = 1.2;
export const PLAYER_RADIUS = 0.3;
export const EYE_HEIGHT_STANDING = 1.6;
export const EYE_HEIGHT_SEATED = 1.2;
/** Card tables are round. */
export const TABLE_RADIUS = 0.65;
export const TABLE_HEIGHT = 0.74;
export const SEAT_HEIGHT = 0.45;
/** Seat centre to table centre. */
export const SEAT_DISTANCE = 1.05;
/** Within this distance of a table centre the table's panel is offered. */
export const TABLE_REACH = 3;

export type RoomKind = "foyer" | "gallery" | "lounge" | "kitchen" | "yard";

export interface Room {
  id: string;
  label: string;
  rect: Rect;
  kind: RoomKind;
  /** Set for the three card lounges. */
  game?: GameId;
}

export const rooms: readonly Room[] = [
  { id: "foyer", label: "Foyer", rect: rect(-8, 10, 8, 18), kind: "foyer" },
  { id: "gallery", label: "Central Gallery", rect: rect(-8, -18, 8, 10), kind: "gallery" },
  { id: "tonk-lounge", label: "Tonk Lounge", rect: rect(-24, 0, -8, 18), kind: "lounge", game: "tonk" },
  { id: "spades-lounge", label: "Spades Lounge", rect: rect(-24, -18, -8, 0), kind: "lounge", game: "spades" },
  { id: "bid-whist-lounge", label: "Bid Whist Lounge", rect: rect(8, 0, 24, 18), kind: "lounge", game: "bid-whist" },
  { id: "kitchen", label: "Communal Kitchen", rect: rect(8, -18, 24, 0), kind: "kitchen" },
  { id: "cookout", label: "Cookout Patio", rect: rect(-24, -28, -8, -18), kind: "yard" },
  { id: "yard-lounge", label: "Backyard Lounge", rect: rect(-8, -28, 8, -18), kind: "yard" },
  { id: "dance", label: "Music and Dance Corner", rect: rect(8, -28, 24, -18), kind: "yard" },
  { id: "pool", label: "Pool", rect: rect(-24, -42, 0, -28), kind: "yard" },
  { id: "lawn", label: "Lawn-Toss Lawn", rect: rect(0, -42, 24, -28), kind: "yard" },
];

export interface WallSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  height: number;
}

export interface Door {
  /** Centre of the opening. */
  x: number;
  z: number;
  width: number;
  /** "x": the wall runs east-west and you walk through along z. "z": the reverse. */
  wallAxis: "x" | "z";
}

/** An axis-aligned wall line and the centres of the openings cut into it. */
interface WallLine {
  axis: "x" | "z";
  /** The fixed coordinate: z for an "x" wall, x for a "z" wall. */
  at: number;
  from: number;
  to: number;
  height: number;
  openings: [centre: number, width: number][];
}

const line = (
  axis: "x" | "z",
  at: number,
  from: number,
  to: number,
  openings: [number, number][] = [],
  height = WALL_HEIGHT,
): WallLine => ({ axis, at, from, to, height, openings });

const door = (centre: number): [number, number] => [centre, DOOR_WIDTH];

// Every room has at least two ways out, so there are loop routes and no dead ends.
const WALL_LINES: readonly WallLine[] = [
  line("x", 18, -24, 24),
  line("z", -24, -18, 18),
  line("z", 24, -18, 18),
  // Back of the house: doors to the yard from the Spades Lounge, the gallery (wide) and the kitchen.
  line("x", -18, -24, 24, [door(-16), [0, 4], door(16)]),
  // West and east interior walls: lounge to foyer, lounge to gallery, and the north rooms to the gallery.
  line("z", -8, -18, 18, [door(-9), door(5), door(14)]),
  line("z", 8, -18, 18, [door(-9), door(5), door(14)]),
  line("x", 0, -24, -8, [door(-16)]),
  line("x", 0, 8, 24, [door(16)]),
  // Foyer to gallery is a wide arch.
  line("x", 10, -8, 8, [[0, 6]]),
  line("z", -24, -42, -18, [], FENCE_HEIGHT),
  line("z", 24, -42, -18, [], FENCE_HEIGHT),
  line("x", -42, -24, 24, [], FENCE_HEIGHT),
];

function segmentsOf(wall: WallLine): WallSegment[] {
  const cuts = [...wall.openings].sort((a, b) => a[0] - b[0]);
  const spans: [number, number][] = [];
  let start = wall.from;
  for (const [centre, width] of cuts) {
    spans.push([start, centre - width / 2]);
    start = centre + width / 2;
  }
  spans.push([start, wall.to]);
  return spans.map(([a, b]) =>
    wall.axis === "x"
      ? { ax: a, az: wall.at, bx: b, bz: wall.at, height: wall.height }
      : { ax: wall.at, az: a, bx: wall.at, bz: b, height: wall.height },
  );
}

/** Solid wall and fence pieces, already split around the door gaps. */
export const walls: readonly WallSegment[] = WALL_LINES.flatMap(segmentsOf);

export const doors: readonly Door[] = WALL_LINES.flatMap((wall) =>
  wall.openings.map(([centre, width]) =>
    wall.axis === "x"
      ? { x: centre, z: wall.at, width, wallAxis: wall.axis }
      : { x: wall.at, z: centre, width, wallAxis: wall.axis },
  ),
);

export type ObstacleKind = "potluck-counter" | "kitchen-counter" | "grill" | "dj-booth" | "sofa" | "toss-board";

/** Solid furniture. The world draws one thing per entry; nothing else blocks walking. */
export interface Obstacle {
  id: string;
  kind: ObstacleKind;
  label: string;
  rect: Rect;
  height: number;
}

export const obstacles: readonly Obstacle[] = [
  { id: "potluck-counter", kind: "potluck-counter", label: "Potluck Counter", rect: rect(11, -10, 21, -8.8), height: 0.95 },
  { id: "kitchen-counter", kind: "kitchen-counter", label: "Kitchen Counter", rect: rect(17.5, -17.7, 23, -16.9), height: 0.95 },
  { id: "grill", kind: "grill", label: "Grill", rect: rect(-21, -24, -19, -23), height: 1 },
  { id: "dj-booth", kind: "dj-booth", label: "Music Booth", rect: rect(19, -22, 22, -21), height: 1.1 },
  { id: "sofa-west", kind: "sofa", label: "Sofa", rect: rect(-5, -25, -2, -24), height: 0.8 },
  { id: "sofa-east", kind: "sofa", label: "Sofa", rect: rect(2, -25, 5, -24), height: 0.8 },
  { id: "toss-board-near", kind: "toss-board", label: "Lawn-Toss Board", rect: rect(11.6, -31.6, 12.4, -30.4), height: 0.3 },
  { id: "toss-board-far", kind: "toss-board", label: "Lawn-Toss Board", rect: rect(11.6, -39.6, 12.4, -38.4), height: 0.3 },
];

/**
 * The pool basin. The steps and the shallow end can be walked into; the deep
 * end cannot. `shallow` includes `steps`.
 */
export const pool = {
  water: rect(-22, -40, -4, -31),
  steps: rect(-22, -40, -20.5, -31),
  shallow: rect(-22, -40, -15, -31),
  deep: rect(-15, -40, -4, -31),
  shallowDepth: 0.6,
  deepDepth: 1.8,
} as const;

export interface TableSpot {
  id: TableId;
  game: GameId;
  label: string;
  x: number;
  z: number;
  /** The direction seat 0 looks. */
  facing: number;
  /** Seat 0..3 clockwise seen from above; partners (0 and 2, 1 and 3) sit opposite. Each faces the centre. */
  seats: [Pose, Pose, Pose, Pose];
  /** The standing dealer/host, at the corner between seat 3 and seat 0. */
  host: Pose;
}

const TABLE_CENTRES: Record<TableId, [x: number, z: number]> = {
  "tonk-1": [-16, 13.5],
  "tonk-2": [-16, 4.5],
  "spades-1": [-16, -4.5],
  "spades-2": [-16, -13.5],
  "bid-whist-1": [16, 13.5],
  "bid-whist-2": [16, 4.5],
};

/** A pose `distance` from (cx, cz) at `angle`, looking back at the centre. */
function around(cx: number, cz: number, angle: number, distance: number): Pose {
  return { x: cx + Math.sin(angle) * distance, z: cz + Math.cos(angle) * distance, ry: angle };
}

export const tableSpots: readonly TableSpot[] = TABLES.map(({ id, game, label }) => {
  const [x, z] = TABLE_CENTRES[id];
  // Seat 0 sits south of the table; -pi/2 per seat walks south, west, north, east: clockwise from above.
  const seat = (n: number) => around(x, z, (-n * Math.PI) / 2, SEAT_DISTANCE);
  return {
    id,
    game,
    label,
    x,
    z,
    facing: 0,
    seats: [seat(0), seat(1), seat(2), seat(3)],
    host: around(x, z, Math.PI / 4, SEAT_DISTANCE + 0.35),
  };
});

export function tableSpot(id: TableId): TableSpot {
  return tableSpots.find((spot) => spot.id === id)!;
}

/** Where a member at a table is: their seat, or the host's corner when `seat` is null. */
export function seatPose(id: TableId, seat: Seat | null): Pose {
  const spot = tableSpot(id);
  return seat === null ? spot.host : spot.seats[seat];
}

/** In the foyer, just inside the front door, looking into the house. */
export const spawn: Pose = { x: 0, z: 15.5, ry: 0 };

export interface Sign {
  id: string;
  label: string;
  x: number;
  /** Height of the sign's centre. */
  y: number;
  z: number;
  /** rotation.y for a plane whose readable face is its +z side: the face then points along (sin ry, 0, cos ry). */
  ry: number;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const SOUTH = 0;
const NORTH = Math.PI;
const sign = (id: string, label: string, x: number, z: number, ry: number, y = 2.6): Sign => ({ id, label, x, y, z, ry });

/** Wall signs sit 0.15 m off a solid stretch of wall (never over a door gap), facing the room they are read from. */
export const signs: readonly Sign[] = [
  sign("welcome", "Welcome to the Mansion", 5.5, 10.15, SOUTH),
  sign("tonk-foyer", "Tonk Lounge", -7.85, 16.5, EAST),
  sign("bid-whist-foyer", "Bid Whist Lounge", 7.85, 16.5, WEST),
  sign("tonk-gallery", "Tonk Lounge", -7.85, 8, EAST),
  sign("bid-whist-gallery", "Bid Whist Lounge", 7.85, 8, WEST),
  sign("spades-gallery", "Spades Lounge", -7.85, -6, EAST),
  sign("kitchen-gallery", "Communal Kitchen", 7.85, -6, WEST),
  sign("yard-gallery", "Backyard", 4.5, -17.85, SOUTH),
  sign("tonk-inside", "Tonk Lounge", -23.85, 9, EAST),
  sign("spades-inside", "Spades Lounge", -23.85, -9, EAST),
  sign("bid-whist-inside", "Bid Whist Lounge", 23.85, 9, WEST),
  sign("potluck", "Potluck Counter", 23.85, -9.4, WEST),
  sign("cookout", "Cookout Patio", -12, -18.15, NORTH),
  sign("yard-lounge", "Backyard Lounge", -5, -18.15, NORTH),
  sign("dance", "Music and Dance Corner", 12, -18.15, NORTH),
  sign("pool", "Pool: steps and shallow end this side", -23.8, -35.5, EAST, 1.7),
  sign("lawn", "Lawn-Toss Lawn", 23.8, -35, WEST, 1.7),
];

const inside = (r: Rect, x: number, z: number, margin = 0): boolean =>
  x >= r.x0 - margin && x <= r.x1 + margin && z >= r.z0 - margin && z <= r.z1 + margin;

function distanceToSegment(x: number, z: number, s: WallSegment): number {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / lengthSq)) : 0;
  return Math.hypot(x - (s.ax + t * dx), z - (s.az + t * dz));
}

/**
 * Whether a body of `radius` may stand at (x, z): on the property, clear of
 * walls and fences (door gaps are open), tables, furniture and the deep end.
 */
export function isWalkable(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  if (!inside(PROPERTY, x, z, -radius)) return false;
  if (walls.some((wall) => distanceToSegment(x, z, wall) < radius + WALL_THICKNESS / 2)) return false;
  if (tableSpots.some((spot) => Math.hypot(x - spot.x, z - spot.z) < radius + TABLE_RADIUS)) return false;
  if (obstacles.some((obstacle) => inside(obstacle.rect, x, z, radius))) return false;
  return !inside(pool.deep, x, z, radius);
}

/** Floor height under (x, z): 0 everywhere except the pool steps (a ramp) and the shallow end. */
export function floorHeight(x: number, z: number): number {
  if (!inside(pool.shallow, x, z)) return 0;
  const down = Math.min(1, (x - pool.steps.x0) / (pool.steps.x1 - pool.steps.x0));
  return -pool.shallowDepth * down;
}

export function roomAt(x: number, z: number): Room | null {
  return rooms.find((room) => inside(room.rect, x, z)) ?? null;
}

export function nearestTable(x: number, z: number): { spot: TableSpot; distance: number } {
  let best = { spot: tableSpots[0], distance: Infinity };
  for (const spot of tableSpots) {
    const distance = Math.hypot(x - spot.x, z - spot.z);
    if (distance < best.distance) best = { spot, distance };
  }
  return best;
}
