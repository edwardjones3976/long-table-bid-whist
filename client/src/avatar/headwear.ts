/**
 * Head coverings: hijab, turban, headwrap, durag, crown hat and beanie, each in its garment colour.
 *
 *   headwear(look, m, "near")   pieces for the head (and, for the hijab, the neck) joint in their own space;
 *                               any covering tucks the hair
 *   HIJAB_SIDE                  how far the hijab stands off the head at the temples, for glasses worn over it
 *
 * Every covering clears the tucked hair (hair.ts TUCKED_LIFT plus the sag of its own facets) and reaches
 * past the natural hairline, so no hair shows through or below it, except a beanie or a crown hat over an afro: it sits
 * up on the hair (hair.ts PERCH) and the afro puffs out below it. All but the hijab stop above the ears,
 * which stay clear with anything worn behind them; the hijab covers the ears and neck and frames the face, lined
 * inside in a deeper shade so the face opening shows cloth. Patterns are plain folds, ribs, seams and bands made in
 * the vertex colours.
 */
import { SphereGeometry, Vector3, type BufferGeometry } from "three";
import { hexOf, type Look } from "../../../shared/avatar";
import type { Detail } from "./figure";
import { cell, fromFace, grid, HAIRLINE, layer, PERCH, PUFFS, scalp, type Scalp } from "./hair";
import type { Measurements } from "./measure";
import { add, dressing, lathe, mix, piece, shade, strip, type Dressing, type Paint } from "./shapes";

const TAU = Math.PI * 2;
const RIM = 0.003;
/** A covering's edge: past the natural hairline all round, still above the ears. */
const cover = (phi: number) => HAIRLINE(fromFace(phi)) + 0.06;

export const HIJAB_SIDE = 0.022;

interface Wear {
  m: Measurements;
  head: Scalp;
  near: boolean;
  cols: number;
  /** The least lift off the head that clears tucked hair at this detail. */
  base: number;
  colour: string;
  /** A hat-like covering's lower edge, t by f (Dressing.hatEdge). */
  hatEdge?: (f: number) => number;
  /** Sitting up on an afro (hair.ts PERCH). */
  perched: boolean;
  shell: (...pieces: BufferGeometry[]) => void;
  /** Not outlined. */
  detail: (...pieces: BufferGeometry[]) => void;
  neck: (...pieces: BufferGeometry[]) => void;
}

/** The hijab's face opening runs from the forehead round to below the jaw, out to F0 from the face either side. */
const F0 = 0.42 * Math.PI;
/** Down the hood: t on the head to its widest, then a further 1 tapering in to the drape below the jaw. */
const HOOD_END = Math.PI / 2 + 1;

function hijab(w: Wear): void {
  const { m, head, near } = w;
  const half = m.head / 2;
  // The drape round the neck (neck space), from the base of the neck up round the jaw.
  const neckBase = m.neckRadius * 1.25 + 0.03;
  const jawY = 0.05;
  const jawR = m.headWidth * Math.sqrt(1 - (jawY / half - 1) ** 2) * (1 - 0.22 * (jawY / half - 1) ** 2) + 0.012;
  // It flares over the top of the shoulders, above the arms of every build.
  const drape = lathe([[Math.max(neckBase, m.chest * 0.8), 0.004], [Math.max(m.neckRadius + 0.03, jawR * 0.85), m.neck * 0.6], [jawR, m.neck + jawY]], near ? 12 : 6);
  // Deep like the body at the bottom, like the head at the top.
  const position = drape.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const s = Math.min(1, Math.max(0, position.getY(i) / (m.neck + jawY)));
    position.setZ(i, position.getZ(i) * (0.85 + (m.headDepth / m.headWidth - 0.85) * s));
  }
  drape.computeVertexNormals();
  w.neck(piece(drape, w.colour));

  const lift = (s: number) => w.base + 0.004 + (HIJAB_SIDE - w.base - 0.004) * Math.sin(Math.min(s, Math.PI / 2)) ** 4;
  const opening = (f: number) => (f < F0 ? Math.max(HAIRLINE(f) + 0.06, 1.2 + (HOOD_END - 1.2) * (f / F0) ** 3) : HOOD_END);
  const rows = near ? 6 : 3;
  const point = (phi: number, s: number) => {
    if (s <= Math.PI / 2) return head.at(phi, s, lift(s));
    // Below its widest the hood tapers in round the jaw to just outside the drape, slowly at first to pass the ears.
    const k = s - Math.PI / 2;
    const widest = head.at(phi, Math.PI / 2, lift(s));
    const under = new Vector3((jawR + 0.008) * Math.sin(phi), 0, (jawR + 0.008) * (m.headDepth / m.headWidth) * Math.cos(phi));
    return new Vector3(widest.x + (under.x - widest.x) * k * k, half + (0.03 - half) * k, widest.z + (under.z - widest.z) * k * k);
  };
  const hood = grid(w.cols, rows, (i, j) => (j === 0 ? head.at(0, 0, lift(0)) : point((TAU * i) / w.cols, (opening(fromFace((TAU * i) / w.cols)) * j) / rows)), true);
  // The last row round the face is a contrasting trim, a light cream over the cloth's own colour: a hem, never gold or
  // ochre, so it never reads as hair.
  const band = mix(w.colour, "#f1ead9", 0.55);
  const paint: Paint = (_, n) => {
    const [i, j] = cell(n, w.cols);
    return j === rows - 1 && fromFace((TAU * (i + 0.5)) / w.cols) < F0 ? band : w.colour;
  };
  w.shell(piece(hood, paint));
  // Up close, a lining: the hood again facing inward, so the face opening shows cloth rather than the outline behind it.
  if (!near) return;
  const lining = hood.clone();
  const index = lining.index!;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    index.setX(i, index.getX(i + 1));
    index.setX(i + 1, a);
  }
  lining.computeVertexNormals();
  w.detail(piece(lining, shade(w.colour, 0.72)));
}

