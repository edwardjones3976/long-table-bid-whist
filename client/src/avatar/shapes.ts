/**
 * Tools for building avatar parts in code. A part is a list of pieces: plain coloured geometries in one
 * joint's own space, which buildFigure weights wholly to that joint and merges into one skinned geometry.
 *
 *   piece(new SphereGeometry(1, 8, 6), "#c28d6d", { at: [0, 0.2, 0], scale: [0.1, 0.12, 0.1] })
 *   piece(lathe(profile, 12), (at, i) => (at.y > 0.3 ? trim : main))   a colour per triangle: trims, patterns
 *   lathe(profile, 12)              turns a [radius, y] profile (bottom to top) around Y
 *   frontZ(profile, 12, 1.1, x, y)  where that lathe's front (-Z) surface is at (x, y)
 *   tube(points, radius, 6, 4, taper)  lips, brows, liner, cables
 *   strip(from, to, width, thick, outward)  lapels, plackets, straps
 *   decal(corners, z)               a flat triangle laid onto a curved surface
 *   add(parts, "head", ...pieces)   collects pieces per joint; Dressing is what a module hands back
 *
 * Pieces are non-indexed, so each triangle can take its own colour, and carry position, normal and colour
 * only. Colours are sRGB hex strings; shade and mix make darker, lighter and blended ones.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { JointName } from "./figure";

export type Vec = readonly [number, number, number];
/** [radius, y] points, bottom to top. */
export type Profile = readonly (readonly [number, number])[];
/** One colour, or a colour per triangle from its centre (in joint space) and its index in the piece. */
export type Paint = string | ((at: Vector3, triangle: number) => string);
export interface Place {
  at?: Vec;
  rot?: Vec;
  scale?: Vec | number;
}

/** Pieces for some joints, each in its joint's own space. */
export type Parts = Partial<Record<JointName, BufferGeometry[]>>;

/** What a part module hands back: `shell` pieces get the outline, `detail` pieces (small things on a surface) do not. */
export interface Dressing {
  shell: Parts;
  detail: Parts;
  /** The hair must use its tucked version: it sits under a covering or a hat. */
  tucksHair: boolean;
  /** A hat's lower edge, as t down from the crown by f round from the face (hair.ts): long hair still hangs below it. */
  hatEdge?: (f: number) => number;
}

export const dressing = (): Dressing => ({ shell: {}, detail: {}, tucksHair: false });

export function add(parts: Parts, joint: JointName, ...pieces: BufferGeometry[]): void {
  (parts[joint] ??= []).push(...pieces);
}

/** How finely each detail is cut. Even counts around keep a vertex line down the front of the head and torso. */
export const SEGMENTS = {
  near: { head: 12, headRows: 8, torso: 12, pelvis: 12, arm: 7, leg: 6, cap: 2, hand: 5, foot: 5, small: 6, eye: 7, tube: 5, around: 4, disc: 8, band: 12 },
  far: { head: 6, headRows: 4, torso: 6, pelvis: 6, arm: 4, leg: 4, cap: 1, hand: 4, foot: 4, small: 4, eye: 4, tube: 3, around: 3, disc: 5, band: 6 },
} as const;
export type Segments = (typeof SEGMENTS)["near" | "far"];

const colours = new Map<string, Color>();
function linear(hex: string): Color {
  let colour = colours.get(hex);
  if (!colour) colours.set(hex, (colour = new Color(hex)));
  return colour;
}

/** The colour times k in linear light: below 1 darker, above 1 lighter. */
export const shade = (hex: string, k: number): string => `#${linear(hex).clone().multiplyScalar(k).getHexString()}`;
export const mix = (a: string, b: string, t: number): string => `#${linear(a).clone().lerp(linear(b), t).getHexString()}`;
const lumaOf = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
/** Relative luminance, in linear light. */
export const luma = (hex: string): number => lumaOf(linear(hex));
/**
 * `a` mixed toward `b` by t, but never lighter than `most` times a's own luminance: a tint rather than a highlight,
 * so the same blush or lip on the deepest skin stays as quiet as on the lightest.
 */
export function tint(a: string, b: string, t: number, most = 1.15): string {
  const out = linear(a).clone().lerp(linear(b), t);
  const cap = lumaOf(linear(a)) * most;
  if (lumaOf(out) > cap) out.multiplyScalar(cap / lumaOf(out));
  return `#${out.getHexString()}`;
}

