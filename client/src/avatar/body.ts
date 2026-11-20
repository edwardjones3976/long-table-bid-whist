/**
 * The body and its clothes, built from the measurements. Each garment is a slightly larger shell of the
 * same body part (the same profile, grown outward), so every top, bottom, one-piece and pair of shoes fits
 * every build and height with no per-body work.
 *
 *   body(look, m, "near")    shell and detail pieces for every joint but the head (face.ts draws the head)
 *   simpleBody(look, m)      today's capsule figure, measured: the low-detail fallback
 *
 * A part a garment covers completely is not drawn under it; a part it covers only in part (a short
 * sleeve, shorts) is drawn in skin with the garment's shell over the covered length. Each garment has
 * a main colour and a trim colour; patterns are plain stripes, checks and panels, never logos or text.
 */
import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Matrix4, OctahedronGeometry, SphereGeometry, Vector3, type BufferGeometry } from "three";
import { hexOf, SKIN_TONES, type Look } from "../../../shared/avatar";
import type { JointName } from "./figure";
import type { Measurements } from "./measure";
import {
  add,
  decal,
  disc,
  dressing,
  frontZ,
  inflate,
  lathe,
  limb,
  matrixOf,
  mix,
  piece,
  radiusAt,
  SEGMENTS,
  shade,
  strip,
  type Dressing,
  type Paint,
  type Profile,
} from "./shapes";

type Top = Look["top"] | Exclude<Look["onePiece"], "none">;
type Legs = Look["bottom"] | "trousers";

const LONG_SLEEVES: readonly Top[] = ["button-up", "patterned", "sweater", "cardigan", "hoodie", "jacket", "turtleneck", "suit"];
/** How far down the upper arm a short sleeve reaches; tops not listed (and not long-sleeved) have none. */
const SHORT_SLEEVES: Partial<Record<Top, number>> = { tee: 0.5, polo: 0.5, jersey: 0.55, blouse: 0.45, dress: 0.35, jumpsuit: 0.45 };
/** How far each top hangs below the waist, in metres at the middle height. */
const HEM: Record<Top, number> = {
  tee: 0.06, polo: 0.05, "button-up": 0.06, patterned: 0.06, blouse: 0.05, sweater: 0.07, cardigan: 0.13, hoodie: 0.08,
  jersey: 0.08, vest: 0.05, jacket: 0.11, turtleneck: 0.06, dress: 0, jumpsuit: 0, suit: 0.12,
};
/** Heavier cloth stands further off the body. */
const THICK: Partial<Record<Top, number>> = { sweater: 0.013, hoodie: 0.014, cardigan: 0.012, jacket: 0.012, suit: 0.012 };
/** Open fronts: where the V's point is, as a share of the torso's length. */
const V_FRONT: Partial<Record<Top, number>> = { cardigan: 0.5, jacket: 0.42, suit: 0.45, vest: 0.55 };

const SOLE_LIGHT = "#efe9dc";
const SOLE_DARK = "#2b211c";
const FALLBACK_SKIN = SKIN_TONES[22];
/** Bottoms sit this far off the body. */
const LOW = 0.008;

interface Outfit {
  top: Top;
  main: string;
  trim: string;
  legs: Legs;
  low: string;
  lowTrim: string;
}

function outfitOf(look: Look): Outfit {
  const main = hexOf("topColor", look.topColor) ?? "#1f5e3b";
  const trim = hexOf("topTrim", look.topTrim) ?? "#d6a32b";
  if (look.onePiece !== "none") {
    // A one-piece wears the top's two colours from neck to hem.
    return { top: look.onePiece, main, trim, legs: look.onePiece === "dress" ? "midi" : "trousers", low: main, lowTrim: trim };
  }
  const low = hexOf("bottomColor", look.bottomColor) ?? "#1d2b53";
  return { top: look.top, main, trim, legs: look.bottom, low, lowTrim: hexOf("bottomTrim", look.bottomTrim) ?? "#f4f1ea" };
}

/** Beyond 8 m (`near` false) the profiles keep only the points that make the outline. */
function torsoProfile(m: Measurements, near: boolean): Profile {
  const t = m.torso;
  const neck = [[m.neckRadius * 1.25, t + 0.005], [0, t + 0.02]] as const;
  if (!near) return [[m.waist, -0.02], [m.chest, 0.72 * t], ...neck];
  return [[m.waist, -0.02], [Math.max(m.waist, m.chest * 0.92), 0.3 * t], [m.chest, 0.72 * t], [m.chest * 0.96, 0.86 * t], [m.chest * 0.72, 0.96 * t], ...neck];
}

