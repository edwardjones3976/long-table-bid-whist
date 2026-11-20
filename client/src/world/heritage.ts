/**
 * Architectural & cultural upgrades for the mansion, kept separate from plan.ts
 * so work on avatars/tables merges cleanly:
 *   - Five-Element Gallery Centerpiece ("The Heart of the House")
 *   - Crafted card-table rims, brass inlays & coasters
 *   - Open-sky architectural wall crown framing (zero sky obstruction)
 *   - Bid Whist Lounge stone & walnut hearth
 *   - "Golden Time of Day" celebration decor
 *   - 12-piece Heritage Gallery layout
 */
import type { ArtworkId } from "./art";
import { WALL_THICKNESS, type Obstacle, type Rect, type Room, type TableSpot } from "./layout";
import type { Part } from "./plan";
import type { PartTex } from "./textures";

export interface HeritageArtwork {
  id: ArtworkId;
  x: number;
  y: number;
  z: number;
  ry: number;
  w: number;
  h: number;
  bench?: boolean;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const SOUTH = 0;
const NORTH = Math.PI;
const WALL_INSET = WALL_THICKNESS / 2 + 0.07;

export const HERITAGE_ARTWORKS: readonly HeritageArtwork[] = [
  // Central Gallery — West wall (facing east), clear of doors (z=-9, 5, 14), signs (z=-6, 8, 16.5) & mirror (z=11.6)
  { id: "douglass", x: -8 + WALL_INSET, y: 1.75, z: 1.6, ry: EAST, w: 1.8, h: 1.55, bench: true },
  { id: "tubman", x: -8 + WALL_INSET, y: 1.75, z: -1.6, ry: EAST, w: 1.8, h: 1.55, bench: true },
  { id: "selma-dawn", x: -8 + WALL_INSET, y: 1.75, z: -13.8, ry: EAST, w: 2.2, h: 1.65 },

  // Central Gallery — East wall (facing west), clear of doors (z=-9, 5, 14) & signs (z=-6, 8, 16.5)
  { id: "truth", x: 8 - WALL_INSET, y: 1.75, z: 1.6, ry: WEST, w: 1.8, h: 1.55, bench: true },
  { id: "dubois", x: 8 - WALL_INSET, y: 1.75, z: -1.6, ry: WEST, w: 1.8, h: 1.55, bench: true },
  { id: "reflecting-pool", x: 8 - WALL_INSET, y: 1.75, z: -13.8, ry: WEST, w: 2.2, h: 1.65 },

  // Bid Whist Lounge
  { id: "villa-lewaro", x: 11.2, y: 1.75, z: 18 - WALL_INSET, ry: NORTH, w: 2.2, h: 1.65 },
  { id: "gathering", x: 11.8, y: 1.75, z: WALL_INSET, ry: SOUTH, w: 2.0, h: 1.5 },
  { id: "biddy-mason", x: 20.2, y: 1.75, z: WALL_INSET, ry: SOUTH, w: 1.8, h: 1.55 },

  // Tonk Lounge
  { id: "harlem-dusk", x: -11.2, y: 1.75, z: 18 - WALL_INSET, ry: NORTH, w: 2.2, h: 1.65 },
  { id: "rhythm", x: -11.8, y: 1.75, z: WALL_INSET, ry: SOUTH, w: 2.0, h: 1.5 },

  // Spades Lounge
  { id: "evening-stop", x: -11.8, y: 1.75, z: -WALL_INSET, ry: NORTH, w: 2.0, h: 1.5 },
];

type Palette = {
  wood: string;
  darkWood: string;
  stone: string;
  brass: string;
  charcoal: string;
  lamp: string;
};

const box = (x: number, y0: number, z: number, sx: number, h: number, sz: number, color: string, tex?: PartTex, extra?: Partial<Part>): Part => ({
  shape: "box",
  mat: "lit",
  x,
  y: y0 + h / 2,
  z,
  sx,
  sy: h,
  sz,
  rx: 0,
  ry: 0,
  rz: 0,
  color,
  ...(tex ? { tex } : {}),
  ...extra,
});

const cyl = (x: number, y0: number, z: number, d: number, h: number, color: string, tex?: PartTex, extra?: Partial<Part>): Part => ({
  shape: "cyl",
  mat: "lit",
  x,
  y: y0 + h / 2,
  z,
  sx: d,
  sy: h,
  sz: d,
  rx: 0,
  ry: 0,
  rz: 0,
  color,
  ...(tex ? { tex } : {}),
  ...extra,
});

const ball = (x: number, y: number, z: number, d: number, color: string, extra?: Partial<Part>): Part => ({
  shape: "ball",
  mat: "lit",
  x,
  y,
  z,
  sx: d,
  sy: d,
  sz: d,
  rx: 0,
  ry: 0,
  rz: 0,
  color,
  ...extra,
});

/**
 * Five-Element Gallery Centerpiece ("The Heart of the House"):
 *   Earth (travertine plinth), Wood (curved walnut bench ring),
 *   Water (dark-stone reflection basin), Metal & Fire (brushed-brass lantern brazier).
 * Fits strictly inside `o.rect` (-1.4..1.4 x -5.4..-2.6) and reaches height 1.15 m.
 */
export function centerpieceParts(o: Obstacle, C: Palette): Part[] {
  const cx = (o.rect.x0 + o.rect.x1) / 2;
  const cz = (o.rect.z0 + o.rect.z1) / 2;
  const w = o.rect.x1 - o.rect.x0 - 0.02;
  const d = o.rect.z1 - o.rect.z0 - 0.02;
  return [
    // Earth plinth filling the collider footprint cleanly so no corner can be walked into
    box(cx, 0, cz, w, 0.34, d, C.stone, "stone"),
    // Wood curved banquette ring
    cyl(cx, 0.34, cz, 2.55, 0.14, C.wood, "wood"),
    // Earth stone coping & brass trim
    cyl(cx, 0.48, cz, 1.88, 0.18, C.stone, "stone"),
    cyl(cx, 0.66, cz, 1.9, 0.03, C.brass),
    // Water reflection pool basin (mat: "lit" so pool remains the single "water" surface in ground.ts)
    cyl(cx, 0.69, cz, 1.54, 0.03, "#2b5b70"),
    // Metal pedestal + Fire lantern core (top = 1.15)
    cyl(cx, 0.72, cz, 0.36, 0.16, C.brass),
    cyl(cx, 0.88, cz, 0.44, 0.04, C.darkWood, "wood"),
    ball(cx, 1.02, cz, 0.26, C.lamp, { mat: "glow" }),
  ];
}

/** Crafted details added inside TABLE_RADIUS and below/at TABLE_HEIGHT. */
export function craftedTableAccents(spot: TableSpot, tableHeight: number, C: Palette): Part[] {
  const { x, z } = spot;
  const out: Part[] = [
    // Pedestal brass collar
    cyl(x, 0.05, z, 0.42, 0.04, C.brass),
    // Lower chamfered wood apron & brass inlay rim flush with top felt edge
    cyl(x, tableHeight - 0.085, z, 1.22, 0.025, C.darkWood, "wood"),
    cyl(x, tableHeight - 0.015, z, 1.24, 0.005, C.brass),
  ];
  // Four inset brass coasters at the 45-degree corners (away from seat positions)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    out.push(cyl(x + Math.cos(a) * 0.56, tableHeight - 0.013, z + Math.sin(a) * 0.56, 0.075, 0.004, C.brass));
  }
  return out;
}

