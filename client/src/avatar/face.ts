/**
 * The head and face: the head's shape, ears, large eyes whose lids blink and whose irises glance, bold
 * brows, a nose, a mouth for each MouthShape, marks, facial hair, make-up, and hearing aids or a
 * cochlear-implant processor on the ears.
 *
 *   const f = face(look, m, "near")
 *   f.shell, f.detail       pieces for the head joint (shell pieces get the outline)
 *   f.irises, f.lids        pieces for the face's moving mesh; lidAt, lidRest and gaze say how they move
 *   f.brows.rest/raised/knit the brows at rest and at each end of their move, for Figure.face.setBrows
 *   f.mouths[shape]         the pieces of each mouth shape, swapped in by Figure.face.setMouth
 *   headProfile(m, rows)    the head's lathe profile, for hair and headwear that hug the head
 *
 * Head space starts at the chin with y up and the face toward -Z. Features sit on the head's real,
 * faceted surface, so nothing floats or sinks.
 */
import { ConeGeometry, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from "three";
import { hexOf, SKIN_TONES, type Look } from "../../../shared/avatar";
import { vitiligo } from "./body";
import type { MouthShape } from "./figure";
import type { Measurements } from "./measure";
import { disc, frontZ, inflate, lathe, luma, mix, piece, radiusAt, SEGMENTS, shade, slice, tapered, tint, tube, type Paint, type Profile, type Vec } from "./shapes";

export interface Face {
  shell: BufferGeometry[];
  detail: BufferGeometry[];
  irises: BufferGeometry[];
  /** The same brows three ways, piece for piece and vertex for vertex: the face morphs between them. */
  brows: Record<"rest" | "raised" | "knit", BufferGeometry[]>;
  /** Drawn about the line y = lidAt and scaled down from it: lidRest at rest, 1 closed. */
  lids: BufferGeometry[];
  lidAt: number;
  lidRest: number;
  /** How far the irises move at full glance, sideways and up. */
  gaze: [number, number];
  mouths: Record<MouthShape, BufferGeometry[]>;
}

/** Eye shapes: width and height of the eye, the outer corner's lift (radians) and how much of the eye the lid covers at rest. */
const EYES: Record<Look["eyes"], { sx: number; sy: number; tilt: number; rest: number }> = {
  almond: { sx: 1.15, sy: 0.85, tilt: 0.08, rest: 0.2 },
  round: { sx: 1, sy: 1.05, tilt: 0, rest: 0.1 },
  hooded: { sx: 1.05, sy: 0.95, tilt: 0, rest: 0.36 },
  monolid: { sx: 1.15, sy: 0.8, tilt: 0.05, rest: 0.3 },
  upturned: { sx: 1.1, sy: 0.9, tilt: 0.22, rest: 0.18 },
  downturned: { sx: 1.1, sy: 0.9, tilt: -0.2, rest: 0.13 },
};

/**
 * Brow heights at four points from the inner end out, and thickness, all in head heights. No inner end sits
 * below the rest of its brow, so no face frowns at rest: the shapes differ in the arch, never in a scowl.
 */
const BROWS: Record<Look["brows"], { lift: readonly number[]; r: number }> = {
  straight: { lift: [0.004, 0.006, 0.006, 0], r: 0.016 },
  "soft-arch": { lift: [0.008, 0.02, 0.02, -0.004], r: 0.016 },
  "high-arch": { lift: [0.006, 0.024, 0.034, 0], r: 0.014 },
  rounded: { lift: [0.004, 0.022, 0.022, -0.012], r: 0.016 },
  // Level along the inner half and peaked toward the outer end, so the angle reads keen rather than cross.
  angled: { lift: [0.02, 0.022, 0.032, -0.01], r: 0.016 },
  thick: { lift: [0.006, 0.012, 0.01, -0.004], r: 0.024 },
  thin: { lift: [0.006, 0.018, 0.018, -0.002], r: 0.009 },
  bushy: { lift: [0.008, 0.016, 0.014, -0.002], r: 0.027 },
};

/** Half the mouth's width and each lip's thickness, in head heights. */
export const LIPS: Record<Look["mouth"], { width: number; t: number }> = {
  full: { width: 0.11, t: 0.027 },
  medium: { width: 0.11, t: 0.021 },
  thin: { width: 0.11, t: 0.014 },
  wide: { width: 0.14, t: 0.021 },
  bow: { width: 0.105, t: 0.023 },
  small: { width: 0.085, t: 0.019 },
};

/** How far each brow point (inner end out) moves at full raise and at full knit: up, and in toward the nose, in head heights. */
const BROW_MOVES = {
  raised: { up: [0.032, 0.03, 0.026, 0.018], in: [0, 0, 0, 0] },
  knit: { up: [-0.016, -0.008, -0.002, 0], in: [0.012, 0.006, 0.002, 0] },
} as const;

/** Each mouth shape: its width, how high the corners sit and how far the lips part (in half-widths of the mouth). */
export const MOUTHS: Record<MouthShape, { w: number; corner: number; top: number; bottom: number; open: boolean; teeth: boolean }> = {
  // Corners up: a soft smile at rest, at a friendly table. Lip shape, brows and eyes keep every face its own.
  relaxed: { w: 1, corner: 0.27, top: 0, bottom: 0.03, open: false, teeth: false },
  // Clearly more than the resting smile, so a wave or a bow reads as a smile across the table.
  smile: { w: 1.1, corner: 0.45, top: -0.02, bottom: 0.07, open: false, teeth: false },
  grin: { w: 1.15, corner: 0.36, top: 0.12, bottom: 0.3, open: true, teeth: true },
  open: { w: 0.85, corner: 0, top: 0.2, bottom: 0.45, open: true, teeth: false },
  surprise: { w: 0.5, corner: 0, top: 0.4, bottom: 0.55, open: true, teeth: false },
  // Wide and open, so a laugh reads from across a table.
  laugh: { w: 1.25, corner: 0.34, top: 0.18, bottom: 0.7, open: true, teeth: true },
};
export const MOUTH_SHAPES = Object.keys(MOUTHS) as MouthShape[];
/** The moustache's ends: how far out (in half-mouths) and how far above the top of the upper lip (in head heights). */
export const MUSTACHE = { reach: 0.9, end: 0.03 } as const;

/**
 * Each ear: its size, how far its back edge flares out (radians), its height and depth against the usual (round is as
 * tall as it is deep), and how far it sits in toward the head (head heights).
 */
export const EARS: Record<Look["ears"], { size: number; flare: number; tall: number; deep: number; inset: number }> = {
  round: { size: 1, flare: 0.3, tall: 0.8, deep: 1.2, inset: 0 },
  small: { size: 0.8, flare: 0.25, tall: 1, deep: 1, inset: 0 },
  large: { size: 1.22, flare: 0.38, tall: 1, deep: 1, inset: 0 },
  close: { size: 0.95, flare: 0, tall: 1, deep: 1, inset: 0.012 },
};

/** Where one ear sits and its shape: an egg of these half-sizes at `at`, turned `flare` about the vertical. */
export function earShape(ears: Look["ears"], m: Measurements, side: -1 | 1): { at: Vector3; flare: number; half: Vec } {
  const ear = EARS[ears];
  return {
    // m.ear is the left ear (-X); the inset brings either ear in toward the head.
    at: new Vector3(-side * (m.ear[0] + ear.inset * m.head), m.ear[1], m.ear[2]),
    flare: side * ear.flare,
    half: [0.03 * m.head, 0.075 * m.head * ear.size * ear.tall, 0.05 * m.head * ear.size * ear.deep],
  };
}

/** Spots across the nose and cheeks, in head heights (x, y). */
const FRECKLES = [[-0.1, 0.4], [0.1, 0.41], [-0.15, 0.37], [0.15, 0.375], [-0.2, 0.39], [0.2, 0.385], [-0.12, 0.33], [0.12, 0.335], [-0.17, 0.31], [0.175, 0.32]] as const;
/** Patches of lighter skin (x, y, radius in head heights): beside one eye and on the chin. */
const PATCHES = [[-0.26, 0.52, 0.05], [-0.22, 0.41, 0.04], [0.06, 0.09, 0.045]] as const;

const EYE_WHITE = "#f7f3ec";
const PUPIL = "#0d0a09";
const HIGHLIGHT = "#ffffff";
const MOUTH_INSIDE = "#3b1d1f";
const TEETH = "#f3eee4";
const LINER = "#16110f";
const HEARING_AID = "#cdb08a";
const IMPLANT = "#34383e";
const SILVER = "#c9ccd1";

export function headProfile(m: Measurements, rows: number): Profile {
  const points: [number, number][] = [];
  for (let i = 0; i <= rows; i++) {
    const c = Math.cos((i / rows) * Math.PI);
    // An ellipse from chin to crown, a little narrower toward the chin.
    points.push([m.headWidth * Math.sqrt(1 - c * c) * (1 - 0.22 * Math.max(0, c) ** 2), (m.head / 2) * (1 - c)]);
  }
  return points;
}

/** A frame on a surface: its -Z looks out along `normal`, its +Y stays as close to up as it can, then turned by `turn` about its own Z. */
function frameAt(at: Vector3, normal: Vector3, turn = 0): Matrix4 {
  const z = normal.clone().negate();
  const x = new Vector3(0, 1, 0).cross(z).normalize();
  const y = z.clone().cross(x);
  return new Matrix4().makeBasis(x, y, z).setPosition(at).multiply(new Matrix4().makeRotationZ(turn));
}

const xyz = (v: Vector3): Vec => [v.x, v.y, v.z];

/**
 * Where a cochlear-implant processor's coil sits (on the figure's right): on the head above and behind the ear, and the
 * head's outward normal there.
 */
export function coilSpot(m: Measurements): { at: Vector3; normal: Vector3 } {
  const [h, w, depth] = [m.head, m.headWidth, m.headDepth];
  const [y, angle] = [0.64 * h, -0.62 * Math.PI];
  const r = radiusAt(headProfile(m, SEGMENTS.near.headRows), y);
  const at = new Vector3(-r * Math.sin(angle), y, (-depth / w) * r * Math.cos(angle));
  return { at, normal: new Vector3(at.x / w ** 2, (at.y - h / 2) / (h / 2) ** 2, at.z / depth ** 2).normalize() };
}

/** `overHair`: how far the worn hair stands off the head at coilSpot, so an implant's coil sits on the hair, not under it. */
export function face(look: Look, m: Measurements, detail: "near" | "far", overHair = 0): Face {
  const s = SEGMENTS[detail];
  const near = detail === "near";
  const [h, w, depth] = [m.head, m.headWidth, m.headDepth];
  const zs = depth / w;
  const profile = headProfile(m, s.headRows);
  const skin = hexOf("skin", look.skin) ?? SKIN_TONES[22];
  const hair = hexOf("browColor", look.browColor) ?? "#17120f";

  const surfaceZ = (x: number, y: number) => frontZ(profile, s.head, zs, x, y);
  const normalAt = (x: number, y: number) => new Vector3(x / w ** 2, (y - h / 2) / (h / 2) ** 2, surfaceZ(x, y) / depth ** 2).normalize();
  /** A point on the face, moved out along the surface (or in, for a negative lift). */
  const on = (x: number, y: number, lift = 0) => new Vector3(x, y, surfaceZ(x, y)).addScaledVector(normalAt(x, y), lift);
  const onFace = (x: number, y: number, lift = 0, turn = 0) => frameAt(on(x, y, lift), normalAt(x, y), turn);
  /** A point on the head at height y, `around` radians from the front toward the figure's left. */
  const around = (y: number, angle: number, lift = 0): Vector3 => {
    const r = radiusAt(profile, y) + lift;
    return new Vector3(-r * Math.sin(angle), y, -zs * r * Math.cos(angle));
  };
  const scaled = (matrix: Matrix4, x: number, y: number, z: number) => matrix.clone().multiply(new Matrix4().makeScale(x, y, z));
  const moved = (matrix: Matrix4, x: number, y: number, z: number) => matrix.clone().multiply(new Matrix4().makeTranslation(x, y, z));
  const ball = (radius: number, rows = s.small - 2) => new SphereGeometry(radius, s.small, Math.max(2, rows));

  const f: Face = { shell: [], detail: [], irises: [], brows: { rest: [], raised: [], knit: [] }, lids: [], lidAt: 0, lidRest: 0, gaze: [0, 0], mouths: {} as Face["mouths"] };
  const decorate = (...pieces: BufferGeometry[]) => near && f.detail.push(...pieces);
  f.shell.push(piece(lathe(profile, s.head), skin, { scale: [1, 1, zs] }));

  // ---- ears ----
  const earAt = (side: -1 | 1) => earShape(look.ears, m, side).at;
  const [, earHigh, earDeep] = earShape(look.ears, m, 1).half;
  for (const side of [-1, 1] as const) {
    // The back edge stands out from the head. Beyond 8 m the ears are not worth their triangles.
    const ear = earShape(look.ears, m, side);
    if (near) f.shell.push(piece(ball(1), skin, { at: xyz(ear.at), rot: [0, ear.flare, 0], scale: ear.half }));
  }

  // ---- eyes ----
  const eye = EYES[look.eyes];
  const re = 0.085 * h;
  const [eyeX, eyeY] = [0.16 * h, 0.48 * h];
  const iris = hexOf("eyeColor", look.eyeColor) ?? "#3d2516";
  f.lidAt = eyeY + 1.12 * re * eye.sy;
  f.lidRest = eye.rest;
  // Sideways no further than keeps the inner iris in front of the white at a full glance.
  f.gaze = [0.17 * re, 0.16 * re];
  const lidColour = look.eyes === "monolid" ? skin : shade(skin, 0.94);
  const front = -0.4 * re;
  for (const side of [-1, 1]) {
    const frame = onFace(side * eyeX, eyeY, -0.3 * re, side * eye.tilt);
    // Beyond 8 m the white is a flat disc just behind the iris, so the eyes still read as eyes, not dots.
    if (near) f.detail.push(piece(new SphereGeometry(re, s.eye, s.eye - 2), EYE_WHITE, scaled(frame, eye.sx, eye.sy, 0.4)));
    else f.detail.push(piece(disc(0.95 * re, 4), EYE_WHITE, scaled(moved(frame, 0, 0, front - 0.0004), eye.sx, eye.sy, 1)));
    f.irises.push(piece(disc(0.5 * re, s.disc), iris, moved(frame, 0, 0, front - 0.0012)));
    if (near) f.irises.push(piece(disc(0.22 * re, s.disc), PUPIL, moved(frame, 0, 0, front - 0.0018)));
    // The catch-light: it keeps a dark iris readable on the deepest skin and at a distance.
    f.irises.push(piece(disc(0.15 * re, 5), HIGHLIGHT, moved(frame, 0.2 * re, 0.22 * re, front - 0.0024)));
    const lid = new SphereGeometry(1.12 * re, s.eye, near ? 4 : 2, Math.PI, Math.PI);
    f.lids.push(piece(lid, lidColour, new Matrix4().makeTranslation(0, -f.lidAt, 0).multiply(scaled(frame, eye.sx * 1.05, eye.sy, 0.55))));
    if (near && look.liner !== "none") {
      // Along the lid's resting edge, from the inner corner out; the wing flicks up past the outer corner.
      const edge = 1.12 * re * eye.sy * (1 - 2 * eye.rest) - 0.03 * re;
      const onEye = (x: number, y: number): Vec => {
        const inside = 1 - (x / (eye.sx * re)) ** 2 - (y / (eye.sy * re)) ** 2;
        return [x, y, front * Math.sqrt(Math.max(0.15, inside)) - 0.002];
      };
      const points = [onEye(-side * 0.95 * eye.sx * re, 0.05 * re), onEye(-side * 0.4 * eye.sx * re, edge), onEye(side * 0.4 * eye.sx * re, edge), onEye(side * 0.95 * eye.sx * re, 0.15 * re)];
      if (look.liner === "wing") points.push([side * 1.3 * eye.sx * re, 0.4 * re, front * 0.4 - 0.002]);
      const thickness = look.liner === "bold" ? 0.1 : look.liner === "wing" ? 0.065 : 0.05;
      f.detail.push(piece(tube(points, thickness * re, s.tube, 3, tapered), LINER, frame));
    }
  }

  // ---- brows: in the face's moving mesh, raised or knit by a morph ----
  const brow = BROWS[look.brows];
  const browY = eyeY + re * eye.sy + 0.04 * h;
  // Brows nearly as deep as the skin (black brows on the deepest tones) catch a soft sheen along their top, so they read.
  const sheen = Math.cbrt(luma(skin)) - Math.cbrt(luma(hair)) < 0.12 ? mix(hair, "#b3a397", 0.3) : hair;
  for (const [key, move] of [["rest", null], ["raised", BROW_MOVES.raised], ["knit", BROW_MOVES.knit]] as const) {
    for (const side of [-1, 1]) {
      const points = [0.065, 0.13, 0.2, 0.27].map((x, i) => xyz(on(side * (x - (move?.in[i] ?? 0)) * h, browY + (brow.lift[i] + (move?.up[i] ?? 0)) * h, -0.35 * brow.r * h)));
      // Above the brow's own line: the line's height at x, between the two points either side of it.
      const top: Paint = (at) => {
        const next = points.findIndex((p) => Math.abs(p[0]) > Math.abs(at.x));
        const i = Math.min(2, Math.max(0, (next < 0 ? points.length : next) - 1));
        const [a, b] = [points[i], points[i + 1]];
        const share = Math.min(1, Math.max(0, (at.x - a[0]) / (b[0] - a[0] || 1)));
        return at.y > a[1] + (b[1] - a[1]) * share ? sheen : hair;
      };
      f.brows[key].push(piece(tube(points, brow.r * h, s.tube, near ? 3 : 2, (t) => 1.05 - 0.6 * t * t), sheen === hair ? hair : top));
    }
  }

  // ---- nose: lit a little on top and shaded beneath, so it reads on every skin tone ----
  const noseY = 0.34 * h;
  const [noseLight, noseShade] = [tint(skin, "#fff1e2", 0.1, 1.08), shade(skin, 0.78)];
  const lump = (r: number, x: number, y: number, out: number, scale: Vec = [1, 1, 1], tilt = 0) => {
    const [cy, ry] = [y * h, r * h * scale[1]];
    const paint = (p: Vector3) => (p.y > cy + 0.35 * ry ? noseLight : p.y < cy - 0.4 * ry ? noseShade : skin);
    return piece(ball(1), paint, { at: [x * h, cy, surfaceZ(x * h, cy) - out * h], rot: [tilt, 0, 0], scale: [r * h * scale[0], ry, r * h * scale[2]] });
  };
  const n = noseY / h;
  const nose: BufferGeometry[] =
    look.nose === "button" ? [lump(0.045, 0, n, 0.02)]
    : look.nose === "rounded" ? [lump(0.035, 0, n + 0.06, 0.005, [1, 2.6, 1]), lump(0.052, 0, n, 0.025)]
    // One broad lump, its small wings set close and sunk into it: a broad nose, not three.
    : look.nose === "broad" ? [lump(0.05, 0, n, 0.02, [1.5, 1, 1]), lump(0.026, -0.046, n - 0.012, 0.004), lump(0.026, 0.046, n - 0.012, 0.004)]
    : look.nose === "straight" ? [lump(0.03, 0, n + 0.06, 0.012, [1, 3.3, 1.3], 0.2), lump(0.04, 0, n - 0.005, 0.03)]
    : look.nose === "narrow" ? [lump(0.022, 0, n + 0.06, 0.01, [1, 4.5, 1.6]), lump(0.032, 0, n, 0.026), lump(0.022, -0.032, n - 0.01, 0), lump(0.022, 0.032, n - 0.01, 0)]
    : [lump(0.028, 0, n + 0.07, 0.004, [1, 2.5, 1.1]), lump(0.042, 0, n + 0.01, 0.024, [1, 0.85, 1.2], 0.35)];
  f.detail.push(...(near ? nose : nose.slice(0, 1)));

  // ---- facial hair, first: a beard around the mouth brings the lips forward with it ----
  const lip = LIPS[look.mouth];
  const [mw, t, mouthY] = [lip.width * h, lip.t * h, 0.2 * h];
  const beard = look.facialHair;
  const bulk = beard === "full-beard" || beard === "long-beard" ? 0.013 : ["goatee", "circle", "short-beard"].includes(beard) ? 0.006 : 0;
  const lipLift = 0.4 * t + bulk;
  const lipTop = mouthY + 2 * t;
  const jawTop = mouthY - 2 * t - 0.012 * h;
  const stubble = mix(skin, hair, 0.45);
  /** Stubble: a film of colour on the skin. */
  const shellAround = (y0: number, y1: number, a0: number, a1: number, lift: number, colour: string) => {
    const segments = Math.max(2, Math.round((s.head * (a1 - a0)) / (2 * Math.PI)));
    // A lathe's angle runs from +Z toward +X, so the front is at pi and the figure's left beyond it.
    return piece(lathe(inflate(slice(profile, y0, y1), lift), segments, Math.PI + a0, a1 - a0), colour, { scale: [1, 1, zs] });
  };
  const cheeks = (y0: number, y1: number, lift: number, colour: string) => [
    shellAround(y0, y1, -0.47 * Math.PI, -0.3 * Math.PI, lift, colour),
    shellAround(y0, y1, 0.3 * Math.PI, 0.47 * Math.PI, lift, colour),
  ];
  // Hair's grain in two close tones over the small shapes, so a moustache reads as hair: salt and pepper as dark and
  // soft light flecks, any other colour as itself flecked a little deeper.
  const [tone, fleck] = look.browColor === "salt-pepper" ? [shade(hair, 0.35), mix(hair, "#f4f1ea", 0.12)] : [hair, shade(hair, 0.8)];
  const grain: Paint = (at) => (Math.abs(Math.sin(at.x * 127.1 + at.y * 311.7 + at.z * 74.7) * 43758.5453) % 1 < 0.42 ? fleck : tone);
  // The large masses in one blended tone: a fleck the size of a whole far triangle reads as a plate, not as hair. Salt and
  // pepper up close keeps its flecks there too, or one blended grey hides the mix.
  const mass: Paint = near && look.browColor === "salt-pepper" ? grain : () => mix(tone, fleck, 0.3);
  const smooth = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  };
  /**
   * A mass of facial hair over the head from y0 to y1 and a0 to a1 radians round from the front (+ toward the figure's
   * left), `lift` deep, easing to the skin at its sides, at its top (or curled back to the skin there when `closed`) and,
   * unless it carries on from a mass below (`onBelow`), at its bottom: a rounded beard, never a sheet with a rim.
   * Up close, twice the head's columns for a rounder edge. Not outlined: the outline would show inside its open edges.
   */
  const tuft = (y0: number, y1: number, a0: number, a1: number, lift: number, { closed = false, onBelow = false } = {}) => {
    const segments = near ? Math.max(3, Math.round((s.head * (a1 - a0)) / Math.PI)) : Math.max(2, Math.round((s.head * (a1 - a0)) / (2 * Math.PI)));
    const rows: Profile = closed && near ? [...slice(profile, y0, y1), [radiusAt(profile, y1), y1 + 0.004 * h]] : slice(profile, y0, y1);
    const geometry = lathe(rows, segments, Math.PI + a0, a1 - a0);
    const p = geometry.attributes.position;
    const span = Math.min(0.06 * Math.PI, (a1 - a0) / 3);
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
      // A lathe lists its vertices column by column, bottom to top.
      const [column, row] = [Math.floor(i / rows.length), i % rows.length];
      const a = a0 + ((a1 - a0) * column) / segments;
      const sides = smooth((a - a0) / span) * smooth((a1 - a) / span);
      const ends = (closed ? 1 : smooth((y1 - y) / (0.08 * h))) * (onBelow || y0 <= 0 ? 1 : smooth((y - y0) / (0.06 * h)));
      const out = 0.0015 + (lift - 0.0015) * (closed && near && row === rows.length - 1 ? 0 : sides * ends);
      const r = Math.hypot(x, z);
      if (r < 1e-6) p.setY(i, y - out);
      else p.setXYZ(i, x * (1 + out / r), y, z * (1 + out / r));
    }
    geometry.computeVertexNormals();
    return piece(geometry, mass, { scale: [1, 1, zs] });
  };
  const sides = (y0: number, y1: number, lift: number, options: { onBelow?: boolean } = {}) => [
    tuft(y0, y1, -0.47 * Math.PI, -0.3 * Math.PI, lift, options),
    tuft(y0, y1, 0.3 * Math.PI, 0.47 * Math.PI, lift, options),
  ];
  // Beyond 8 m only the beards' masses are drawn: the smaller shapes vanish there.
  const mustache = () => {
    // Its ends lifted and stopped short of the mouth's corners, so the resting smile curls up past them.
    const end = lipTop + MUSTACHE.end * h;
    const points = [[-MUSTACHE.reach * mw, end], [-0.5 * mw, lipTop + 0.02 * h], [0, lipTop + 0.025 * h], [0.5 * mw, lipTop + 0.02 * h], [MUSTACHE.reach * mw, end]];
    return near ? [piece(tube(points.map(([x, y]) => xyz(on(x, y, lipLift + 0.003))), 0.022 * h, s.tube, s.around, tapered), grain)] : [];
  };
  const goatee = () => tuft(0, jawTop, -0.18 * Math.PI, 0.18 * Math.PI, 0.006, { closed: true });
  if (beard === "stubble" && near) f.detail.push(shellAround(0, lipTop + 0.03 * h, -0.47 * Math.PI, 0.47 * Math.PI, 0.0015, stubble), ...cheeks(lipTop + 0.03 * h, 0.45 * h, 0.0015, stubble));
  if (beard === "mustache") f.shell.push(...mustache());
  if (beard === "goatee") {
    f.detail.push(goatee());
    f.shell.push(...mustache());
  }
  if (beard === "circle") {
    f.detail.push(goatee());
    f.shell.push(...mustache());
    for (const side of near ? [-1, 1] : []) {
      const points = [on(side * 1.1 * mw, mouthY + MOUTHS.relaxed.corner * mw, lipLift), on(side * 0.95 * mw, mouthY - t, lipLift), on(side * 0.7 * mw, jawTop, 0.006)];
      f.shell.push(piece(tube(points.map(xyz), 0.016 * h, 4, s.around), grain));
    }
  }
  if (beard === "chin-strap" && near) {
    const points = [[0.42, -0.47], [0.16, -0.25], [0.06, 0], [0.16, 0.25], [0.42, 0.47]].map(([y, a]) => xyz(around(y * h, a * Math.PI, 0.005)));
    f.shell.push(piece(tube(points, 0.018 * h, s.tube + 2, s.around), grain));
  }
  if (beard === "short-beard" || beard === "full-beard" || beard === "long-beard") {
    f.detail.push(tuft(0, jawTop, -0.47 * Math.PI, 0.47 * Math.PI, bulk, { closed: true }), ...sides(jawTop, 0.45 * h, bulk, { onBelow: true }));
    f.shell.push(...mustache());
    if (beard !== "short-beard") f.shell.push(piece(ball(1), mass, { at: [0, 0.03 * h, -0.45 * depth], scale: [0.62 * w, 0.12 * h, 0.5 * depth] }));
    if (beard === "long-beard") f.shell.push(piece(new ConeGeometry(0.5 * w, 0.4 * h, s.small, 1, false), mass, { at: [0, -0.12 * h, -0.5 * depth], rot: [Math.PI, 0, 0] }));
  }
  if (beard === "sideburns" && near) f.detail.push(...sides(0.28 * h, 0.47 * h, 0.006));
  if (beard === "soul-patch") f.detail.push(piece(disc(0.022 * h, s.disc), grain, scaled(onFace(0, mouthY - 2 * t - 0.022 * h, 0.0015), 0.7, 1, 1)));

  // ---- mouths ----
  const lipColour =
    look.lipColor === "none" ? naturalLip(skin)
    : look.lipColor === "gloss" ? mix(naturalLip(skin), "#ffffff", 0.18)
    : hexOf("lipColor", look.lipColor) ?? naturalLip(skin);
  // Bare lips: the lower one rosier, and on deep skin only a little lighter, so the mouth reads on every tone without standing out.
  const lowerLip = look.lipColor === "none" ? tint(skin, "#c06a63", 0.32) : lipColour;
  for (const shape of MOUTH_SHAPES) {
    const style = MOUTHS[shape];
    const half = mw * style.w;
    const corner = mouthY + style.corner * mw;
    const [upper, lower] = [mouthY + t + style.top * mw, mouthY - t - style.bottom * mw];
    const at = (x: number, y: number) => xyz(on(x, y, lipLift));
    const top =
      look.mouth === "bow" ? [at(-half, corner), at(-0.3 * half, upper + 0.25 * t), at(0, upper - 0.1 * t), at(0.3 * half, upper + 0.25 * t), at(half, corner)]
      : [at(-half, corner), at(-0.5 * half, (corner + 3 * upper) / 4), at(0, upper), at(0.5 * half, (corner + 3 * upper) / 4), at(half, corner)];
    const bottom = [at(-half, corner), at(-0.5 * half, (corner + 3 * lower) / 4), at(0, lower), at(0.5 * half, (corner + 3 * lower) / 4), at(half, corner)];
    // Beyond 8 m one lip line is enough.
    // Beyond 8 m a rounded lip of three sides, not a flat ribbon, so the mouth still shows.
    const pieces = [piece(tube(bottom, t * 1.1, s.tube, near ? s.around : 3, tapered), lowerLip)];
    if (near) pieces.push(piece(tube(top, t, s.tube, s.around, tapered), lipColour));
    if (style.open) {
      const gap = upper - lower - 2 * t;
      const middle = (upper + lower) / 2;
      pieces.push(piece(disc(1, s.disc), MOUTH_INSIDE, scaled(onFace(0, middle, lipLift - 0.4 * t + 0.0012), half * 0.85, gap / 2 + t, 1)));
      if (style.teeth && near) pieces.push(piece(disc(1, s.disc), TEETH, scaled(onFace(0, upper - t - gap * 0.18, lipLift - 0.4 * t + 0.002), half * 0.62, gap * 0.22, 1)));
    }
    f.mouths[shape] = pieces;
  }

  // ---- marks and make-up ----
  const cheekColour = hexOf("cheekColor", look.cheekColor);
  // A soft blush: three nested washes, each a small step more colour, and a tint on every skin (never lighter than it by
  // more than a shade), so no edge shows and a light colour on deep skin is no pale patch.
  if (cheekColour) {
    for (const side of [-1, 1]) {
      [0.06, 0.043, 0.026].forEach((r, i) => decorate(piece(disc(r * h, s.disc, 0.12, side + 2 + i), tint(skin, cheekColour, 0.08 + 0.06 * i, 1.06), onFace(side * 0.21 * h, 0.333 * h, 0.0014 + 0.0003 * i))));
    }
  }
  if (look.marks.includes("freckles")) for (const [x, y] of FRECKLES) decorate(piece(disc(0.009 * h, 4), shade(skin, 0.72), onFace(x * h, y * h, 0.0014)));
  if (look.marks.includes("beauty-mark")) decorate(piece(disc(0.013 * h, 6), mix(skin, "#2a1a12", 0.65), onFace(0.14 * h, 0.27 * h, 0.0014)));
  if (look.marks.includes("vitiligo")) {
    const light = vitiligo(look.skin, skin);
    PATCHES.forEach(([x, y, r], i) => {
      decorate(piece(disc(r * h, s.disc, 0.25, i), light, onFace(x * h, y * h, 0.0011)));
      decorate(piece(disc(r * h * 0.6, 6, 0.3, i + 5), light, onFace((x + r * 0.7) * h, (y - r * 0.5) * h, 0.0011)));
    });
  }
  if (look.marks.includes("laugh-lines")) {
    for (const side of [-1, 1]) {
      const points = [[1.05 * mw + 0.03 * h, mouthY + 0.09 * h], [1.2 * mw + 0.035 * h, mouthY + 0.03 * h], [1.15 * mw + 0.03 * h, mouthY - 0.03 * h]];
      // Lying on the skin like the other marks, not sunk into it.
      decorate(piece(tube(points.map(([x, y]) => xyz(on(side * x, y, 0.0012))), 0.006 * h, 3, 3, tapered), shade(skin, 0.8)));
    }
  }

  // ---- hearing aids and implant processor, behind the ears ----
  if (near && look.assistive.length) {
    const implant = look.assistive.includes("implant");
    const aids = look.assistive.includes("hearing-aids");
    for (const side of [-1, 1] as const) {
      const kind = implant && side === 1 ? "implant" : aids ? "aid" : null;
      if (!kind) continue;
      const e = earAt(side);
      const big = kind === "implant" ? 1.2 : 1;
      const outward = (x: number, y: number, z: number) => e.clone().add(new Vector3(side * x, y, z));
      const top = outward(0.006, earHigh * 0.75 * big, earDeep + 0.004);
      const unit = [top, outward(0.008, earHigh * 0.2, earDeep + 0.009), outward(0.004, -earHigh * 0.3 * big, earDeep + 0.007)];
      f.detail.push(piece(tube(unit.map(xyz), 0.0068 * big, 3, 4, (u) => 0.55 + 0.45 * Math.sin(Math.PI * u) ** 0.4), kind === "implant" ? IMPLANT : HEARING_AID));
      if (kind === "aid") {
        // The thin tube over the top of the ear into the ear.
        const wire = [top, outward(0.012, earHigh * 1.02, earDeep * 0.2), outward(0.01, earHigh * 0.3, -earDeep * 0.35), outward(0.006, 0, -earDeep * 0.25)];
        f.detail.push(piece(tube(wire.map(xyz), 0.0012, 3, 3), "#e8e2d6"));
      } else {
        // The coil sits behind and above the ear, on the hair if any covers the head there, its cable running up from the processor.
        const { at: coilAt, normal } = coilSpot(m);
        const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
        const place = (lift: number) => new Matrix4().compose(coilAt.clone().addScaledVector(normal, lift + overHair), turn, new Vector3(1, 1, 1));
        f.detail.push(piece(new CylinderGeometry(0.017 * m.scale, 0.017 * m.scale, 0.005, 7), IMPLANT, place(0.0028)));
        f.detail.push(piece(new CylinderGeometry(0.006 * m.scale, 0.006 * m.scale, 0.0065, 5), SILVER, place(0.0034)));
        const cable = [top, top.clone().lerp(coilAt, 0.5).addScaledVector(normal, 0.008 + overHair), coilAt.clone().addScaledVector(normal, 0.002 + overHair)];
        f.detail.push(piece(tube(cable.map(xyz), 0.0012, 3, 3), IMPLANT));
      }
    }
  }
  return f;
}

/** Lips with no colour on them: the skin a little deeper and rosier. */
function naturalLip(skin: string): string {
  return shade(mix(skin, "#8a3b3b", 0.22), 0.85);
}