function pelvisProfile(m: Measurements, near: boolean): Profile {
  const k = m.scale;
  if (!near) return [[0, -0.09 * k], [m.hip, -0.01 * k], [m.waist, m.pelvis + 0.02]];
  return [[0, -0.09 * k], [m.hip * 0.7, -0.075 * k], [m.hip, -0.01 * k], [m.hip * 0.97, 0.04 * k], [m.waist, m.pelvis + 0.02]];
}

/** A midi or maxi skirt's lathe profile in pelvis space, flaring from the hips to its hem, or null for any other bottom. */
function skirtProfile(m: Measurements, legs: Legs): { profile: Profile; hemY: number; bandTop: number } | null {
  if (legs !== "midi" && legs !== "maxi") return null;
  const k = m.scale;
  const maxi = legs === "maxi";
  const hemY = -(m.thigh + m.shin * (maxi ? 0.95 : 0.5));
  const hemR = m.hip * (maxi ? 1.5 : 1.38) + LOW;
  const hipR = m.hip + LOW + 0.012 * k;
  const bandTop = hemY + 0.035 * k;
  const profile: Profile = [
    [hemR, hemY],
    [hemR + ((hipR - hemR) * (bandTop - hemY)) / (-0.06 * k - hemY), bandTop],
    [hipR, -0.06 * k],
    [m.hip + LOW, 0.03 * k],
    [m.waist + LOW, m.pelvis + 0.02],
  ];
  return { profile, hemY, bandTop };
}

/**
 * The top's lathe profile in torso space, and the shell worn under it below the waist in pelvis space (the bottoms or
 * a skirt). Below the waist the top is everywhere at least its own thickness outside that shell, so nothing worn under
 * it shows through, on any build, standing or seated (where its lower part is only drawn up toward the waist).
 */
export function topAndBottom(look: Look, m: Measurements, near: boolean): { top: Profile; under: Profile } {
  const o = outfitOf(look);
  const d = THICK[o.top] ?? 0.008;
  const drop = HEM[o.top] * m.scale;
  const under = skirtProfile(m, o.legs)?.profile ?? inflate(pelvisProfile(m, near), LOW);
  // Where it hangs, and where a seated figure draws it up to (motion.ts SEATED_HEM).
  const over = (y: number) => Math.max(radiusAt(under, m.pelvis + y), radiusAt(under, m.pelvis + y / 10)) + d;
  const torso = inflate(torsoProfile(m, near), d).map(([r, y]) => [y < 0.02 ? Math.max(r, over(y)) : r, y] as const);
  return { top: drop > 0 ? [[over(-drop), -drop], ...torso] : torso, under };
}

/** Checks this tall, a little more than a torso column is wide up close. */
const CHECK = 0.1;

/** The profile with points added so no row is taller than `step`, for checks in even bands. */
const finer = (profile: Profile, step: number): Profile =>
  profile.flatMap(([r, y], i) => {
    if (i === 0) return [[r, y] as const];
    const [r0, y0] = profile[i - 1];
    const n = Math.max(1, Math.ceil(Math.abs(y - y0) / step));
    return Array.from({ length: n }, (_, j) => [r0 + ((r - r0) * (j + 1)) / n, y0 + ((y - y0) * (j + 1)) / n] as const);
  });

/**
 * Checks on a lathe of `profile` (a lathe lists its triangles two per quad, column by column): by column, and by bands
 * `step` high taken from each quad's middle, so both its triangles agree. A row closing in to a point is plain.
 */
const checks = (profile: Profile, step: number, a: string, b: string): Paint => (_, triangle) => {
  const rows = profile.length - 1;
  const quad = Math.floor(triangle / 2);
  const [[r0, y0], [r1, y1]] = [profile[quad % rows], profile[(quad % rows) + 1]];
  if (Math.min(r0, r1) < 0.5 * Math.max(r0, r1)) return a;
  return (Math.floor(quad / rows) + Math.floor((y0 + y1) / 2 / step)) % 2 ? b : a;
};

