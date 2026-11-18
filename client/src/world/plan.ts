/**
 * Everything the world draws, as plain data built from layout.ts: a list of
 * simple solids (Part) that Parts.tsx batches into a handful of instanced
 * meshes. No three.js here, so the plan can be unit tested.
 *
 *   structure()    the house, yard and furniture; the same for every theme
 *   decor(theme)   the celebration dressing that changes with the theme
 *   labels()       every text sign: layout.signs plus a marker post per table
 *   ARTWORKS       where the two framed pieces hang
 *
 * Parts tagged with an obstacle or table id stay inside that collider
 * (tests/client/world.test.ts checks it). Untagged furniture is dressing that
 * layout.isWalkable does not know about, so people can pass through it.
 */
import type { GameId } from "../../../shared/protocol";
import type { Theme } from "../state/local";
import {
  doors,
  HOUSE,
  obstacles,
  pool,
  PROPERTY,
  rooms,
  SEAT_HEIGHT,
  signs,
  TABLE_HEIGHT,
  TABLE_RADIUS,
  tableSpots,
  WALL_HEIGHT,
  WALL_THICKNESS,
  walls,
  type Obstacle,
  type Rect,
  type Room,
  type TableSpot,
} from "./layout";

export interface Part {
  /** "box", "cyl", "ball", "cone", "star", or "arch:<width>" (a door-head piece already in metres). */
  shape: string;
  mat: "lit" | "glow" | "glass" | "water";
  /** Centre. */
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
  color: string;
  tag?: string;
}

type Extra = Partial<Pick<Part, "rx" | "ry" | "rz" | "mat" | "tag">>;

const part = (shape: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, extra: Extra = {}): Part => ({
  shape,
  mat: "lit",
  x,
  y,
  z,
  sx,
  sy,
  sz,
  rx: 0,
  ry: 0,
  rz: 0,
  color,
  ...extra,
});

// Boxes, cylinders and cones are placed by their base height y0; balls by their centre.
const box = (x: number, y0: number, z: number, sx: number, h: number, sz: number, color: string, extra?: Extra) =>
  part("box", x, y0 + h / 2, z, sx, h, sz, color, extra);
const cyl = (x: number, y0: number, z: number, d: number, h: number, color: string, extra?: Extra) =>
  part("cyl", x, y0 + h / 2, z, d, h, d, color, extra);
const cone = (x: number, y0: number, z: number, d: number, h: number, color: string, extra?: Extra) =>
  part("cone", x, y0 + h / 2, z, d, h, d, color, extra);
const ball = (x: number, y: number, z: number, d: number, color: string, extra?: Extra) => part("ball", x, y, z, d, d, d, color, extra);
const slab = (r: Rect, y0: number, h: number, color: string, extra?: Extra) =>
  box((r.x0 + r.x1) / 2, y0, (r.z0 + r.z1) / 2, r.x1 - r.x0, h, r.z1 - r.z0, color, extra);

/** A box with half-round ends, seen from above: the house style for counters, benches and sofas. */
function pill(x: number, y0: number, z: number, length: number, depth: number, h: number, color: string, ry = 0): Part[] {
  const half = (length - depth) / 2;
  const dx = Math.cos(ry) * half;
  const dz = -Math.sin(ry) * half;
  return [box(x, y0, z, length - depth, h, depth, color, { ry }), cyl(x + dx, y0, z + dz, depth, h, color), cyl(x - dx, y0, z - dz, depth, h, color)];
}

const tagged = (tag: string, parts: Part[]): Part[] => parts.map((p) => ({ ...p, tag }));

/** Small seeded generator (mulberry32) so every "random" arrangement is the same on every device. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The parts of `outer` left after cutting `hole` (which lies inside it) out. */
export function subtract(outer: Rect, hole: Rect): Rect[] {
  return [
    { x0: outer.x0, z0: outer.z0, x1: outer.x1, z1: hole.z0 },
    { x0: outer.x0, z0: hole.z1, x1: outer.x1, z1: outer.z1 },
    { x0: outer.x0, z0: hole.z0, x1: hole.x0, z1: hole.z1 },
    { x0: hole.x1, z0: hole.z0, x1: outer.x1, z1: hole.z1 },
  ].filter((r) => r.x1 > r.x0 && r.z1 > r.z0);
}

/** The ground a part covers, ignoring any tilt (which only makes it smaller). */
export function footprint(p: Part): Rect {
  // A cylinder laid on its side has its length along local x.
  const w = Math.abs(Math.sin(p.rz)) > 0.7 ? p.sy : p.sx;
  const c = Math.abs(Math.cos(p.ry));
  const s = Math.abs(Math.sin(p.ry));
  const hx = (c * w + s * p.sz) / 2;
  const hz = (s * w + c * p.sz) / 2;
  return { x0: p.x - hx, z0: p.z - hz, x1: p.x + hx, z1: p.z + hz };
}