export function matrixOf(place: Place): Matrix4 {
  const scale = place.scale ?? 1;
  return new Matrix4().compose(
    new Vector3(...(place.at ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(place.rot ?? [0, 0, 0]))),
    typeof scale === "number" ? new Vector3(scale, scale, scale) : new Vector3(...scale),
  );
}

const centre = new Vector3();
const corner = new Vector3();

/** Places a primitive and colours it: the one way geometry enters an avatar. */
export function piece(geometry: BufferGeometry, paint: Paint, place: Place | Matrix4 = {}): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  for (const name of Object.keys(flat.attributes)) if (name !== "position" && name !== "normal") flat.deleteAttribute(name);
  flat.applyMatrix4(place instanceof Matrix4 ? place : matrixOf(place));
  const position = flat.attributes.position;
  const out = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 3) {
    let hex = paint;
    if (typeof hex !== "string") {
      centre.set(0, 0, 0);
      for (let j = i; j < i + 3; j++) centre.add(corner.fromBufferAttribute(position, j));
      hex = hex(centre.divideScalar(3), i / 3);
    }
    const { r, g, b } = linear(hex);
    for (let j = i; j < i + 3; j++) out.set([r, g, b], j * 3);
  }
  flat.setAttribute("color", new BufferAttribute(out, 3));
  return withoutSlivers(flat);
}

/** Drops triangles with two corners in one place (a lathe's tips leave them): they draw nothing but still cost. */
function withoutSlivers(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.attributes.position;
  const same = (a: number, b: number) => position.getX(a) === position.getX(b) && position.getY(a) === position.getY(b) && position.getZ(a) === position.getZ(b);
  const kept: number[] = [];
  for (let i = 0; i < position.count; i += 3) if (!same(i, i + 1) && !same(i + 1, i + 2) && !same(i, i + 2)) kept.push(i);
  if (kept.length * 3 === position.count) return geometry;
  for (const name of ["position", "normal", "color"]) {
    const from = geometry.attributes[name].array;
    const to = new Float32Array(kept.length * 9);
    kept.forEach((at, k) => to.set(from.subarray(at * 3, at * 3 + 9), k * 9));
    geometry.setAttribute(name, new BufferAttribute(to, 3));
  }
  return geometry;
}

/** One geometry from many pieces, or null when there are none. */
export function merge(pieces: readonly BufferGeometry[]): BufferGeometry | null {
  if (!pieces.length) return null;
  const merged = mergeGeometries([...pieces]);
  if (!merged) throw new Error("avatar pieces have different attributes");
  return merged;
}

export function triangles(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.attributes.position.count) / 3;
}

export function lathe(profile: Profile, segments: number, phiStart = 0, phiLength = Math.PI * 2): BufferGeometry {
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(Math.max(r, 0), y)), segments, phiStart, phiLength);
}