/** Radians round from the front (+ toward the figure's right) of the middle of the lathe column holding a triangle. */
const columnAngle = (triangle: number, rows: number, segments: number): number => {
  const phi = ((Math.floor(triangle / 2 / rows) + 0.5) * 2 * Math.PI) / segments;
  return Math.atan2(Math.sin(phi), -Math.cos(phi));
};

/** A short open band around a lathe at height y: hems, cuffs and collars. */
function band(radius: number, y: number, height: number, segments: number, zScale = 1): BufferGeometry {
  return new CylinderGeometry(radius, radius, height, segments, 1, true).scale(1, 1, zScale).translate(0, y, 0);
}

const xyz = (v: Vector3) => [v.x, v.y, v.z] as const;

const SIDES = [
  [-1, "L"],
  [1, "R"],
] as const;

export function body(look: Look, m: Measurements, detail: "near" | "far"): Dressing {
  const s = SEGMENTS[detail];
  const near = detail === "near";
  const out = dressing();
  const k = m.scale;
  const skin = hexOf("skin", look.skin) ?? FALLBACK_SKIN;
  const o = outfitOf(look);
  const shell = (joint: JointName, ...pieces: BufferGeometry[]) => add(out.shell, joint, ...pieces);
  const small = (joint: JointName, ...pieces: BufferGeometry[]) => near && add(out.detail, joint, ...pieces);
  const zs = m.depth;

  // ---- the top: one shell over the torso, hanging past the waist ----
  const d = THICK[o.top] ?? 0.008;
  const drop = HEM[o.top] * k;
  const pelvis = pelvisProfile(m, near);
  // Up close a patterned top has rows in even bands, so its checks are a regular grid.
  const checked = o.top === "patterned" && near;
  const fitted = topAndBottom(look, m, near).top;
  const top = checked ? finer(fitted, CHECK * k) : fitted;
  const hemRadius = top[0][0];
  const t = m.torso;
  const rows = top.length - 1;
  const across = (p: Vector3) => Math.atan2(p.x, -p.z / zs);
  const paint: Paint =
    o.top === "patterned" ? checks(top, CHECK * k, o.main, o.trim)
    // Side panels by whole columns, so the two triangles of a quad never fall on different sides of a jagged edge.
    : o.top === "jersey" ? (_, n) => (Math.abs(Math.abs(columnAngle(n, rows, s.torso)) - Math.PI / 2) < 0.5 ? o.trim : o.main)
    : !near ? o.main
    : o.top === "sweater" ? (p) => (p.y > 0.72 * t && p.y < 0.86 * t ? o.trim : o.main)
    : o.top === "hoodie" ? (p) => (p.y > -0.02 && p.y < 0.3 * t && Math.abs(across(p)) < 1.05 ? o.trim : o.main)
    : o.main;
  shell("torso", piece(lathe(top, s.torso), paint, { scale: [1, 1, zs] }));
  const front = (x: number, y: number, lift: number) => new Vector3(x, y, frontZ(top, s.torso, zs, x, y) - lift);
  const forward = new Vector3(0, 0, -1);
  // A V on the chest, in two halves so neither crosses the ridge down the middle of the front (where a flat piece would sink).
  const vee = (half: number, high: number, low: number, colour: string) =>
    [[[-half, high], [0, high], [0, low]], [[0, high], [half, high], [0, low]]].map((corners) => piece(decal(corners as [number, number][], (x, y) => front(x, y, 0.004).z, 4), colour));
  /** Flat strips laid down the chest from one point to another, in short steps so they follow its curve. */
  const ribbon = (x0: number, y0: number, x1: number, y1: number, width: number, thickness: number, colour: string, facing = forward) => {
    const steps = 4;
    const points = Array.from({ length: steps + 1 }, (_, i) => front(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, thickness / 2 + 0.002));
    return points.slice(1).map((point, i) => piece(strip(points[i], point, width, thickness, facing), colour));
  };
  const neckR = m.neckRadius;

  if (o.top === "sweater" || o.top === "hoodie" || o.top === "jersey") small("torso", piece(band(hemRadius + 0.003, -drop + 0.015 * k, 0.03 * k, s.band, zs), o.top === "hoodie" ? shade(o.main, 0.85) : o.trim));
  if (o.top === "dress" || o.top === "jumpsuit") shell("torso", piece(band(radiusAt(top, 0.02 * k) + 0.004, 0.02 * k, 0.035 * k, s.band, zs), o.trim));
  if (o.top === "tee" || o.top === "sweater" || o.top === "dress" || o.top === "blouse") {
    // A round neckline: a soft collar for the blouse, a ribbed band for the rest.
    const flare = o.top === "blouse" ? 0.02 : 0.004;
    small("torso", piece(new CylinderGeometry(neckR + 0.01, neckR + 0.01 + flare, 0.022 * k, s.band, 1, true).translate(0, t + 0.004, 0), o.trim));
  }
  shell("neck", piece(new CylinderGeometry(neckR, neckR * 1.05, m.neck + 0.07, s.small + 2, 1, true).translate(0, m.neck / 2 + 0.005, 0), skin));
  if (o.top === "turtleneck") {
    shell("neck", piece(new CylinderGeometry(neckR + 0.012, neckR + 0.016, m.neck * 0.75 + 0.03, s.band, 1, true).translate(0, (m.neck * 0.75 - 0.03) / 2, 0), o.main));
    small("neck", piece(band(neckR + 0.018, m.neck * 0.7, 0.02 * k, s.band), shade(o.main, 0.85)));
  }
  if (o.top === "jersey") small("torso", ...vee(0.035 * k, t + 0.01, t - 0.06 * k, o.trim));
  if (o.top === "polo" || o.top === "button-up" || o.top === "patterned" || o.top === "jumpsuit") {
    const colour = o.top === "polo" || o.top === "jumpsuit" ? o.trim : shade(o.main, 0.9);
    for (const [side] of SIDES) {
      const from = new Vector3(side * (neckR + 0.004), t + 0.012, -neckR * 0.45);
      if (near) shell("torso", piece(strip(from, front(side * 0.022 * k, t - 0.045 * k, 0.004), 0.03 * k, 0.006, new Vector3(side * 0.3, 0.4, -1)), colour));
    }
  }
  if (o.top === "button-up") {
    small("torso", ...ribbon(0, t - 0.04 * k, 0, -drop + 0.012, 0.02 * k, 0.004, o.trim));
    for (let i = 0; i < 4; i++) small("torso", piece(new OctahedronGeometry(0.006 * k), o.main, { at: xyz(front(0, t - (0.09 + i * 0.1) * k, 0.005)), scale: [1, 1, 0.5] }));
  }
  if (o.top === "polo") for (const y of [0.05, 0.085]) small("torso", piece(new OctahedronGeometry(0.006 * k), o.trim, { at: xyz(front(0, t - y * k, 0.004)), scale: [1, 1, 0.5] }));

  const vFront = V_FRONT[o.top];
  if (vFront !== undefined && near) {
    // The open front shows the shirt beneath in the trim colour, edged by lapels or button bands.
    const width = neckR * 1.25;
    const bottom = vFront * t;
    small("torso", ...vee(width, t, bottom, o.trim));
    const lapel = o.top === "jacket" || o.top === "suit" ? 0.032 * k : 0.014 * k;
    const edge = o.top === "jacket" || o.top === "suit" ? o.main : shade(o.main, 0.85);
    for (const [side] of SIDES) {
      shell("torso", ...ribbon(side * (width + lapel * 0.3), t - 0.005, side * 0.006, bottom, lapel, 0.006, edge, new Vector3(side * 0.25, 0.1, -1)));
    }
    const buttons = o.top === "vest" ? 3 : o.top === "cardigan" ? 4 : 2;
    const colour = o.top === "jacket" || o.top === "suit" ? shade(o.main, 0.45) : o.trim;
    for (let i = 0; i < buttons; i++) {
      const y = bottom - 0.02 * k - (i * (bottom + drop * 0.7)) / buttons;
      small("torso", piece(new OctahedronGeometry(0.0065 * k), colour, { at: xyz(front(0, y, 0.006)), scale: [1, 1, 0.5] }));
    }
    if (o.top === "suit") {
      small("torso", ...ribbon(0, t - 0.03, 0, bottom + 0.01, 0.022 * k, 0.004, shade(o.main, 0.55)));
      const x = -m.chest * 0.55;
      small("torso", piece(decal([[x - 0.016 * k, 0.8 * t], [x + 0.016 * k, 0.8 * t], [x, 0.8 * t - 0.025 * k]], (px, py) => front(px, py, 0.004).z, 1), o.trim));
    }
  }
  if (o.top === "hoodie") {
    // The hood lies on the upper back, placed from the top's own back so it sits the same on every build. It is closed,
    // so the outline never shows through an opening.
    shell("torso", piece(new SphereGeometry(0.1 * k, s.small + 2, near ? 5 : 3), shade(o.main, 0.9), { at: [0, t - 0.03, radiusAt(top, t - 0.03) * zs - 0.04 * k], scale: [1.25, 0.8, 0.6] }));
    for (const [side] of SIDES) small("torso", ...ribbon(side * 0.03 * k, t - 0.01, side * 0.035 * k, t - 0.13 * k, 0.006, 0.004, o.trim));
  }

  // ---- arms and hands ----
  const sleeve = LONG_SLEEVES.includes(o.top) ? 1 : SHORT_SLEEVES[o.top] ?? 0;
  const puff = o.top === "blouse" ? 0.01 : 0;
  // Beyond 8 m a limb is left open at its lower end, which the next part covers.
  const end = near ? 1 : 0.98;
  // The shoulder keeps a rounded dome at any distance, never a cone's peak.
  const shoulderCap = Math.max(s.cap, 2);
  const upper = limb(m.limb, m.limb * 0.85, m.upperArm, shoulderCap, 0, end);
  const fore = limb(m.limb * 0.85, m.limb * 0.68, m.foreArm, s.cap, 0, end);
  const wrist = m.limb * 0.68;
  /** A sleeve's shell: checked in even bands like the top, else plain. */
  const sleeveOf = (profile: Profile) => {
    const shape = checked ? finer(profile, CHECK * k) : profile;
    return piece(lathe(shape, s.arm), o.top === "patterned" ? checks(shape, CHECK * k, o.main, o.trim) : o.main);
  };
  for (const [side, at] of SIDES) {
    const [shoulder, elbow, hand] = [`upperArm${at}`, `foreArm${at}`, `hand${at}`] as const;
    if (sleeve >= 1) {
      const cuff = inflate(limb(m.limb * 0.85, wrist, m.foreArm, s.cap, 0, 0.96), d);
      shell(shoulder, sleeveOf(inflate(upper, d)));
      shell(elbow, sleeveOf(cuff));
      const rim = o.top === "suit" || o.top === "jacket" ? null : o.top === "patterned" || o.top === "button-up" ? shade(o.main, 0.9) : o.trim;
      if (rim) small(elbow, piece(band(cuff[0][0] + 0.002, -m.foreArm * 0.94, 0.03 * k, s.arm), rim));
      if (o.top === "suit") small(elbow, piece(band(wrist + 0.006, -m.foreArm * 0.985, 0.014 * k, s.arm), o.trim));
    } else {
      // Under a short sleeve only the arm below it is drawn, from just inside the sleeve's edge.
      shell(shoulder, piece(lathe(sleeve > 0 ? limb(m.limb, m.limb * 0.85, m.upperArm, shoulderCap, 0.9 * sleeve, end) : upper, s.arm), skin));
      shell(elbow, piece(lathe(fore, s.arm), skin));
      if (sleeve > 0) {
        const cover = inflate(limb(m.limb, m.limb * 0.85, m.upperArm, shoulderCap, 0, sleeve), d + puff);
        shell(shoulder, sleeveOf(cover));
        small(shoulder, piece(band(cover[0][0] + 0.003, -m.upperArm * sleeve + 0.009 * k, 0.018 * k, s.arm), o.trim));
      }
    }
    // Palm and grouped fingers in one rounded shape, flat across the palm; its wrist reaches up into the sleeve.
    const reach = m.limb * 1.05;
    const palm: Profile = [
      [0, -m.hand],
      [reach * 0.55, -m.hand + 0.012 * k],
      [reach * 0.85, -m.hand * 0.62],
      [reach, -m.hand * 0.4],
      [wrist * 1.05, -0.012 * k],
      [wrist, 0.035 * k],
    ];
    // Beyond 8 m as few points, the fingertip still rounded, not a point.
    shell(hand, piece(lathe(near ? palm : [palm[0], palm[1], palm[3], palm[5]], s.hand), skin, { scale: [0.55, 1, 1] }));
    if (near) shell(hand, piece(lathe(limb(0.011 * k, 0.009 * k, 0.032 * k, 1), 5), skin, { at: [0, -m.hand * 0.22, -reach * 0.78], rot: [0.55, 0, 0] }));
    if (look.marks.includes("vitiligo")) {
      const light = vitiligo(look.skin, skin);
      for (const [y, z, r] of [[-0.45, 0.01, 0.013], [-0.7, -0.012, 0.009]] as const) {
        small(hand, piece(disc(r * k, 6, 0.25, side + 3), light, { at: [side * (reach * 0.55 + 0.0012), m.hand * y, z * k], rot: [0, -side * (Math.PI / 2), 0] }));
      }
    }
  }

  // ---- hips and legs ----
  const legs = o.legs;
  const flared = skirtProfile(m, legs);
  const skirt = flared !== null;
  if (flared) {
    const { profile, hemY, bandTop } = flared;
    const geometry = lathe(profile, s.torso);
    // As deep as the hips down to below them (so a top hanging over it covers it), rounder toward the hem so the legs have room.
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const f = Math.min(1, Math.max(0, (-0.06 * k - position.getY(i)) / (-0.06 * k - hemY)));
      position.setZ(i, position.getZ(i) * (zs + (0.9 - zs) * f));
    }
    shell("pelvis", piece(geometry, (p) => (p.y < bandTop ? o.lowTrim : o.low)));
  } else {
    const hips = lathe(inflate(pelvis, LOW), s.pelvis);
    // Lit like the thighs below it, so hip and legs read as one garment with no seat panel: the normals, the seat's below
    // the hips too, tipped as the thighs taper.
    const { position, normal } = hips.attributes;
    for (let i = 0; i < position.count; i++) {
      const [x, z] = [position.getX(i), position.getZ(i)];
      const out = Math.hypot(x, z) || 1;
      normal.setXYZ(i, x / out, -0.09, z / out);
    }
    shell("pelvis", piece(hips, o.low, { scale: [1, 1, zs] }));
  }
  const thigh = limb(m.limb * 1.45, m.limb * 1.05, m.thigh, s.cap, 0, end);
  const shin = limb(m.limb * 1.05, m.limb * 0.75, m.shin, s.cap, 0, end);
  const fit = legs === "jeans" ? 0.009 : legs === "chinos" ? 0.006 : legs === "track" ? 0.011 : LOW;
  for (const [side, at] of SIDES) {
    const [hip, knee] = [`thigh${at}`, `shin${at}`] as const;
    // Track pants carry a stripe down the outer side.
    const stripe = (profile: Profile): Paint => (legs === "track" ? (p) => (p.x * side > radiusAt(profile, p.y) * 0.75 ? o.lowTrim : o.low) : o.low);
    if (legs === "shorts") {
      shell(hip, piece(lathe(thigh, s.leg), skin));
      const cover = inflate(limb(m.limb * 1.45, m.limb * 1.05, m.thigh, s.cap, 0, 0.62), LOW);
      shell(hip, piece(lathe(cover, s.leg), o.low));
      small(hip, piece(band(cover[0][0] + 0.003, -m.thigh * 0.62 + 0.01 * k, 0.02 * k, s.leg), o.lowTrim));
    } else {
      // A skirt's lap: hidden inside it when standing, the skirt over the knees when seated.
      const covered = inflate(thigh, skirt ? LOW + 0.01 : fit);
      shell(hip, piece(lathe(covered, s.leg), stripe(covered)));
    }
    if (legs === "shorts" || legs === "midi") {
      shell(knee, piece(lathe(shin, s.leg), skin));
    } else if (legs === "wide-leg") {
      const flare = limb(m.limb * 1.05 + LOW, m.limb * 1.75, m.shin, s.cap, 0, 0.97);
      shell(knee, piece(lathe(flare, s.leg), o.low));
      small(knee, piece(band(flare[0][0] + 0.002, -m.shin * 0.95, 0.025 * k, s.leg), o.lowTrim));
    } else {
      const covered = inflate(shin, legs === "maxi" ? LOW + 0.01 : fit);
      shell(knee, piece(lathe(covered, s.leg), stripe(covered)));
      const cuff = legs === "jeans" ? 0.035 : legs === "chinos" || legs === "track" || o.top === "jumpsuit" ? 0.014 : 0;
      if (cuff) small(knee, piece(band(m.limb * 0.75 + fit + 0.004, -m.shin + cuff * k * 0.5, cuff * k, s.leg), o.lowTrim));
    }
  }

  // ---- feet ----
  for (const [side, at] of SIDES) feet(out, `foot${at}` as const, look, m, near, skin, side);
  return out;
}