const C = {
  wall: "#a9acb0",
  trim: "#8c9096",
  stone: "#bdb7ab",
  wood: "#a27b54",
  darkWood: "#6f5239",
  brass: "#c9a24a",
  charcoal: "#3b3c40",
  steel: "#8f9499",
  cushion: "#8d8f94",
  cream: "#f1ece0",
  leaf: "#5d7f55",
  hedge: "#4f6f4a",
  pot: "#b98b6a",
  tile: "#dfe7e6",
  water: "#4aa3c7",
  lamp: "#ffe9c4",
  glass: "#bcd3dc",
};

const FLOOR: Record<string, string> = {
  foyer: "#9b9488",
  gallery: "#8b867d",
  "tonk-lounge": "#8a6c50",
  "spades-lounge": "#6f7982",
  "bid-whist-lounge": "#7f7a68",
  kitchen: "#a7a49d",
  cookout: "#a59d90",
  "yard-lounge": "#9c9486",
  dance: "#8a8279",
  pool: "#c9c2b4",
  lawn: "#5f8a4e",
};

/** Each game keeps one look across its lounge and its tables, so the three lounges read apart. */
const GAME: Record<GameId, { rug: string; felt: string; seat: string }> = {
  tonk: { rug: "#9c5a3c", felt: "#5b6f5d", seat: "#b08a66" },
  spades: { rug: "#4a5a6e", felt: "#4f6672", seat: "#7f8a96" },
  "bid-whist": { rug: "#6b6a3f", felt: "#5f6650", seat: "#a39a7c" },
};