/**
 * Wrapped round and up, tall, in deep diagonal folds that meet at the front: never one more dome. Up close the folds
 * end on a band of their own, round the forehead and over the ears, standing a little proud of them.
 */
function turban(w: Wear): void {
  const edge = w.near ? (phi: number) => cover(phi) - 0.15 : cover;
  const band = (phi: number, u: number) => Math.floor(5 * u + (2 * fromFace(phi)) / Math.PI) % 2;
  const lift = (phi: number, _: number, u: number) => w.base + 0.006 + 0.06 * Math.sqrt(1 - u * u) + 0.012 * band(phi, u);
  const paint: Paint = (at) => {
    const [phi, t] = w.head.angles(at);
    return band(phi, t / edge(phi)) ? shade(w.colour, 0.65) : w.colour;
  };
  // Up close the folds end on the band's top face, which closes them.
  w.shell(piece(layer(w.head, w.cols, w.near ? 5 : 2, edge, lift, w.near ? 0 : RIM), paint));
  if (!w.near) return;
  const proud = w.base + 0.024;
  const rim = grid(w.cols, 3, (i, j) => {
    const phi = (TAU * i) / w.cols;
    return [w.head.at(phi, edge(phi), w.base), w.head.at(phi, edge(phi), proud), w.head.at(phi, cover(phi), proud), w.head.at(phi, cover(phi), RIM)][j];
  });
  w.shell(piece(rim, mix(w.colour, "#f1ead9", 0.2)));
}

/** Snug at the sides, rising tall behind the crown, tied at the front in a knot with two wings. */
function headwrap(w: Wear): void {
  // Domed on top (no point at the crown), fullest toward the back.
  const lift = (phi: number, _: number, u: number) => w.base + 0.008 + (0.03 + 0.03 * ((Math.cos(phi) + 1) / 2)) * (1 - u * u);
  const paint: Paint = (at) => {
    const [phi, t] = w.head.angles(at);
    return Math.floor((6 * t) / cover(phi) + 0.3 * Math.sin(phi)) % 2 ? shade(w.colour, 0.85) : w.colour;
  };
  w.shell(piece(layer(w.head, w.cols, w.near ? 6 : 2, cover, lift, RIM), paint));
  if (!w.near) return;
  const knot = w.head.at(Math.PI, 0.55, lift(Math.PI, 0.55, 0.55 / cover(Math.PI)));
  const ball = new SphereGeometry(1, 6, 3);
  const deep = shade(w.colour, 0.8);
  w.shell(piece(ball.clone(), deep, { at: [knot.x, knot.y, knot.z], scale: 0.02 }));
  for (const side of [-1, 1]) {
    w.shell(piece(ball.clone(), w.colour, { at: [knot.x + side * 0.03, knot.y + 0.012, knot.z + 0.008], rot: [0.3, 0, side * 0.55], scale: [0.036, 0.02, 0.012] }));
  }
}

/** Close and smooth with a seam down the middle, tied at the back, its two tails lying down the upper back. */
function durag(w: Wear): void {
  // A broad shine down the seam and a deeper band along the front edge, so it reads as cloth, not as hair.
  const [shine, edge] = [mix(w.colour, "#ffffff", 0.22), shade(w.colour, 0.6)];
  const paint: Paint = (at) => {
    const [phi, t] = w.head.angles(at);
    if (fromFace(phi) < 0.45 * Math.PI && t / cover(phi) > 0.8) return edge;
    return Math.abs(Math.sin(phi)) < 0.22 ? shine : w.colour;
  };
  w.shell(piece(layer(w.head, w.cols, w.near ? 4 : 2, cover, () => w.base, RIM), paint));
  const back = w.m.chest * w.m.depth + 0.018;
  // Beyond 8 m the two tails read as one band.
  for (const side of w.near ? [-1, 1] : [0]) {
    const top = w.head.at(side * 0.07 * Math.PI, 1.85, w.base);
    const middle = new Vector3(top.x * 1.2, -0.05, Math.max(top.z, back));
    const end = new Vector3(top.x * 1.5, -0.22, back + 0.008);
    const segments = w.near ? [[top, middle], [middle, end]] : [[top, end]];
    for (const [from, to] of segments) w.shell(piece(strip(from, to, w.near ? 0.035 : 0.06, 0.004, new Vector3(0, 0, 1)), w.colour));
  }
}