/**
 * A foot lying along -Z, centred at (0, y, z): the foot itself, and each shoe built over it. Shaped (the default), it
 * is flat underneath with its upper rising from a low, rounded toe to a full heel; unshaped, a rounded slab (a sole).
 */
function footShape(length: number, halfWidth: number, height: number, y: number, z: number, near: boolean, segments: number, shaped = true): BufferGeometry {
  const [l, w] = [length / 2, halfWidth];
  const [start, wide] = footTurn(near, segments);
  const profile: Profile = near
    ? [[0, -l], [w * 0.75, -l + w * 0.35], [w, -l + w], [w, l - w], [w * 0.75, l - w * 0.35], [0, l]]
    : [[0, -l], [w * wide, -0.5 * l], [w * wide, 0.5 * l], [0, l]];
  // Turned so the profile's top is the toe (-Z), and flattened to the foot's height.
  const geometry = lathe(profile, segments, start).applyMatrix4(matrixOf({ at: [0, y, z], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, height / (2 * w)] }));
  return shaped ? shod(geometry, y, z, l, height / 2) : geometry;
}

/**
 * Where a foot's sides start round it, and how much wider they are cut. Beyond 8 m its four sides are turned half a
 * side and widened to keep its width, so the shoe stands flat on its sole with a flat top: a shoe, not a diamond.
 */
