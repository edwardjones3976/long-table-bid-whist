/**
 * Hair: the 24 styles, each with a bare version and a tucked one that sits under any head covering or hat.
 *
 *   hair(look, m, "near", tucked)   pieces for the head joint, in head space: chin at y = 0, crown at m.head, face toward -Z;
 *                                   `tucked` is true under a head covering, or a hat's lower edge (Dressing.hatEdge)
 *   scalp(m)                         points on the head's smooth surface, for anything worn on the head
 *   layer(head, cols, rows, edge, lift)   a sheet over the scalp from the crown down to an edge
 *   HAIRLINE(f)                      the natural hairline: t down from the crown, by f round from the face
 *
 * Most styles are a layer over the scalp, lifted off the head by the style's own thickness, with texture in
 * the vertex colours and the shape of the lift: clumped coils, afros in three sizes, twists, ripples for
 * waves. Their own forms go on top: locs and braids as single ropes, cornrows as raised rows following the
 * head, knots, a crest, a block, a bun, a tail, and a fall of long hair. Every hairline stays above the ears
 * and long hair falls behind them, so ears, hearing aids and processors stay clear; hair hanging below the
 * head keeps behind the upper back of every build.
 *
 * The tucked version of every style is one close layer under the natural hairline (TUCKED_LIFT off the
 * head), so a covering or hat only has to clear that one shape. Under a hat the long styles (LONG) keep what
 * hangs below its edge, so long locs, braids and a ponytail stay the wearer's own, and an afro (PUFFS) puffs out
 * below its brim, so from the front its outline stays wider than the head there. Beyond 8 m each style keeps
 * its outline in a few triangles: ropes, rows and knots become a fall, colours or a few cones.
 */
import { BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { hexOf, SKIN_TONES, type Look } from "../../../shared/avatar";
import type { Detail } from "./figure";
import type { Measurements } from "./measure";
import { add, dressing, lathe, mix, piece, shade, tube, type Dressing, type Paint } from "./shapes";

const TAU = Math.PI * 2;
/** How far a thick layer's closing edge stands off the head. */
const RIM = 0.003;

/** Straight between [x, y] points (x rising), flat beyond both ends. */
export function curve(points: readonly (readonly [number, number])[]): (x: number) => number {
  return (x) => {
    if (x <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [[x0, y0], [x1, y1]] = [points[i - 1], points[i]];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return points[points.length - 1][1];
  };
}

/** Radians round the head from the face (0) to the back (pi), either side, for a lathe angle phi. */
export const fromFace = (phi: number): number => Math.abs(Math.PI - (((phi % TAU) + TAU) % TAU));

/** The natural hairline as t (radians down from the crown) by f: on the forehead, above the ears and what sits behind them, low at the nape. */
export const HAIRLINE = curve([
  [0, 1.13],
  [0.25 * Math.PI, 1.2],
  [0.42 * Math.PI, 1.33],
  [0.62 * Math.PI, 1.36],
  [0.72 * Math.PI, 1.6],
  [0.85 * Math.PI, 1.95],
  [Math.PI, 2.05],
]);
const naturalEdge = (phi: number) => HAIRLINE(fromFace(phi));

/** How far tucked hair stands off the head. Beyond 8 m the head's facets are coarser, so everything stands further off. */
export const TUCKED_LIFT = { near: 0.004, far: 0.01 } as const;

export interface Scalp {
  /** The point toward the unit direction (x, y, z) from the head's middle, lifted out along the surface. */
  toward(x: number, y: number, z: number, lift?: number): Vector3;
  /** The point at lathe angle phi (0 at the back, turning toward +X, so the face is at pi) and t down from the crown (0) to the chin (pi). */
  at(phi: number, t: number, lift?: number): Vector3;
  /** phi and t of a head-space point: the reverse of at, lift ignored. */
  angles(p: Vector3): [number, number];
}

/**
 * The head's smooth surface, an ellipsoid a little narrower toward the chin. The head's faceted lathe
 * (face.ts headProfile) has its corners on it and its faces inside it, so a part lifted off it by more than
 * the sag of its own facets never cuts into the head.
 */
export function scalp(m: Measurements): Scalp {
  const [half, w, d] = [m.head / 2, m.headWidth, m.headDepth];
  const toward = (x: number, y: number, z: number, lift = 0) => {
    const narrow = y < 0 ? 1 - 0.22 * y * y : 1;
    const point = new Vector3(w * x * narrow, half * (1 + y), d * z * narrow);
    return lift ? point.addScaledVector(new Vector3(x / w, y / half, z / d).normalize(), lift) : point;
  };
  return {
    toward,
    at: (phi, t, lift = 0) => toward(Math.sin(t) * Math.sin(phi), Math.cos(t), Math.sin(t) * Math.cos(phi), lift),
    angles: (p) => [(Math.atan2(p.x / w, p.z / d) + TAU) % TAU, Math.acos(Math.min(1, Math.max(-1, p.y / half - 1)))],
  };
}

/**
 * A sheet of (cols + 1) x (rows + 1) points, point(i, j) with i across and j down; it faces outward when i
 * turns the way the head's lathe does. With `pole`, row 0 is one point and its empty triangles are left out.
 */
export function grid(cols: number, rows: number, point: (i: number, j: number) => Vector3, pole = false): BufferGeometry {
  const positions: number[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) positions.push(...point(i, j).toArray());
  const v = (i: number, j: number) => j * (cols + 1) + i;
  const index: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!(pole && j === 0)) index.push(v(i, j), v(i, j + 1), v(i + 1, j));
      index.push(v(i + 1, j), v(i, j + 1), v(i + 1, j + 1));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The column and row of triangle `n` of a grid with a pole, for paint by cell. */
export function cell(n: number, cols: number): [number, number] {
  if (n < cols) return [n, 0];
  const k = n - cols;
  return [Math.floor((k % (2 * cols)) / 2), 1 + Math.floor(k / (2 * cols))];
}

/**
 * A layer over the scalp from the crown down to edge(phi), in `rows` steps of t, lifted off the head by
 * lift(phi, t, u) where u runs 0 at the crown to 1 at the edge. `rim` adds a last row that turns back to
 * that height off the head at the edge (or `tuck` higher, so its underside curls up and in), so a thick layer
 * has a closed edge.
 */
export function layer(head: Scalp, cols: number, rows: number, edge: (phi: number) => number, lift: (phi: number, t: number, u: number) => number, rim = 0, tuck = 0): BufferGeometry {
  return grid(
    cols,
    rows + (rim ? 1 : 0),
    (i, j) => {
      if (j === 0) return head.at(0, 0, lift(0, 0, 0));
      const phi = (TAU * i) / cols;
      const bottom = edge(phi);
      if (j > rows) return head.at(phi, bottom - tuck, rim);
      const t = (bottom * j) / rows;
      return head.at(phi, t, lift(phi, t, j / rows));
    },
    true,
  );
}

interface Kit {
  m: Measurements;
  head: Scalp;
  near: boolean;
  /** Columns round the head: the head's own segments, so close layers follow its facets. */
  cols: number;
  /** The least lift anything on the scalp takes at this detail. */
  min: number;
  hue: string;
  /** For lines and parts. */
  deep: string;
  /** For gentle texture: a little deeper, and a touch lighter on the darkest hair, so it shows on every colour. */
  mid: string;
  light: string;
  skin: string;
  /** How far back (+Z) hair hanging below the head must stay: clear of the upper back of this build in a thick top. */
  back: number;
  /** Under a hat, its lower edge (t by f): only what hangs below it is drawn, over the tucked layer. */
  under?: (f: number) => number;
  /** Under a hat, how far below that edge its brim reaches (metres, by f): an afro puffs out only below it. */
  brim: (f: number) => number;
  shell: (...pieces: BufferGeometry[]) => void;
  detail: (...pieces: BufferGeometry[]) => void;
}

/** One soft tone a little toward `b`: a mass reads as a soft shape, never as triangles of two colours. */
const speckle = (a: string, b: string, share = 0.45): Paint => {
  const tone = mix(a, b, share * 0.5);
  return () => tone;
};
/** Paint by where a triangle sits on the scalp. */
const byAngles = (k: Kit, paint: (phi: number, t: number, at: Vector3) => string): Paint => (at) => paint(...k.head.angles(at), at);
const lifted = (k: Kit, lift: number) => Math.max(lift, k.min);

/** A rope through the points, kept as one piece. */
const rope = (points: readonly Vector3[], radius: number, along: number, around: number, taper?: (t: number) => number) =>
  tube(points.map((p) => [p.x, p.y, p.z] as const), radius, along, around, taper);

/** A rope's colours: segments that alternate and shift round it, like a plait. */
const plait = (a: string, b: string, around: number): Paint => (_, n) => ((Math.floor(n / 2) % around) + Math.floor(n / (2 * around))) % 2 ? b : a;

/** From a root on the scalp down its meridian to t1, then hanging to `bottom` (head-space y), behind the upper back. */
function hanging(k: Kit, phi: number, t0: number, t1: number, lift: number, bottom: number): Vector3[] {
  const on = [t0, (t0 + t1) / 2, t1].map((t) => k.head.at(phi, t, lift));
  const last = on[2];
  return [...on, new Vector3(last.x * 0.97, -0.04, Math.max(last.z, k.back * 0.95)), new Vector3(last.x * 1.05, bottom, Math.max(last.z, k.back))];
}

/**
 * Long hair falling behind the ears: a slab round the back, from f0 on one side to f0 on the other, from
 * under the crown layer down to `bottom` (head-space y), `thick` deep, closed underneath.
 */
function fall(k: Kit, f0: number, bottom: number, lift: number, thick: number): BufferGeometry {
  const span = Math.PI - f0;
  const cols = k.near ? 8 : 4;
  return grid(cols, k.near ? 6 : 4, (i, j) => {
    const phi = -span + (2 * span * i) / cols;
    const equator = k.head.at(phi, Math.PI / 2, lift);
    const out = new Vector3(equator.x, 0, equator.z).normalize();
    // Gathered a little narrower toward the ends; thick hair stands further off the back, so its inside stays clear too.
    const low = new Vector3(equator.x * 0.85, bottom, Math.max(equator.z, k.back + thick - 0.02));
    const outer = k.near
      ? [k.head.at(phi, 1.3, k.min), equator, new Vector3(equator.x, 0, equator.z), new Vector3(equator.x, -0.04, Math.max(equator.z, k.back * 0.95)), low]
      : [k.head.at(phi, 1.3, k.min), equator, low];
    const inner = [low.clone().addScaledVector(out, -thick).setY(bottom + 0.004), equator.clone().addScaledVector(out, -thick)];
    return [...outer, ...inner][j];
  });
}

/** A fine line laid on the hair or scalp along points given as directions from the head's middle, lifted by lift(point). */
function line(k: Kit, directions: readonly Vector3[], lift: (on: Vector3) => number, radius: number, colour: string): BufferGeometry {
  const points = directions.map((u) => {
    const on = k.head.toward(u.x, u.y, u.z);
    return k.head.toward(u.x, u.y, u.z, lift(on));
  });
  return piece(rope(points, radius, (points.length - 1) * 2, 3), colour);
}

/**
 * Directions from the front of the head over the top to the back, at sideways angle `side` (radians, +X to
 * the figure's right): rows like this run straight back, as cornrows and parts do. psi is 0 on top,
 * positive toward the face.
 */
const backward = (side: number, psis: readonly number[]): Vector3[] =>
  psis.map((psi) => new Vector3(Math.sin(side), Math.cos(side) * Math.cos(psi), -Math.cos(side) * Math.sin(psi)));

const spread = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));