/** A rounded crown with a band and a bow, over a wide brim. */
function crownHat(w: Wear): void {
  const { m, near } = w;
  const h = m.head;
  const yb = (h / 2) * (1 + Math.cos(w.hatEdge!(0)));
  const rb = m.headWidth * Math.sqrt(1 - (yb / (h / 2) - 1) ** 2) + w.base + 0.012;
  const zs = m.headDepth / m.headWidth;
  const band = shade(w.colour, 0.6);
  // A ring exactly at the band's top edge, so the band's triangles stop on a straight line.
  const crown = near
    ? [[rb, yb - 0.004], [rb + 0.004, yb + 0.028], [rb - 0.006, h + 0.035], [rb * 0.6, h + 0.06], [0, h + 0.066]] as const
    : [[rb, yb - 0.004], [rb, yb + 0.028], [rb, h + 0.03], [0, h + 0.06]] as const;
  w.shell(piece(lathe(crown, w.cols), (at) => (at.y < yb + 0.028 ? band : w.colour), { scale: [1, 1, zs] }));
  // Its profile runs underneath outward, round the rim, then back in on top, so each face looks out of the brim.
  // On an afro the brim is narrower, still the widest of the hats, so the afro shows past it from the front.
  const reach = w.perched ? 0.07 : 0.11;
  const brim = near
    ? [[rb - 0.003, yb - 0.006], [rb + reach, yb - 0.022], [rb + reach, yb - 0.016], [rb - 0.003, yb + 0.002]] as const
    : [[rb - 0.003, yb - 0.006], [rb + reach - 0.01, yb - 0.02], [rb - 0.003, yb + 0.002]] as const;
  w.shell(piece(lathe(brim, near ? 12 : 6), w.colour, { scale: [1, 1, zs] }));
  if (!near) return;
  const phi = 1.35 * Math.PI;
  const r = rb + 0.008;
  const at = (out: number, dy: number, along: number): [number, number, number] => [
    (r + out) * Math.sin(phi + along),
    yb + 0.016 + dy,
    (r + out) * zs * Math.cos(phi + along),
  ];
  const ball = new SphereGeometry(1, 5, 3);
  w.shell(piece(ball.clone(), band, { at: at(0.004, 0, 0), scale: 0.011 }));
  for (const side of [-1, 1]) w.shell(piece(ball.clone(), band, { at: at(0, 0.004, side * 0.17), rot: [0, phi, side * 0.4], scale: [0.026, 0.014, 0.007] }));
}

/** A knit cap with ribs, a turned-up cuff and a little slouch; over an afro it sits up on the hair like a cap. */
function beanie(w: Wear): void {
  const edge = (phi: number) => w.hatEdge!(fromFace(phi));
  // The cuff stands out a step and a shade deeper, and the ribs show, so it reads as knit, not as hair.
  const lift = (_: number, __: number, u: number) => w.base + 0.004 + 0.012 * (1 - u) ** 2 + (u > 0.72 ? 0.008 : 0);
  const paint: Paint = (at) => {
    const [phi, t] = w.head.angles(at);
    const rib = Math.floor((phi * w.cols) / TAU) % 2;
    const cuff = t / edge(phi) > 0.72;
    return shade(w.colour, (rib ? 0.8 : 1) * (cuff ? 0.72 : 1));
  };
  w.shell(piece(layer(w.head, w.cols, w.near ? 5 : 2, edge, lift, RIM), paint));
}

const COVERINGS: Record<Exclude<Look["headwear"], "none">, (w: Wear) => void> = {
  hijab,
  turban,
  headwrap,
  durag,
  "crown-hat": crownHat,
  beanie,
};

export function headwear(look: Look, m: Measurements, detail: Detail): Dressing {
  const out: Dressing = { ...dressing(), tucksHair: look.headwear !== "none" };
  if (look.headwear === "none" || detail === "simple") return out;
  // Like the hats: long hair hangs below a crown hat's band or a beanie's cuff, and an afro puffs out below them,
  // the crown hat sitting up on it (as hair.ts PERCH) so the afro shows below its brim.
  const perched = PUFFS.includes(look.hair);
  if (look.headwear === "crown-hat") {
    const band = perched ? 0.76 : 0.68;
    out.hatEdge = () => Math.acos(2 * band - 1);
    out.hatDrop = () => 0.022;
  }
  if (look.headwear === "beanie") out.hatEdge = (f) => Math.min(HAIRLINE(f) + 0.06, perched ? PERCH(f) : Infinity);
  const near = detail === "near";
  COVERINGS[look.headwear]({
    m,
    perched,
    head: scalp(m),
    near,
    cols: near ? 12 : 6,
    base: near ? 0.011 : 0.021,
    colour: hexOf("headwearColor", look.headwearColor) ?? "#6e2a5c",
    hatEdge: out.hatEdge,
    shell: (...pieces) => add(out.shell, "head", ...pieces),
    detail: (...pieces) => add(out.detail, "head", ...pieces),
    neck: (...pieces) => add(out.shell, "neck", ...pieces),
  });
  return out;
}