const footTurn = (near: boolean, segments: number): [number, number] => (near ? [0, 1] : [Math.PI / segments, 1 / Math.cos(Math.PI / segments)]);

/** How high a shoe's upper stands at `toe` (0 at the heel, 1 at the toe), as a share of the foot's height above its sole. */
const upperAt = (toe: number) => 0.3 + 1.7 * (1 - 0.55 * toe * toe);

/**
 * Bends a shape made round a foot's centre line (height y, middle z, half-length l, half-height a) into a shoe's:
 * flat soled, low at the toe and full at the heel, a little wider across the toes. Straps go through it too, so they
 * stay on the foot.
 */
function shod(geometry: BufferGeometry, y: number, z: number, l: number, a: number): BufferGeometry {
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const toe = Math.min(1, Math.max(0, ((z - p.getZ(i)) / l) * 0.5 + 0.5));
    const dy = p.getY(i) - y;
    const up = dy < 0 ? 0.3 * (a + dy) : 0.3 * a + (upperAt(toe) - 0.3) * dy;
    p.setXYZ(i, p.getX(i) * (0.9 + 0.15 * toe), y - a + up, p.getZ(i));
  }
  geometry.computeVertexNormals();
  // Vertices in one place (a lathe's seam, its tips) share one normal, so no crease shows down the top of the shoe.
  const { normal } = geometry.attributes;
  const sums = new Map<string, Vector3>();
  const key = (i: number) => `${p.getX(i).toFixed(5)} ${p.getY(i).toFixed(5)} ${p.getZ(i).toFixed(5)}`;
  for (let i = 0; i < p.count; i++) {
    const sum = sums.get(key(i)) ?? sums.set(key(i), new Vector3()).get(key(i))!;
    sum.x += normal.getX(i);
    sum.y += normal.getY(i);
    sum.z += normal.getZ(i);
  }
  for (let i = 0; i < p.count; i++) {
    const n = sums.get(key(i))!.clone().normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  return geometry;
}