/** The radius at height y, straight between the profile's points (as the lathe is). */
export function radiusAt(profile: Profile, y: number): number {
  if (y <= profile[0][1]) return profile[0][0];
  for (let i = 1; i < profile.length; i++) {
    const [[r0, y0], [r1, y1]] = [profile[i - 1], profile[i]];
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return profile[profile.length - 1][0];
}

/** The profile grown outward by d, its closed ends moved out with it: a garment over a body part. */
export function inflate(profile: Profile, d: number): Profile {
  const last = profile.length - 1;
  return profile.map(([r, y], i) => [r > 0 ? r + d : 0, r > 0 ? y : i === 0 ? y - d : i === last ? y + d : y] as const);
}

/** The part of a profile between two heights, with points added at both cuts. */
export function slice(profile: Profile, from: number, to: number): Profile {
  const inside = profile.filter(([, y]) => y > from && y < to);
  return [[radiusAt(profile, from), from], ...inside, [radiusAt(profile, to), to]];
}

/**
 * z of the front (-Z) surface at (x, y) of lathe(profile, segments) stretched by zScale in z, exact on its
 * flat facets so things laid on it neither float nor sink. 0 beyond the sides.
 */
export function frontZ(profile: Profile, segments: number, zScale: number, x: number, y: number): number {
  const r = radiusAt(profile, y);
  for (let k = 0; k < segments; k++) {
    const [a, b] = [(2 * Math.PI * k) / segments, (2 * Math.PI * (k + 1)) / segments];
    const [x0, z0, x1, z1] = [r * Math.sin(a), r * Math.cos(a), r * Math.sin(b), r * Math.cos(b)];
    if (z0 + z1 >= 0 || (x - x0) * (x - x1) > 0 || x0 === x1) continue;
    return zScale * (z0 + ((z1 - z0) * (x - x0)) / (x1 - x0));
  }
  return 0;
}

/** A rounded, tapered limb hanging from its joint down to -length. `from` and `to` (fractions of the length) cut a sleeve or trouser leg out of it, open at a cut. */
export function limb(top: number, bottom: number, length: number, caps: number, from = 0, to = 1): Profile {
  const at = (f: number) => [top + (bottom - top) * f, -length * f] as const;
  const points: (readonly [number, number])[] = to >= 1 ? [[0, -length - bottom * 0.6], [bottom, -length]] : [at(to)];
  if (from > 0) return [...points, at(from)];
  for (let i = 0; i <= caps; i++) {
    const angle = (i / caps) * (Math.PI / 2);
    points.push([top * Math.cos(angle), top * Math.sin(angle)]);
  }
  return points;
}

/** A tube through the points, its radius scaled along the way by taper(0..1). */
export function tube(points: readonly Vec[], radius: number, along: number, around: number, taper?: (t: number) => number): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  const geometry = new TubeGeometry(curve, along, radius, around, false);
  if (taper) {
    const position = geometry.attributes.position;
    const middle = new Vector3();
    const p = new Vector3();
    for (let i = 0; i <= along; i++) {
      curve.getPointAt(i / along, middle);
      const s = taper(i / along);
      for (let j = 0; j <= around; j++) {
        const index = i * (around + 1) + j;
        p.fromBufferAttribute(position, index).sub(middle).multiplyScalar(s).add(middle);
        position.setXYZ(index, p.x, p.y, p.z);
      }
    }
  }
  return geometry;
}

/** Thin at both ends, full in the middle: lips, brows, liner. */
export const tapered = (t: number): number => 0.3 + 0.7 * Math.sin(Math.PI * t) ** 0.6;

/** A box from one point to another, `thickness` along `outward` and `width` across. */
export function strip(from: Vector3, to: Vector3, width: number, thickness: number, outward: Vector3): BufferGeometry {
  const along = to.clone().sub(from);
  const y = along.clone().normalize();
  const z = outward.clone().addScaledVector(y, -outward.dot(y)).normalize();
  const x = y.clone().cross(z);
  const matrix = new Matrix4().makeBasis(x, y, z).scale(new Vector3(width, along.length(), thickness));
  return new BoxGeometry(1, 1, 1).applyMatrix4(matrix.setPosition(from.clone().add(to).multiplyScalar(0.5)));
}

/** A disc facing -Z (the front), irregular at the rim when `rough` > 0, the same for the same seed. */
export function disc(radius: number, segments: number, rough = 0, seed = 1): BufferGeometry {
  const geometry = new CircleGeometry(radius, segments).rotateY(Math.PI);
  if (rough) {
    const position = geometry.attributes.position;
    for (let i = 1; i < position.count; i++) {
      // The rim's last vertex repeats its first, so both get the same bump.
      const k = 1 + rough * Math.sin(((i - 1) % segments) * 2.39996 + seed * 1.7);
      position.setXYZ(i, position.getX(i) * k, position.getY(i) * k, position.getZ(i));
    }
  }
  return geometry;
}

/**
 * A flat triangle laid onto a surface z(x, y), cut into n * n small triangles so it follows the curve.
 * Give the corners clockwise with x to the right and y up (counter-clockwise seen from in front), so it faces -Z.
 */
export function decal(corners: readonly (readonly [number, number])[], z: (x: number, y: number) => number, n: number): BufferGeometry {
  const [a, b, c] = corners;
  const point = (i: number, j: number): number[] => {
    const [u, v] = [i / n, j / n];
    const x = a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]);
    const y = a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
    return [x, y, z(x, y)];
  };
  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      positions.push(...point(i, j), ...point(i + 1, j), ...point(i, j + 1));
      if (j < n - i - 1) positions.push(...point(i + 1, j), ...point(i + 1, j + 1), ...point(i, j + 1));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return geometry;
}