/** Warm walnut & brass wall crown molding keeping the sky completely open. */
export function openSkyFraming(house: Rect, wallHeight: number, C: Palette): Part[] {
  const y0 = wallHeight - 0.12;
  const spanX = house.x1 - house.x0;
  const spanZ = house.z1 - house.z0;
  const out: Part[] = [
    box(0, y0, house.z0 + 0.13, spanX, 0.1, 0.08, C.darkWood, "wood"),
    box(0, y0, house.z1 - 0.13, spanX, 0.1, 0.08, C.darkWood, "wood"),
    box(house.x0 + 0.13, y0, 0, 0.08, 0.1, spanZ, C.darkWood, "wood"),
    box(house.x1 - 0.13, y0, 0, 0.08, 0.1, spanZ, C.darkWood, "wood"),
  ];
  // Gallery perimeter crown rails
  out.push(
    box(-7.87, y0, 0, 0.06, 0.09, spanZ, C.wood, "wood"),
    box(7.87, y0, 0, 0.06, 0.09, spanZ, C.wood, "wood"),
  );
  // Subtle brass sconce collars along the open gallery walls above standing head height
  for (const z of [-15, -3, 3, 12]) {
    out.push(box(-7.84, 2.25, z, 0.08, 0.18, 0.14, C.brass), box(7.84, 2.25, z, 0.08, 0.18, 0.14, C.brass));
    out.push(ball(-7.78, 2.5, z, 0.16, C.lamp, { mat: "glow" }), ball(7.78, 2.5, z, 0.16, C.lamp, { mat: "glow" }));
  }
  return out;
}