const mid = (r: Rect): [number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
const room = (id: string): Room => rooms.find((r) => r.id === id)!;

function floors(): Part[] {
  const far = { x0: PROPERTY.x0 - 80, z0: PROPERTY.z0 - 80, x1: PROPERTY.x1 + 80, z1: PROPERTY.z1 + 80 };
  return [
    ...rooms.flatMap((r) => (r.id === "pool" ? subtract(r.rect, pool.water) : [r.rect]).map((area) => slab(area, -0.1, 0.1, FLOOR[r.id] ?? C.stone))),
    ...subtract(far, PROPERTY).map((area) => slab(area, -0.15, 0.1, "#55744a")),
  ];
}

function poolBasin(): Part[] {
  const { water, steps, shallow, deep, shallowDepth, deepDepth } = pool;
  const rim = { x0: water.x0 - 0.15, z0: water.z0 - 0.15, x1: water.x1 + 0.15, z1: water.z1 + 0.15 };
  const stepWidth = (steps.x1 - steps.x0) / 3;
  return [
    // Three visible steps stand in for the ramp layout.floorHeight walks people down.
    ...[0, 1, 2].map((i) => {
      const top = (-shallowDepth * (i + 1)) / 4;
      return slab({ ...steps, x0: steps.x0 + i * stepWidth, x1: steps.x0 + (i + 1) * stepWidth }, -deepDepth, deepDepth + top, C.cream);
    }),
    slab({ ...shallow, x0: steps.x1 }, -deepDepth, deepDepth - shallowDepth, C.tile),
    slab(deep, -deepDepth - 0.1, 0.1, "#b9cfd2"),
    ...subtract(rim, water).flatMap((side) => [slab(side, -deepDepth - 0.1, deepDepth, C.tile), slab(side, 0, 0.03, C.cream)]),
    slab(water, -0.14, 0.02, C.water, { mat: "water" }),
  ];
}

function wallParts(): Part[] {
  const out: Part[] = [];
  const ends = new Map<string, { x: number; z: number; height: number }>();
  for (const w of walls) {
    const alongX = w.az === w.bz;
    const length = Math.hypot(w.bx - w.ax, w.bz - w.az);
    const cx = (w.ax + w.bx) / 2;
    const cz = (w.az + w.bz) / 2;
    const fence = w.height < WALL_HEIGHT;
    const thick = fence ? 0.3 : WALL_THICKNESS;
    const piece = (x: number, y0: number, len: number, h: number, color: string, extra?: Extra) =>
      out.push(alongX ? box(x, y0, cz, len, h, thick, color, extra) : box(cx, y0, x, thick, h, len, color, extra));
    if (alongX && !fence && w.az === HOUSE.z0 && length >= 4) {
      // The back wall looks onto the yard: a long window between two piers.
      const span = length - 2;
      piece(w.ax + 0.5, 0, 1, w.height, C.wall);
      piece(w.bx - 0.5, 0, 1, w.height, C.wall);
      piece(cx, 0, span, 1, C.wall);
      piece(cx, 2.3, span, w.height - 2.3, C.wall);
      out.push(box(cx, 1, cz, span, 1.3, 0.04, C.glass, { mat: "glass" }));
      const bays = Math.round(span / 2.2);
      for (let i = 1; i < bays; i++) out.push(box(w.ax + 1 + (i * span) / bays, 1, cz, 0.08, 1.3, 0.12, C.trim));
    } else {
      piece(alongX ? cx : cz, 0, length, fence ? w.height - 0.1 : w.height, fence ? C.hedge : C.wall);
    }
    for (const [x, z] of [[w.ax, w.az], [w.bx, w.bz]]) {
      const key = `${x},${z}`;
      ends.set(key, { x, z, height: Math.max(w.height, ends.get(key)?.height ?? 0) });
    }
  }
  // A round column at every wall end softens the corners and the door openings.
  for (const { x, z, height } of ends.values()) {
    out.push(height < WALL_HEIGHT ? cyl(x, 0, z, 0.24, height + 0.1, C.darkWood) : cyl(x, 0, z, WALL_THICKNESS * 1.6, height, C.wall));
  }
  for (const d of doors) out.push(part(`arch:${d.width}`, d.x, 0, d.z, 1, 1, 1, C.wall, { ry: d.wallAxis === "x" ? 0 : Math.PI / 2 }));
  // Open rafters instead of a ceiling: the sky and the fireworks stay in view.
  for (let z = HOUSE.z0; z <= HOUSE.z1; z += 2) out.push(box(0, WALL_HEIGHT, z, HOUSE.x1 - HOUSE.x0 + 0.4, 0.22, 0.18, C.wood));
  return out;
}

function chair(x: number, z: number, ry: number, color: string, size = 1): Part[] {
  const back = 0.24 * size;
  return [
    cyl(x, 0, z, 0.4 * size, 0.03, C.charcoal),
    cyl(x, 0.03, z, 0.08, SEAT_HEIGHT - 0.11, C.brass),
    cyl(x, SEAT_HEIGHT - 0.08, z, 0.46 * size, 0.08, color),
    // local +z is behind the sitter
    part("ball", x + Math.sin(ry) * back, SEAT_HEIGHT + 0.28, z + Math.cos(ry) * back, 0.46 * size, 0.5, 0.09, color, { ry }),
  ];
}

const pouffe = (x: number, z: number, color: string): Part[] => [cyl(x, 0, z, 0.55, 0.36, color), part("ball", x, 0.36, z, 0.55, 0.16, 0.55, color)];

const planter = (x: number, z: number, size = 1): Part[] => [
  cyl(x, 0, z, 0.6 * size, 0.55 * size, C.pot),
  ball(x, 0.95 * size, z, 0.9 * size, C.leaf),
  ball(x + 0.2 * size, 1.25 * size, z - 0.1 * size, 0.55 * size, "#6c8f62"),
];

const lowTable = (x: number, z: number, d = 0.9): Part[] => [cyl(x, 0, z, 0.2, 0.36, C.brass), cyl(x, 0.36, z, d, 0.05, C.wood)];

const lamp = (x: number, z: number): Part[] => [
  cyl(x, 0, z, 0.5, 0.5, C.darkWood),
  cyl(x, 0.5, z, 0.05, 0.5, C.brass),
  ball(x, 1.15, z, 0.34, C.lamp, { mat: "glow" }),
];

/** A sofa whose sitters look along local +z. */
function sofa(x: number, z: number, length: number, ry: number, color: string, depth = 0.9): Part[] {
  const off = depth / 2 - 0.15;
  return [
    ...pill(x, 0, z, length, depth, 0.42, color, ry),
    ...pill(x - Math.sin(ry) * off, 0, z - Math.cos(ry) * off, length, 0.3, 0.8, C.cushion, ry),
  ];
}

function tableFurniture(spot: TableSpot): Part[] {
  const { x, z } = spot;
  const look = GAME[spot.game];
  const [hx, hz] = [x + (spot.host.x - x) * 0.72, z + (spot.host.z - z) * 0.72];
  return [
    cyl(x, 0, z, 4.6, 0.02, look.rug),
    ...tagged(spot.id, [
      cyl(x, 0, z, 0.7, 0.05, C.charcoal),
      cyl(x, 0.05, z, 0.22, TABLE_HEIGHT - 0.11, C.brass),
      cyl(x, TABLE_HEIGHT - 0.06, z, TABLE_RADIUS * 2, 0.05, C.darkWood),
      // The felt's top is exactly TABLE_HEIGHT, where the table interface lays the cards.
      cyl(x, TABLE_HEIGHT - 0.011, z, TABLE_RADIUS * 2 - 0.1, 0.011, look.felt),
    ]),
    ...spot.seats.flatMap((seat) => chair(seat.x, seat.z, seat.ry, look.seat)),
    // The dealer's stand, between the host and the table.
    cyl(hx, 0, hz, 0.3, 0.98, C.darkWood),
    cyl(hx, 0.98, hz, 0.42, 0.04, C.brass),
    // Marker post behind the far corner; its two faces are in labels().
    cyl(spot.x - MARKER, 0, spot.z - MARKER, 0.07, 2.25, C.brass),
    box(spot.x - MARKER, 1.85, spot.z - MARKER, 0.04, 0.4, 1.7, C.charcoal),
  ];
}

/** How far the marker post stands from the table centre along both x and z. */
const MARKER = 1.1;

function lounge(r: Room): Part[] {
  const west = r.rect.x0 === HOUSE.x0;
  const dir = west ? 1 : -1;
  const wallX = west ? r.rect.x0 : r.rect.x1;
  const [cx, cz] = mid(r.rect);
  const look = GAME[r.game!];
  const out = [
    ...sofa(wallX + dir * 0.75, cz, 3.2, (dir * Math.PI) / 2, look.seat),
    ...lamp(wallX + dir * 0.6, cz - 2.2),
    ...lamp(wallX + dir * 0.6, cz + 2.2),
    ...lowTable(wallX + dir * 1.9, cz),
    ...pouffe(wallX + dir * 2.6, cz - 0.9, look.rug),
    ...pouffe(wallX + dir * 2.6, cz + 0.9, look.rug),
  ];
  const south = r.rect.z1 - 0.45;
  if (r.game === "tonk") {
    // A bookshelf wall.
    const random = rng(7);
    out.push(box(cx, 0, south + 0.1, 4.2, 2.1, 0.4, C.darkWood));
    for (let shelf = 0; shelf < 3; shelf++) {
      out.push(box(cx, 0.3 + shelf * 0.62, south - 0.12, 4, 0.05, 0.16, C.wood));
      for (let i = 0; i < 12; i++) {
        const h = 0.3 + random() * 0.2;
        out.push(box(cx - 1.8 + i * 0.33, 0.35 + shelf * 0.62, south - 0.12, 0.22, h, 0.1, ["#8c6f5a", "#6f7c86", "#b9a98a", "#7a8468"][Math.floor(random() * 4)]));
      }
    }
  } else if (r.game === "bid-whist") {
    // A long sideboard with two lamps.
    out.push(...pill(cx, 0, south, 3.8, 0.5, 0.9, C.wood), ...pill(cx, 0.9, south, 3.8, 0.5, 0.04, C.brass));
    for (const dx of [-1.4, 1.4]) out.push(cyl(cx + dx, 0.94, south, 0.05, 0.3, C.brass), ball(cx + dx, 1.36, south, 0.28, C.lamp, { mat: "glow" }));
    out.push(cyl(cx, 0.94, south, 0.3, 0.25, C.pot), ball(cx, 1.4, south, 0.5, C.leaf));
  } else {
    // An indoor garden: tall plants along the north windows and the south wall.
    for (const px of [r.rect.x0 + 2.5, r.rect.x1 - 2.5]) out.push(...planter(px, r.rect.z0 + 0.8, 1.3), ...planter(px, r.rect.z1 - 0.8, 1.3));
  }
  return out;
}

const DISH = ["#b5654a", "#c9a24a", "#7f8f7a", "#d8d2c6"];

function obstacleParts(o: Obstacle): Part[] {
  const { rect: r, height } = o;
  const [cx, cz] = mid(r);
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  switch (o.kind) {
    case "potluck-counter": {
      const out = [...pill(cx, 0, cz, w, d, height - 0.05, C.cream), ...pill(cx, height - 0.05, cz, w, d, 0.05, C.wood)];
      // Covered dishes down the counter: everybody brought something.
      for (let i = 0; i < 8; i++) {
        const x = r.x0 + 1.2 + (i * (w - 2.4)) / 7;
        const z = cz + (i % 2 ? 0.15 : -0.15);
        if (i % 3 === 0) out.push(cyl(x, height, z, 0.4, 0.18, C.steel), part("ball", x, height + 0.18, z, 0.38, 0.14, 0.38, DISH[i % 4]));
        else if (i % 3 === 1) out.push(cyl(x, height, z, 0.52, 0.04, C.cream), part("ball", x, height + 0.06, z, 0.4, 0.14, 0.4, DISH[i % 4]));
        else out.push(cone(x, height, z, 0.44, 0.2, DISH[i % 4], { rz: Math.PI }));
      }
      return out;
    }
    case "kitchen-counter": {
      const out = [box(cx, 0, cz, w, height - 0.05, d, C.trim), box(cx, height - 0.05, cz, w, 0.05, d, C.stone)];
      out.push(box(cx - w / 4, height, cz, 0.8, 0.01, 0.5, C.steel));
      for (const [dx, dz] of [[-0.25, -0.15], [0.25, -0.15], [-0.25, 0.15], [0.25, 0.15]]) out.push(cyl(cx + w / 4 + dx, height, cz + dz, 0.22, 0.012, C.charcoal));
      return out;
    }
    case "grill":
      return [
        ...[[-0.5, -0.2], [0.35, -0.2], [-0.5, 0.2], [0.35, 0.2]].map(([dx, dz]) => cyl(cx + dx, 0, cz + dz, 0.06, 0.6, C.charcoal)),
        // The smoker barrel lies on its side.
        part("cyl", cx - 0.15, 0.7, cz, 0.6, 1.3, 0.6, C.charcoal, { rz: Math.PI / 2 }),
        cyl(cx + 0.35, 0.7, cz - 0.15, 0.12, 0.3, C.charcoal),
        box(cx + 0.75, 0.72, cz, 0.45, 0.04, 0.6, C.wood),
        box(cx - 0.15, 0.8, cz + 0.33, 0.6, 0.04, 0.04, C.brass),
      ];
    case "dj-booth":
      return [
        ...pill(cx, 0, cz, w, d, height - 0.1, C.charcoal),
        box(cx, height - 0.1, cz, w - 0.6, 0.05, d - 0.2, C.wood),
        cyl(cx - 0.7, height - 0.05, cz, 0.45, 0.03, C.steel),
        cyl(cx + 0.7, height - 0.05, cz, 0.45, 0.03, C.steel),
        box(cx, height - 0.05, cz, 0.35, 0.05, 0.4, C.brass),
      ];
    case "sofa":
      return sofa(cx, cz, w, 0, "#a9a294", d);
    case "toss-board": {
      // The raised end is the one away from the other board, where the thrower stands.
      const boards = obstacles.filter((other) => other.kind === "toss-board");
      const dir = cz >= boards.reduce((sum, b) => sum + mid(b.rect)[1], 0) / boards.length ? 1 : -1;
      const tilt = -dir * 0.2;
      return [
        box(cx, 0.14, cz, w, 0.04, d, C.wood, { rx: tilt }),
        part("cyl", cx, 0.23, cz + dir * 0.33, 0.16, 0.045, 0.16, C.charcoal, { rx: tilt }),
        box(cx, 0, cz + dir * 0.52, w - 0.1, 0.22, 0.04, C.darkWood),
      ];
    }
  }
}

function indoors(): Part[] {
  const foyer = room("foyer").rect;
  const gallery = room("gallery").rect;
  const kitchen = room("kitchen").rect;
  const welcome = signs.find((s) => s.id === "welcome")!;
  const potluck = obstacles.find((o) => o.kind === "potluck-counter")!.rect;
  const out: Part[] = [];

  // Foyer: a round rug, a console under the welcome sign and a bench across from it.
  out.push(cyl(mid(foyer)[0], 0, mid(foyer)[1], 5, 0.02, "#8c8478"));
  out.push(...pill(welcome.x, 0, welcome.z + 0.3, 2.4, 0.4, 0.85, C.wood), cyl(welcome.x - 0.7, 0.85, welcome.z + 0.3, 0.22, 0.3, C.brass), ball(welcome.x - 0.7, 1.35, welcome.z + 0.3, 0.45, C.leaf));
  out.push(ball(welcome.x + 0.6, 1.02, welcome.z + 0.3, 0.3, C.lamp, { mat: "glow" }));
  out.push(...pill(-welcome.x, 0, welcome.z + 0.4, 2.4, 0.5, 0.45, C.cushion));
  for (const x of [foyer.x0 + 0.8, foyer.x1 - 0.8]) out.push(...planter(x, foyer.z1 - 0.8, 1.2));

  // Gallery: a bench under each artwork and a seating cluster at each back window.
  for (const art of ARTWORKS) {
    const inward = Math.sin(art.ry);
    out.push(box(art.x - inward * 0.035, art.y - art.h / 2 - 0.08, art.z, 0.06, art.h + 0.16, art.w + 0.16, C.darkWood));
    out.push(...pill(art.x + inward * 0.6, 0, art.z, 2.4, 0.5, 0.45, C.cushion, Math.PI / 2));
  }
  for (const x of [gallery.x0 + 3, gallery.x1 - 3]) {
    const z = gallery.z0 + 3.5;
    out.push(cyl(x, 0, z, 3.6, 0.02, "#8c8478"), ...lowTable(x, z));
    out.push(...chair(x - 1.1, z, -Math.PI / 2, C.cushion, 1.25), ...chair(x + 1.1, z, Math.PI / 2, C.cushion, 1.25));
    out.push(...pouffe(x, z + 1.1, C.pot), ...pouffe(x, z - 1.1, C.pot));
  }

  // Kitchen: stools along the potluck counter, a pantry and a round family table.
  for (let i = 0; i < 7; i++) {
    const x = potluck.x0 + 1 + (i * (potluck.x1 - potluck.x0 - 2)) / 6;
    out.push(cyl(x, 0, potluck.z1 + 0.45, 0.36, 0.03, C.charcoal), cyl(x, 0.03, potluck.z1 + 0.45, 0.06, 0.6, C.brass), cyl(x, 0.63, potluck.z1 + 0.45, 0.38, 0.08, C.wood));
  }
  out.push(box(kitchen.x1 - 0.6, 0, kitchen.z0 + 4, 0.9, 2.1, 1.1, C.trim), box(kitchen.x1 - 1.07, 0.9, kitchen.z0 + 4, 0.04, 0.7, 0.04, C.brass));
  const [tx, tz] = [kitchen.x1 - 4.5, kitchen.z1 - 4.5];
  out.push(cyl(tx, 0, tz, 0.3, 0.7, C.brass), cyl(tx, 0.7, tz, 1.6, 0.05, C.wood), cyl(tx, 0.75, tz, 0.3, 0.2, C.pot), ball(tx, 1.1, tz, 0.4, C.leaf));
  for (let i = 0; i < 5; i++) out.push(...pouffe(tx + Math.sin((i * Math.PI * 2) / 5) * 1.25, tz + Math.cos((i * Math.PI * 2) / 5) * 1.25, C.wood));
  return out;
}

/** The string-light lines over the patio: x positions, and the z of the house wall and of the poles. */
export const LIGHT_LINES = { xs: [-20, -12, -4, 4, 12, 20], z0: HOUSE.z0 - 0.3, z1: room("cookout").rect.z0, y: 3 };
/** The dance floor, inside the music corner west of the booth. */
const DANCE_FLOOR: Rect = { x0: 10, z0: room("dance").rect.z0 + 0.5, x1: 18, z1: room("dance").rect.z0 + 5.5 };

function outdoors(): Part[] {
  const out: Part[] = [];
  const grill = obstacles.find((o) => o.kind === "grill")!.rect;
  const booth = obstacles.find((o) => o.kind === "dj-booth")!.rect;

  // Cookout patio: a prep table beside the grill and a picnic table.
  const [px, pz] = [grill.x1 + 1.6, mid(grill)[1]];
  out.push(box(px, 0.85, pz, 1.6, 0.05, 0.7, C.wood), box(px - 0.4, 0.9, pz, 0.45, 0.05, 0.32, C.steel), box(px + 0.35, 0.9, pz, 0.4, 0.03, 0.3, C.cream));
  for (const [dx, dz] of [[-0.7, -0.28], [0.7, -0.28], [-0.7, 0.28], [0.7, 0.28]]) out.push(cyl(px + dx, 0, pz + dz, 0.06, 0.85, C.charcoal));
  const [bx, bz] = [grill.x1 + 6.5, pz - 1];
  out.push(...pill(bx, 0.7, bz, 2.4, 0.8, 0.06, C.wood), cyl(bx - 0.7, 0, bz, 0.12, 0.7, C.charcoal), cyl(bx + 0.7, 0, bz, 0.12, 0.7, C.charcoal));
  for (const side of [-0.7, 0.7]) out.push(...pill(bx, 0.4, bz + side, 2.4, 0.32, 0.05, C.wood), cyl(bx - 0.8, 0, bz + side, 0.08, 0.4, C.charcoal), cyl(bx + 0.8, 0, bz + side, 0.08, 0.4, C.charcoal));

  // Backyard lounge: a low table and pouffes in front of each sofa.
  for (const s of obstacles.filter((o) => o.kind === "sofa")) {
    const [sx, sz] = mid(s.rect);
    out.push(...lowTable(sx, sz + 1.5), ...pouffe(sx - 1, sz + 2.5, C.pot), ...pouffe(sx + 1, sz + 2.5, C.pot));
  }

  // Music corner: a chequered dance floor and two speaker towers facing it.
  for (let x = DANCE_FLOOR.x0; x < DANCE_FLOOR.x1; x++) {
    for (let z = DANCE_FLOOR.z0; z < DANCE_FLOOR.z1; z++) out.push(box(x + 0.5, 0, z + 0.5, 1, 0.02, 1, (x + Math.floor(z)) % 2 ? "#d8d2c6" : "#55524e"));
  }
  for (const z of [booth.z0 - 0.7, booth.z1 + 0.7]) {
    const x = booth.x0 - 0.5;
    out.push(box(x, 0, z, 0.6, 1.4, 0.6, C.charcoal));
    out.push(part("cyl", x - 0.31, 1, z, 0.42, 0.03, 0.42, C.steel, { rz: Math.PI / 2 }), part("cyl", x - 0.31, 0.45, z, 0.24, 0.03, 0.24, C.steel, { rz: Math.PI / 2 }));
  }

  // Pool deck: loungers facing the water, two umbrellas.
  const deckZ = (pool.water.z1 + room("pool").rect.z1) / 2;
  for (const x of [-18, -15, -9, -6]) {
    out.push(...pill(x, 0, deckZ, 1.9, 0.65, 0.28, C.cream, Math.PI / 2), box(x, 0.4, deckZ + 0.62, 0.6, 0.08, 0.7, C.cream, { rx: -0.7 }));
  }
  for (const x of [-16.5, -7.5]) out.push(cyl(x, 0, deckZ, 0.06, 2.3, C.brass), cone(x, 2.1, deckZ, 2.4, 0.5, C.cream));

  // Lawn toss: bags on the grass beside each board (the boards are obstacles).
  for (const board of obstacles.filter((o) => o.kind === "toss-board")) {
    const [cx, cz] = mid(board.rect);
    for (const [dx, dz, color] of [[-0.75, -0.2, "#b5654a"], [-0.8, 0.15, "#b5654a"], [0.75, -0.1, "#4a5a6e"], [0.85, 0.25, "#4a5a6e"]] as const) {
      out.push(box(cx + dx, 0, cz + dz, 0.16, 0.05, 0.16, color, { ry: dx + dz }));
    }
  }

  // Light poles, and planters around the yard.
  for (const x of LIGHT_LINES.xs) out.push(cyl(x, 0, LIGHT_LINES.z1, 0.08, LIGHT_LINES.y + 0.1, C.darkWood));
  for (const [x, z] of [[-23, -19], [23, -19], [-23, -41], [23, -41], [1, -41], [-3, -19], [3, -19], [23, -29]]) out.push(...planter(x, z, 1.1));
  return out;
}

export interface Artwork {
  id: "gathering" | "rhythm";
  x: number;
  y: number;
  z: number;
  ry: number;
  w: number;
  h: number;
}

/** One piece on each long gallery wall, centred between the two signs that share that wall. */
export const ARTWORKS: readonly Artwork[] = (
  [
    ["gathering", "tonk-gallery", "spades-gallery"],
    ["rhythm", "bid-whist-gallery", "kitchen-gallery"],
  ] as const
).map(([id, a, b]) => {
  const [first, second] = [signs.find((s) => s.id === a)!, signs.find((s) => s.id === b)!];
  const inward = Math.sin(first.ry);
  const wallX = inward > 0 ? room("gallery").rect.x0 : room("gallery").rect.x1;
  return { id, x: wallX + inward * (WALL_THICKNESS / 2 + 0.07), y: 1.7, z: (first.z + second.z) / 2, ry: first.ry, w: 2.4, h: 1.8 };
});

let built: Part[] | null = null;

export function structure(): readonly Part[] {
  built ??= [
    ...floors(),
    ...poolBasin(),
    ...wallParts(),
    ...tableSpots.flatMap(tableFurniture),
    ...rooms.filter((r) => r.kind === "lounge").flatMap(lounge),
    ...obstacles.flatMap((o) => tagged(o.id, obstacleParts(o))),
    ...indoors(),
    ...outdoors(),
  ];
  return built;
}

const JULY = ["#c8443f", "#f5f1e6", "#3f62b5"];
const NEWYEAR = ["#d9b451", "#c9ccd1", "#2a2a2e"];

/** A line of small pennants, tip down, from a to b. */
function bunting(ax: number, az: number, bx: number, bz: number, colors: string[]): Part[] {
  const count = Math.round(Math.hypot(bx - ax, bz - az) / 0.55);
  const ry = ax === bx ? Math.PI / 2 : 0;
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return part("cone", ax + (bx - ax) * t, 3.03, az + (bz - az) * t, 0.28, 0.34, 0.03, colors[i % colors.length], { ry, rz: Math.PI });
  });
}