/** A shape on the scalp at (phi, t), its +Y along the head's normal there, sunk `sink` into the surface. */
function onScalp(k: Kit, phi: number, t: number, sink: number, scale: readonly [number, number, number] = [1, 1, 1]): Matrix4 {
  const base = k.head.at(phi, t);
  const normal = k.head.at(phi, t, 1).sub(base).normalize();
  return new Matrix4().compose(base.addScaledVector(normal, -sink), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal), new Vector3(...scale));
}

/** 0 over the forehead, rising to 1 at the sides and back: where a fade shows. */
const sides = (phi: number) => Math.min(1, Math.max(0, (fromFace(phi) - 0.25 * Math.PI) / (0.2 * Math.PI)));

/** Full thickness over the top, easing off toward the edge to `rest` of it there. */
const fullness = (u: number, from: number, rest: number) => (u < from ? 1 : 1 - (1 - rest) * ((u - from) / (1 - from)) ** 2);

/** Round: fuller at the sides than on top, as coily hair grows out, and full almost to the hairline. */
const round = (size: number, t: number, u: number) => size * (1 + 0.15 * Math.sin(t)) * fullness(u, 0.6, 0.6);
/** How far up a round style's underside curls back to the head. */
const CURL = 0.3;

/** Over an afro (PUFFS) a hat sits up on the hair, its lower edge (t by f) no lower than this, so the afro has room to show below its brim above the ears. */
export const PERCH = (f: number): number => 0.95 + 0.27 * Math.max(0, (2 * f) / Math.PI - 1);

/**
 * Under a hat, an afro pressed close beneath it, then puffing out its full size just below the hat's brim (k.brim), so
 * from the front it shows below the brim, wider than the head: down to just past the hairline at the sides (still
 * above the ears) and to the nape behind them, in rounded, uneven bumps. Nothing puffs over the forehead.
 */
function puff(k: Kit, size: number): BufferGeometry {
  const cols = k.near ? 16 : k.cols;
  const half = k.m.head / 2;
  // Down each meridian: where a row sits (0 the hat's edge, 1 just below the brim, 2 halfway on, 3 the bottom) and its
  // share of the size out, as full at its widest as a bare afro's sides (round).
  const rows = k.near ? [[0, 0], [1, 0], [1, 0.9], [2, 1.15], [3, 1], [3, 0]] : [[0, 0], [1, 0], [3, 1.15], [3, 0]];
  const geometry = grid(cols, rows.length - 1, (i, j) => {
    const phi = (TAU * i) / cols;
    const f = fromFace(phi);
    const top = k.under!(f);
    const bottom = Math.max(top, naturalEdge(phi) + 0.06 * sides(phi));
    // Where the head is 4 mm below the brim's lowest point: the puff's top, between the hat's edge and its bottom.
    const clear = Math.acos(Math.max(-1, Math.min(1, Math.cos(top) - (k.brim(f) + 0.004) / half)));
    const rim = Math.min(bottom, Math.max(top, clear));
    const [at, share] = rows[j];
    const t = [top, rim, (rim + bottom) / 2, bottom][at];
    const out = size * sides(phi) * share * (1 + 0.08 * Math.sin(4 * phi + 7 * t));
    const on = k.head.at(phi, t, j === rows.length - 1 && bottom > top ? RIM : k.min);
    return on.add(new Vector3(on.x, 0, on.z).normalize().multiplyScalar(out));
  });
  return piece(geometry, plait(k.hue, mix(k.hue, k.mid, 0.5), cols));
}