/** Architectural walnut-and-stone hearth flush against the open east wall of Bid Whist Lounge. */
export function bidWhistHearth(loungeRect: Rect, C: Palette): Part[] {
  const xWall = loungeRect.x1 - 0.1;
  const zCenter = 14.5;
  const cx = xWall - 0.14;
  return [
    // Raised hearth apron (< 0.30 m deep against wall so non-standable and blocked by wall radius)
    box(cx, 0, zCenter, 0.28, 0.36, 2.2, C.stone, "stone"),
    // Firebox rear & side pilasters
    box(xWall - 0.06, 0.36, zCenter, 0.12, 1.0, 1.75, C.charcoal),
    box(cx, 0.36, zCenter - 0.85, 0.26, 1.0, 0.28, C.darkWood, "wood"),
    box(cx, 0.36, zCenter + 0.85, 0.26, 1.0, 0.28, C.darkWood, "wood"),
    // Glowing ember grate
    box(xWall - 0.16, 0.38, zCenter, 0.1, 0.14, 0.9, "#d9722c", { mat: "glow" }),
    // Walnut mantle shelf & brass gallery rail
    box(cx - 0.005, 1.36, zCenter, 0.29, 0.12, 2.3, C.wood, "wood"),
    box(cx - 0.11, 1.48, zCenter, 0.04, 0.04, 2.0, C.brass),
  ];
}

const GOLDEN_COLORS = ["#d99b3c", "#b85c3c", "#4d6b58"];

/** Celebration dressing for "Golden Time of Day": warm honey-amber patio bulbs, brass pole lanterns & fairy lights. */
export function goldenDecor(
  lightLines: { xs: number[]; z0: number; z1: number; y: number },
  tableSpots: readonly TableSpot[],
  gallery: Rect,
  rooms: readonly Room[],
  wallHeight: number,
  C: Palette,
): Part[] {
  const out: Part[] = [];
  // Same 60 patio glow balls as the other themes so shared-part invariants hold
  for (const x of lightLines.xs) {
    for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10;
      out.push(
        ball(
          x,
          lightLines.y - 2 * t * (1 - t),
          lightLines.z0 + (lightLines.z1 - lightLines.z0) * t,
          0.14,
          "#ffca78",
          { mat: "glow" },
        ),
      );
    }
  }
  // Table bands in warm golden-hour tones
  tableSpots.forEach((spot, i) => out.push(cyl(spot.x, 0.74 - 0.12, spot.z, 0.65 * 2 + 0.03, 0.06, GOLDEN_COLORS[(i * 2) % 3])));
  // Warm brass lantern toppers on the 6 yard poles (boxes so z < -18 glow-ball count stays exactly 60)
  for (const x of lightLines.xs) {
    out.push(
      box(x, lightLines.y + 0.1, lightLines.z1, 0.28, 0.34, 0.28, "#ffcf7a", { mat: "glow" }),
      box(x, lightLines.y + 0.44, lightLines.z1, 0.34, 0.06, 0.34, C.brass),
    );
  }
  // Warm amber fairy bulbs tucked along the open gallery and lounge beam eaves (above 2.9 m)
  for (const x of [gallery.x0 + 0.35, gallery.x1 - 0.35]) {
    for (let z = gallery.z0 + 1.5; z < gallery.z1; z += 1.5) out.push(ball(x, wallHeight - 0.18, z, 0.11, "#ffd284", { mat: "glow" }));
  }
  for (const r of rooms.filter((rm) => rm.kind === "lounge" || rm.kind === "kitchen")) {
    for (let x = r.rect.x0 + 2; x < r.rect.x1; x += 2) {
      out.push(ball(x, wallHeight - 0.2, r.rect.z0 + 0.45, 0.1, "#ffd284", { mat: "glow" }));
    }
  }
  return out;
}