/** The clock board the New Year countdown is drawn on (see World.tsx). */
export const CLOCK = { x: 0, y: 2.75, z: room("yard-lounge").rect.z0 + 0.2, w: 2.6, h: 1.1 };

/** The celebration dressing: same layout, different party. */
export function decor(theme: Theme): Part[] {
  const out: Part[] = [];
  const colors = theme === "july4" ? JULY : NEWYEAR;
  const bulbs = theme === "july4" ? JULY : ["#ffd98a"];

  // String lights sag from the house to the poles.
  for (const x of LIGHT_LINES.xs) {
    for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10;
      out.push(ball(x, LIGHT_LINES.y - 2 * t * (1 - t), LIGHT_LINES.z0 + (LIGHT_LINES.z1 - LIGHT_LINES.z0) * t, 0.14, bulbs[i % bulbs.length], { mat: "glow" }));
    }
  }
  // A band of the theme's colours under every table top.
  tableSpots.forEach((spot, i) => out.push(cyl(spot.x, TABLE_HEIGHT - 0.12, spot.z, TABLE_RADIUS * 2 + 0.03, 0.06, colors[(i * 2) % 3])));

  const gallery = room("gallery").rect;
  if (theme === "july4") {
    out.push(...bunting(HOUSE.x0, HOUSE.z0 - 0.3, HOUSE.x1, HOUSE.z0 - 0.3, JULY));
    const foyer = room("foyer").rect;
    out.push(...bunting(foyer.x0, foyer.z0 + 0.3, foyer.x1, foyer.z0 + 0.3, JULY));
    for (const r of rooms.filter((r) => r.kind === "lounge" || r.kind === "kitchen")) {
      const z = (r.rect.z0 + r.rect.z1) / 2;
      out.push(...bunting(r.rect.x0 + 0.5, z, r.rect.x1 - 0.5, z, JULY));
    }
    // Star lanterns down the gallery and on top of the yard light poles.
    for (let i = 0; i < 5; i++) {
      const z = gallery.z0 + 3 + i * 5;
      out.push(box(0, 2.9, z, 0.02, WALL_HEIGHT - 2.9, 0.02, C.charcoal), part("star", 0, 2.65, z, 0.55, 0.55, 0.55, JULY[i % 3], { mat: "glow" }));
    }
    LIGHT_LINES.xs.forEach((x, i) => out.push(part("star", x, LIGHT_LINES.y + 0.4, LIGHT_LINES.z1, 0.6, 0.6, 0.6, JULY[i % 3], { mat: "glow" })));
    return out;
  }

  // New Year: streamers from the rafters, balloon clusters, warm lights down the gallery, the countdown clock.
  const random = rng(2027);
  for (let x = HOUSE.x0 + 2; x < HOUSE.x1; x += 4) {
    for (let z = HOUSE.z0 + 2; z < HOUSE.z1; z += 4) {
      for (let i = 0; i < 2; i++) {
        const length = 0.45 + random() * 0.45;
        out.push(box(x + (random() - 0.5) * 1.2, WALL_HEIGHT - length, z, 0.06, length, 0.01, NEWYEAR[Math.floor(random() * 3)], { ry: random() * Math.PI }));
      }
    }
  }
  const corners: [number, number][] = [[gallery.x0 + 0.8, -2.5], [gallery.x1 - 0.8, -2.5], [-7.2, 12], [7.2, 12], [9, HOUSE.z0 - 1], [23, HOUSE.z0 - 1]];
  for (const r of rooms.filter((r) => r.kind === "lounge")) {
    const outerX = r.rect.x0 === HOUSE.x0 ? r.rect.x0 + 1 : r.rect.x1 - 1;
    corners.push([outerX, r.rect.z0 + 1], [outerX, r.rect.z1 - 1]);
  }
  for (const [x, z] of corners) {
    out.push(cyl(x, 0, z, 0.2, 0.06, C.charcoal));
    for (let i = 0; i < 3; i++) {
      const [bx, bz, by] = [x + (random() - 0.5) * 0.5, z + (random() - 0.5) * 0.5, 1.5 + i * 0.3];
      out.push(part("ball", bx, by, bz, 0.34, 0.4, 0.34, NEWYEAR[i]), box((x + bx) / 2, 0.06, (z + bz) / 2, 0.01, by - 0.26, 0.01, C.trim));
    }
  }
  for (const x of [gallery.x0 + 0.4, gallery.x1 - 0.4]) {
    for (let z = gallery.z0 + 1; z < gallery.z1; z += 1) out.push(ball(x, 3.05, z, 0.12, "#ffd98a", { mat: "glow" }));
  }
  for (const side of [-1, 1]) out.push(cyl(CLOCK.x + side * (CLOCK.w / 2 + 0.05), 0, CLOCK.z, 0.1, CLOCK.y + CLOCK.h / 2, C.brass));
  out.push(box(CLOCK.x, CLOCK.y - CLOCK.h / 2 - 0.05, CLOCK.z - 0.04, CLOCK.w + 0.1, CLOCK.h + 0.1, 0.06, C.charcoal));
  return out;
}

export interface Label {
  key: string;
  text: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  /** Height of the board in metres. */
  height: number;
}

/** Every text sign: the layout's wall signs (the three lounge names drawn large) and two faces per table marker. */
export function labels(): Label[] {
  return [
    ...signs.map((s) => ({ key: s.id, text: s.label, x: s.x, y: s.y, z: s.z, ry: s.ry, height: s.id.endsWith("-inside") ? 0.9 : 0.45 })),
    ...tableSpots.flatMap((spot) =>
      [1, -1].map((side) => ({
        key: `${spot.id}-${side}`,
        text: spot.label,
        x: spot.x - MARKER + side * 0.03,
        y: 2.05,
        z: spot.z - MARKER,
        ry: (side * Math.PI) / 2,
        height: 0.3,
      })),
    ),
  ];
}