function afro(size: number) {
  return (k: Kit) => {
    if (k.under) return k.shell(puff(k, size));
    const lift = (phi: number, t: number, u: number) => lifted(k, round(size, t, u) * (1 + 0.08 * Math.sin(4 * phi + 7 * t)));
    k.shell(piece(layer(k.head, k.near ? 16 : k.cols, k.near ? 6 : 2, naturalEdge, lift, RIM, CURL), speckle(k.hue, k.mid, 0.4)));
  };
}

/** A close layer under the natural hairline: buzz cuts, bases under ropes and rows, tucked hair. */
const close = (k: Kit, paint: Paint, lift = k.min, rows = k.near ? 4 : 2) => piece(layer(k.head, k.cols, rows, naturalEdge, () => lift), paint);
/** Sections painted onto a close layer: parts between locs, braids or knots. */
const sections = (k: Kit, across: number, down: number, a: string, b: string): Paint =>
  byAngles(k, (phi, t) => ((Math.floor((phi * across) / TAU) + Math.floor(t * down)) % 2 ? b : a));
/** A sleek layer over the crown for styles pulled back or falling long. */
const sleek = (k: Kit, paint: Paint, edge = naturalEdge) => piece(layer(k.head, k.cols, k.near ? 5 : 2, edge, () => lifted(k, 0.008)), paint);
/** Long hair streaked along its fall. */
const streaks = (k: Kit): Paint => (_, n) => (Math.floor(n / 2) % 3 === 1 ? k.mid : k.hue);
/** Where a rope hanging from (phi, t) starts: at its root, or just below a hat's edge. */
const below = (k: Kit, phi: number, t: number) => (k.under ? Math.max(t, k.under(fromFace(phi)) + 0.08) : t);
/** Whether a point on the head shows: always bare, and under a hat only below its edge. */
const shows = (k: Kit, p: Vector3) => {
  if (!k.under) return true;
  const [phi, t] = k.head.angles(p);
  return t > k.under(fromFace(phi)) + 0.06;
};

function locs(long: boolean) {
  return (k: Kit) => {
    const base = sections(k, 12, 4, k.hue, k.deep);
    if (!k.near) {
      if (!k.under) k.shell(close(k, base, lifted(k, 0.02)));
      // Banded in rope-wide stripes, deep and light, so far off locs still read as ropes, not as long straight hair.
      if (long) k.shell(piece(fall(k, 0.66 * Math.PI, -0.26, 0.02, 0.03), (_, n) => (Math.floor(n / 2) % 2 ? k.deep : k.hue)));
      return;
    }
    if (!k.under) k.shell(close(k, base, 0.005));
    if (long) {
      // Behind the ears, from near the crown down the back of the head and over the back.
      const n = 10;
      for (let i = 0; i < n; i++) {
        const phi = -0.34 * Math.PI + (0.68 * Math.PI * (i + 0.5)) / n;
        const points = hanging(k, phi, below(k, phi, i % 2 ? 0.7 : 0.35), i % 2 ? 1.8 : 1.9, i % 2 ? 0.015 : 0.009, -0.26 + (i % 3) * 0.02);
        k.shell(piece(rope(points, 0.011, 5, 3, (s) => 1 - 0.25 * s), i % 2 ? k.hue : k.deep));
      }
      return;
    }
    // Short locs fall from two rings over the head: forward to the brows, down the sides to above the ears, down the back.
    // Under a hat the ones down the back peek out below its edge, pressed down by it.
    const roots = [...[0, 1, 2, 3].map((i) => [(i + 0.5) * (TAU / 4), 0.3] as const), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * (TAU / 8), 0.75] as const)];
    roots.forEach(([phi, root], i) => {
      const f = fromFace(phi);
      const t0 = below(k, phi, root);
      const end = Math.max(Math.min(root + 0.8, f < 0.3 * Math.PI ? 1.27 : f < 0.66 * Math.PI ? 1.3 : 2.2), k.under && f >= 0.66 * Math.PI ? t0 + 0.25 : 0);
      if (t0 > end - 0.1) return;
      const points = [t0, (t0 + end) / 2, end].map((t, j) => k.head.at(phi, t, [0.006, 0.02, 0.016][j]));
      k.shell(piece(rope(points, 0.0085, 3, 3, (s) => 1 - 0.3 * s), i % 2 ? k.hue : k.deep));
    });
  };
}