function feet(out: Dressing, joint: JointName, look: Look, m: Measurements, near: boolean, skin: string, side: number): void {
  const s = SEGMENTS[near ? "near" : "far"];
  const k = m.scale;
  const colour = hexOf("shoeColor", look.shoeColor) ?? "#331a10";
  const style = look.shoes;
  const [length, width, height] = [m.foot, m.limb * 0.85, m.ankle * 0.8];
  // Beyond 8 m the sole is not drawn, so the shoe itself stands on the floor.
  const sole = near ? (style === "boots" ? 0.02 : 0.014) * k : 0;
  const floor = -m.ankle;
  const [y, z] = [floor + sole + height / 2, -length * 0.28];
  const pieces: BufferGeometry[] = [];
  const small: BufferGeometry[] = [];
  const grow = 0.007 * k;
  if (style === "sandals") {
    pieces.push(piece(footShape(length, width, height, y, z, near, s.foot), skin));
    for (const dz of near ? [-0.25, 0.05] : [-0.1]) {
      const [start, wide] = footTurn(near, s.foot);
      const strap = new CylinderGeometry(wide, wide, 0.014 * k, s.foot, 1, true, start).applyMatrix4(matrixOf({ at: [0, y, z + dz * length], rot: [Math.PI / 2, 0, 0], scale: [width + 0.003, 1, height / 2 + 0.003] }));
      pieces.push(piece(shod(strap, y, z, length / 2, height / 2), colour));
    }
  } else {
    const low = style === "loafers" || style === "heels" ? 0.85 : 1;
    pieces.push(piece(footShape(length + 2 * grow, width + grow, (height + 2 * grow) * low, floor + sole + ((height + 2 * grow) * low) / 2, z, near, s.foot), colour));
  }
  const soleColour = style === "sneakers" || style === "high-tops" ? SOLE_LIGHT : style === "sandals" ? shade(colour, 0.75) : SOLE_DARK;
  // A rounded sole, a little larger than the shoe all round.
  if (near) pieces.push(piece(footShape(length + 0.02 * k, width + 0.008 * k, sole, floor + sole / 2, z, near, s.foot, false), soleColour));
  const ankle = m.limb * 0.75;
  if (style === "high-tops") pieces.push(piece(new CylinderGeometry(ankle + 0.016, ankle + 0.014, 0.08 * k, s.leg, 1, true), colour));
  if (style === "boots") pieces.push(piece(new CylinderGeometry(ankle + 0.014, ankle + 0.012, 0.17 * k, s.leg, 1, true), colour, { at: [0, floor * 0.5 + 0.085 * k, 0] }));
  if (style === "loafers" && near) {
    // The saddle across the instep, on the upper's curve where it crosses.
    const a = ((height + 2 * grow) * 0.85) / 2;
    const top = floor + sole + a * upperAt(0.62);
    small.push(piece(strip(new Vector3(-0.5 * width, top - 0.003, z - length * 0.12), new Vector3(0.5 * width, top - 0.003, z - length * 0.12), 0.012 * k, 0.006, new Vector3(0, 1, 0)), shade(colour, 0.6)));
  }
  if (style === "heels" && near) {
    // Raise the heel about the front of the sole, which stays on the floor, and put a low block under it.
    const lift = 0.12;
    const toe = new Vector3(0, floor, z - length / 2 - 0.01 * k);
    const tilt = new Matrix4().makeTranslation(toe.x, toe.y, toe.z).multiply(new Matrix4().makeRotationX(-lift)).multiply(new Matrix4().makeTranslation(-toe.x, -toe.y, -toe.z));
    for (const geometry of [...pieces, ...small]) geometry.applyMatrix4(tilt);
    const back = z + length * 0.38;
    const rise = (back - toe.z) * Math.sin(lift);
    pieces.push(piece(new BoxGeometry(0.035 * k, rise, 0.035 * k), shade(colour, 0.7), { at: [0, floor + rise / 2, back] }));
  }
  add(out.shell, joint, ...pieces);
  add(out.detail, joint, ...small);
}