const STYLES: Record<Exclude<Look["hair"], "bald">, (k: Kit) => void> = {
  coils: (k) => {
    const lift = (phi: number, t: number) => lifted(k, 0.012 + 0.004 * Math.sin(5 * phi) * Math.sin(9 * t));
    k.shell(piece(layer(k.head, k.cols, k.near ? 5 : 2, naturalEdge, lift, RIM), speckle(k.hue, k.mid)));
  },
  "afro-s": afro(0.03),
  "afro-m": afro(0.055),
  "afro-l": afro(0.085),
  "twist-out": (k) => {
    // Taller than wide, in springy clumps, with the twists running across them.
    const lift = (phi: number, t: number, u: number) => lifted(k, round(0.042, t, u) * (1 + 0.22 * Math.sin(3 * phi + 5 * t)) + 0.016 * Math.cos(t) ** 2);
    const paint = byAngles(k, (phi, t) => (Math.floor((phi * 4) / Math.PI + t * 6) % 2 ? k.hue : k.mid));
    k.shell(piece(layer(k.head, k.near ? 16 : k.cols, k.near ? 6 : 2, naturalEdge, lift, RIM, CURL), paint));
  },
  "locs-short": locs(false),
  "locs-long": locs(true),
  "locs-updo": (k) => {
    // Locs drawn up from the hairline (stripes toward the crown) into a coil piled on top.
    const up = byAngles(k, (phi) => (Math.floor((phi * 12) / TAU) % 2 ? k.hue : k.deep));
    k.shell(close(k, up, lifted(k, 0.007)));
    const top = k.m.head;
    if (!k.near) {
      k.shell(piece(new SphereGeometry(0.05, 6, 3), k.deep, { at: [0, top + 0.02, 0.01], scale: [1, 0.75, 1] }));
      return;
    }
    const turns = 10;
    const coil = Array.from({ length: turns }, (_, i) => {
      const s = i / (turns - 1);
      const [a, r] = [s * 1.75 * TAU, 0.055 * (1 - 0.7 * s)];
      return new Vector3(r * Math.sin(a), top - 0.005 + 0.05 * s, 0.01 + r * Math.cos(a));
    });
    k.shell(piece(rope(coil, 0.013, 12, 4), plait(k.hue, k.deep, 4)));
  },
  "box-braids": (k) => {
    const parts = sections(k, 14, 5, k.hue, mix(k.hue, k.skin, 0.4));
    if (!k.near) {
      if (!k.under) k.shell(close(k, parts, lifted(k, 0.016)));
      k.shell(piece(fall(k, 0.66 * Math.PI, -0.28, 0.018, 0.025), plait(k.hue, k.deep, 2)));
      return;
    }
    // Ten down the back; under a hat two more take their place, as the swept ones would pass through its edge.
    const n = k.under ? 12 : 10;
    for (let i = 0; i < n; i++) {
      const phi = -0.34 * Math.PI + (0.68 * Math.PI * (i + 0.5)) / n;
      const points = hanging(k, phi, below(k, phi, [0.3, 0.6, 0.9][i % 3]), 1.85, i % 2 ? 0.013 : 0.008, -0.28 + (i % 2) * 0.03);
      k.shell(piece(rope(points, 0.0075, 5, 3), plait(k.hue, k.deep, 3)));
    }
    if (k.under) return;
    k.shell(close(k, parts, 0.005, 3));
    // A braid from each temple, swept back above the ear to join the rest: box braids read as braids from the front too.
    for (const side of [-1, 1]) {
      const at = (f: number, t: number, lift: number) => k.head.at(Math.PI - side * f, t, lift);
      const swept = [at(0.3 * Math.PI, 1.18, 0.006), at(0.48 * Math.PI, 1.22, 0.009), at(0.66 * Math.PI, 1.3, 0.01), at(0.8 * Math.PI, 1.62, 0.012)];
      const last = swept[3];
      const down = [new Vector3(last.x * 0.97, -0.04, Math.max(last.z, k.back * 0.95)), new Vector3(last.x * 1.05, -0.25, Math.max(last.z, k.back))];
      k.shell(piece(rope([...swept, ...down], 0.0085, 6, 3), plait(k.hue, k.deep, 3)));
    }
  },
  cornrows: (k) => {
    const scalpTone = mix(k.hue, k.skin, 0.5);
    if (!k.near) {
      if (!k.under) k.shell(close(k, byAngles(k, (_, __, at) => (Math.floor((at.x / k.m.headWidth + 1) * 3.5) % 2 ? k.hue : scalpTone)), lifted(k, 0)));
      return;
    }
    if (!k.under) k.shell(close(k, scalpTone));
    // Six raised rows straight back from the hairline to the nape; under a hat, their ends below its edge.
    for (const side of spread(-0.85, 0.85, 6)) {
      const points = backward(side, spread(1.05 - 0.1 * Math.abs(side), -2, k.under ? 13 : 7))
        .map((u) => k.head.toward(u.x, u.y, u.z, 0.006))
        .filter((p) => shows(k, p));
      if (points.length > 1) k.shell(piece(rope(points, 0.0065, 6, 3), plait(k.hue, k.deep, 3)));
    }
  },
  knots: (k) => {
    if (!k.under) k.shell(close(k, sections(k, 8, 3, k.hue, mix(k.hue, k.skin, 0.4)), lifted(k, 0)));
    const knots = [[0, 0.05], ...[0, 1, 2, 3, 4].map((i) => [Math.PI + (i * TAU) / 5, 0.75]), [0.22 * Math.PI, 1.35], [-0.22 * Math.PI, 1.35]] as const;
    const knot = k.near ? lathe([[0.024, 0], [0.021, 0.015], [0.012, 0.028], [0, 0.034]], 5) : new ConeGeometry(0.022, 0.034, 3, 1, true).translate(0, 0.017, 0);
    const swirl: Paint = (_, n) => ((n + Math.floor(n / 10)) % 3 === 0 ? k.deep : k.hue);
    for (const [phi, t] of knots) if (shows(k, k.head.at(phi, t))) k.shell(piece(knot.clone(), swirl, onScalp(k, phi, t, 0.004)));
  },
  buzz: (k) => k.shell(close(k, speckle(mix(k.hue, k.skin, 0.3), mix(k.hue, k.skin, 0.4)))),
  "fade-low": (k) => {
    // Longer on top, fading to the skin low on the sides and back, with a part cut on the left.
    const fade = (u: number) => (u < 0.6 ? 0.011 : 0.011 - 0.007 * ((u - 0.6) / 0.4));
    const grain = mix(k.hue, k.mid, 0.2);
    const paint = byAngles(k, (phi, t) => {
      const u = t / naturalEdge(phi);
      const blend = (u < 0.6 ? 0 : u < 0.8 ? 0.3 : 0.55) * sides(phi);
      return mix(grain, k.skin, blend);
    });
    k.shell(piece(layer(k.head, k.cols, k.near ? 6 : 2, naturalEdge, (_, __, u) => lifted(k, fade(u)), RIM), paint));
    if (k.near) {
      const onHair = (on: Vector3) => {
        const [phi, t] = k.head.angles(on);
        return fade(t / naturalEdge(phi)) + 0.0012;
      };
      k.detail(line(k, backward(-0.45, spread(1.0, 0.1, 4)), onHair, 0.0016, shade(k.skin, 0.95)));
      // And a short curved line cut beside it, curving away toward the back.
      const design = spread(0.9, 0.35, 4).map((psi, i) => backward(-0.56 - (0.05 * i * i) / 3, [psi])[0]);
      k.detail(line(k, design, onHair, 0.0014, shade(k.skin, 0.95)));
    }
  },
  "fade-high": (k) => {
    // Faded close all round, under a tall flat-topped block.
    const grain = mix(k.hue, k.mid, 0.2);
    const paint = byAngles(k, (phi, t) => mix(grain, k.skin, (t / naturalEdge(phi) < 0.7 ? 0.25 : 0.55) * sides(phi)));
    k.shell(close(k, paint, lifted(k, 0.005), k.near ? 5 : 2));
    const [h, rb] = [k.m.head, 0.9 * k.m.headWidth];
    const profile = k.near
      ? [[rb, 0.7 * h], [rb * 1.06, h + 0.075], [rb * 0.98, h + 0.095], [0, h + 0.1]] as const
      : [[rb, 0.7 * h], [rb * 1.06, h + 0.08], [0, h + 0.1]] as const;
    const segments = k.near ? 8 : 4;
    // Turned so that a flat face looks forward.
    k.shell(piece(lathe(profile, segments, Math.PI / segments), speckle(k.hue, k.deep, 0.35), { scale: [1, 1, (0.95 * k.m.headDepth) / k.m.headWidth] }));
  },
  waves: (k) => {
    // Ripples spiralling out from the crown: rows that alternate in height and in sheen.
    const rows = k.near ? 8 : 2;
    const lift = (_: number, __: number, u: number) => lifted(k, 0.0055 + 0.0015 * Math.cos(rows * Math.PI * u));
    const shine = mix(k.hue, "#ffffff", 0.14);
    const paint = byAngles(k, (phi, t) => (Math.floor((t / naturalEdge(phi)) * 8 + 0.5 + 0.35 * Math.sin(2 * phi)) % 2 ? k.hue : shine));
    k.shell(piece(layer(k.head, k.cols, rows, naturalEdge, lift), paint));
  },
  "finger-waves": (k) => {
    // Sculpted S-waves close to the head, short at the nape.
    const edge = (phi: number) => Math.min(naturalEdge(phi), 1.85);
    const wave = (phi: number, u: number) => Math.cos(7 * Math.PI * u + 1.2 * Math.sin(3 * phi));
    const shine = mix(k.hue, "#ffffff", 0.16);
    const paint = byAngles(k, (phi, t) => (wave(phi, t / edge(phi)) > 0.3 ? shine : k.hue));
    k.shell(piece(layer(k.head, k.cols, k.near ? 8 : 2, edge, (phi, _, u) => lifted(k, 0.0065 + 0.003 * wave(phi, u)), RIM), paint));
  },
  "silk-press": (k) => {
    // Sleek and glossy, parted in the middle, falling past the jaw, with laid edges along the hairline.
    k.shell(piece(fall(k, 0.62 * Math.PI, -0.12, 0.014, 0.03), streaks(k)));
    if (k.under) return;
    k.shell(sleek(k, byAngles(k, (_, t) => (t > 0.35 && t < 0.7 ? k.light : k.hue))));
    if (!k.near) return;
    k.detail(line(k, backward(0, spread(1.05, 0.15, 4)), () => 0.0092, 0.0015, shade(k.skin, 0.92)));
    const edges = spread(-0.36 * Math.PI, 0.36 * Math.PI, 9).map((f) => k.head.at(Math.PI + f, HAIRLINE(Math.abs(f)) + 0.035 + 0.025 * Math.abs(Math.sin(f * 7)), 0.0015));
    k.detail(piece(rope(edges, 0.0018, 8, 3), k.deep));
  },
  "curly-bob": (k) => {
    // Full curls to the jaw, framing the face in front of the ears and falling behind them, lifted clear over each ear.
    // Up close each curl is a bump of its own, so the outline and the light break into curls rather than a smooth
    // helmet: a crown on every other point of every other row, offset row to row (so the lower edge is scalloped too),
    // some fuller than others so the rows do not read as a pattern.
    const bob = curve([[0, 1.13], [0.2 * Math.PI, 1.2], [0.36 * Math.PI, 2.0], [0.45 * Math.PI, 1.36], [0.62 * Math.PI, 1.36], [0.76 * Math.PI, 2.35], [Math.PI, 2.35]]);
    const edge = (phi: number) => bob(fromFace(phi));
    const [cols, rows] = k.near ? [24, 8] : [k.cols, 2];
    // On the layer's points: 2 on a crown, 0 beside it, -1 in the rows between.
    const curl = (phi: number, u: number) => Math.cos(Math.PI * ((cols * phi) / TAU - (rows * u) / 2)) + Math.cos(Math.PI * rows * u);
    const lift = (phi: number, _: number, u: number) => lifted(k, 0.026 * (1 + (k.near ? 0.12 * curl(phi, u) * (1 + 0.5 * Math.sin(5 * phi + 11 * u)) : 0)) * fullness(u, 0.7, 0.6));
    // The six triangles round each crown point: the upper three a touch lighter, the lower three the soft grain, as a curl
    // lit from above. Close to the hue, so the curls read by their outline and light, never as shards of two colours.
    const [light, deep] = [mix(k.hue, "#fff6e8", 0.03), k.mid];
    const curls = byAngles(k, (phi, t) => {
      const [x, y] = [(cols * phi) / TAU, (rows * t) / edge(phi)];
      for (const row of [2 * Math.floor(y / 2), 2 * Math.floor(y / 2) + 2]) {
        const [dx, dy] = [x - row / 2 - 2 * Math.round((x - row / 2) / 2), y - row];
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dx + dy) < 1) return dy < 0 ? light : deep;
      }
      return k.hue;
    });
    k.shell(piece(layer(k.head, cols, rows, edge, lift, RIM), curls));
  },
  pixie: (k) => {
    // Short and tapered, its fringe swept across the forehead to the figure's left.
    const edge = (phi: number) => {
      const f = fromFace(phi);
      return HAIRLINE(f) + (f < Math.PI / 2 ? 0.14 * Math.cos(f) ** 2 * (0.6 - 0.4 * Math.sin(phi)) : 0);
    };
    const lift = (phi: number, _: number, u: number) => lifted(k, fromFace(phi) < 0.45 * Math.PI ? 0.013 : 0.013 - 0.008 * Math.max(0, (u - 0.4) / 0.6));
    const paint = byAngles(k, (phi) => (Math.floor((phi * 16) / TAU) % 2 ? k.mid : k.hue));
    k.shell(piece(layer(k.head, k.cols, k.near ? 5 : 2, edge, lift, RIM), paint));
  },
  "long-straight": (k) => {
    // Full and long, to the middle of the back, parted on the right.
    k.shell(piece(fall(k, 0.62 * Math.PI, -0.3, 0.017, 0.045), streaks(k)));
    if (k.under) return;
    k.shell(sleek(k, streaks(k)));
    if (k.near) k.detail(line(k, backward(0.3, spread(1.0, 0.2, 4)), () => 0.0092, 0.0015, shade(k.skin, 0.92)));
  },
  ponytail: (k) => {
    if (!k.under) k.shell(sleek(k, byAngles(k, (phi) => (Math.floor((phi * 12) / TAU) % 2 ? k.light : k.hue))));
    // Tied high at the back with a gold band, the tail swinging out and down behind the neck; under a hat, tied low below its edge.
    const tied = k.under ? Math.max(0.95, k.under(Math.PI) + 0.06) : 0.95;
    const tie = k.head.at(0, tied, 0.008);
    const out = k.head.at(0, tied, 1).sub(k.head.at(0, tied)).normalize();
    const at = (o: number, down: number) => tie.clone().addScaledVector(out, o).add(new Vector3(0, -down, 0));
    const tail = [tie, at(0.03, -0.005), at(0.055, 0.06), at(0.06, 0.15), at(0.05, 0.22)];
    const swell = (s: number) => 0.6 + 0.6 * Math.sin(Math.PI * Math.min(1, s * 1.4)) ** 0.8 * (1 - 0.6 * s);
    k.shell(piece(rope(tail, 0.02, k.near ? 6 : 3, k.near ? 5 : 3, swell), (_, n) => (n % 10 < 4 ? k.light : k.hue)));
    if (k.near && !k.under) k.detail(piece(new CylinderGeometry(0.017, 0.017, 0.012, 6, 1, true), "#d6a32b", onScalp(k, 0, 0.95, -0.012)));
  },
  bun: (k) => {
    k.shell(sleek(k, byAngles(k, (phi) => (Math.floor((phi * 12) / TAU) % 2 ? k.light : k.hue))));
    const at = k.head.at(0, 0.5, 0.03);
    const ball = k.near ? new SphereGeometry(0.045, 8, 5) : new SphereGeometry(0.045, 5, 3);
    k.shell(piece(ball, (_, n) => ((n + Math.floor(n / 16)) % 3 === 0 ? k.deep : k.hue), { at: [at.x, at.y, at.z], scale: [1, 0.85, 1] }));
  },
  mohawk: (k) => {
    k.shell(close(k, speckle(mix(k.hue, k.skin, 0.62), mix(k.hue, k.skin, 0.72))));
    // A crest from the forehead over the crown to the nape, in spikes, its cross-section right base to top to left base.
    const cols = k.near ? 10 : 4;
    const path = backward(0, spread(1.05, -1.75, cols + 1));
    const crest = grid(cols, 3, (i, j) => {
      const u = path[i];
      const base = k.head.toward(u.x, u.y, u.z, k.min);
      const normal = k.head.toward(u.x, u.y, u.z, 1).sub(k.head.toward(u.x, u.y, u.z)).normalize();
      const s = i / cols;
      const tall = 0.06 * Math.sin(Math.PI * (0.1 + 0.8 * s)) ** 0.5 * (i % 2 ? 1.2 : 0.85);
      const side = [0.016, 0.008, -0.008, -0.016][j];
      return base.addScaledVector(normal, j === 1 || j === 2 ? tall : 0).add(new Vector3(side, 0, 0));
    });
    k.shell(piece(crest, (_, n) => (Math.floor(n / (2 * cols)) === 1 ? k.light : k.hue)));
  },
};

/** How far a dressing's head pieces stand out along `normal` within `reach` of the line through `at`: 0 where there are none. */
export function standOff(dressing: Dressing, at: Vector3, normal: Vector3, reach = 0.025): number {
  let most = 0;
  const v = new Vector3();
  for (const geometry of [...(dressing.shell.head ?? []), ...(dressing.detail.head ?? [])]) {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).sub(at);
      const out = v.dot(normal);
      if (out > most && v.addScaledVector(normal, -out).length() < reach) most = out;
    }
  }
  return most;
}

/** Styles that hang below a hat's edge, to the jaw or further. */
export const LONG: readonly Look["hair"][] = ["locs-long", "box-braids", "silk-press", "long-straight", "ponytail"];
/** Styles that puff out below a hat's edge. */
export const PUFFS: readonly Look["hair"][] = ["afro-s", "afro-m", "afro-l"];
/** Styles that keep what shows below a hat's edge: the long ones, the ends of short locs, cornrows and knots at the nape, and the afros. The rest tuck under it. */
export const BELOW_HAT: readonly Look["hair"][] = [...LONG, "locs-short", "cornrows", "knots", ...PUFFS];

/**
 * `covered`: a covering (a crown hat, a beanie) hides the whole scalp, so a style kept below it (BELOW_HAT) needs no close layer of its own.
 * `brim`: under a hat, how far below its edge its brim reaches (Dressing.hatDrop).
 */