/** Patches of vitiligo: the lightest tone of the same undertone, a little rosy, with a touch of the skin around it. */
export function vitiligo(skin: Look["skin"], hex: string): string {
  const undertone = Math.max(0, "wnc".indexOf(skin.slice(-1)));
  return mix(mix(SKIN_TONES[undertone], "#f6d9d0", 0.3), hex, 0.15);
}

/** Today's capsule figure, sized to the measurements: a body down to the floor, a round head and a nose that shows the facing. */
export function simpleBody(look: Look, m: Measurements): Dressing {
  const out = dressing();
  const skin = hexOf("skin", look.skin) ?? FALLBACK_SKIN;
  const neckBase = m.joints.pelvis[1] + m.pelvis + m.torso;
  const radius = Math.max(m.chest, m.waist) * 1.2;
  add(out.shell, "pelvis", piece(new CapsuleGeometry(radius, neckBase - 2 * radius, 3, 10), hexOf("topColor", look.topColor) ?? "#d9a441", { at: [0, neckBase / 2 - m.joints.pelvis[1], 0] }));
  add(
    out.shell,
    "head",
    piece(new SphereGeometry(m.head / 2, 12, 9), skin, { at: [0, m.head / 2, 0] }),
    piece(new ConeGeometry(0.05 * m.scale, 0.12 * m.scale, 6), shade(skin, 0.8), { at: [0, m.head * 0.45, -m.head / 2 - 0.03 * m.scale], rot: [-Math.PI / 2, 0, 0] }),
  );
  return out;
}