export function hair(look: Look, m: Measurements, detail: Detail, tucked: boolean | ((f: number) => number) = false, covered = false, brim: (f: number) => number = () => 0): Dressing {
  const out = dressing();
  if (look.hair === "bald" || detail === "simple") return out;
  const near = detail === "near";
  const hue = hexOf("hairColor", look.hairColor) ?? "#17120f";
  const k: Kit = {
    m,
    head: scalp(m),
    near,
    cols: near ? 12 : 6,
    min: TUCKED_LIFT[detail],
    hue,
    deep: shade(hue, 0.55),
    // Close to the hue: grain that softens a mass, never hard facets of another colour.
    mid: mix(shade(hue, 0.86), "#fff6e8", 0.03),
    light: mix(hue, "#fff6e8", 0.12),
    skin: hexOf("skin", look.skin) ?? SKIN_TONES[22],
    back: m.chest * m.depth + 0.03,
    under: typeof tucked === "function" ? tucked : undefined,
    brim,
    shell: (...pieces) => add(out.shell, "head", ...pieces),
    detail: (...pieces) => add(out.detail, "head", ...pieces),
  };
  const hangs = !!k.under && BELOW_HAT.includes(look.hair);
  if (tucked && !(covered && hangs)) k.shell(close(k, speckle(k.hue, k.deep, 0.3)));
  if (!tucked || hangs) STYLES[look.hair](k);
  return out;
}
