/**
 * Accessories: glasses, earrings, a necklace, a watch or bracelets, and the cap, bucket hat and fedora.
 *
 *   accessories(look, m, "near")   pieces for the head, torso and hand joints in their own space, and
 *                                  whether a hat means the hair must use its tucked version
 *
 * Looks come through cleanLook, which keeps one of each kind (glasses, earrings, hats) and at most three.
 * Should two hats arrive anyway, the first is worn and the second ignored.
 *
 * Glasses sit in front of the eyes with their arms over the ears (into the cloth at the temples when a hijab is worn);
 * earrings hang from the lobes, in front of any hearing aid or processor; the chain lies round the base of
 * the neck over any top; the watch goes on the left wrist and bracelets on the right, just below any
 * sleeve. Hats sit over tucked hair (and over a durag) in the head-covering colour, above the ears, and say where
 * their lower edge is (Dressing.hatEdge), so long hair can hang below it and an afro puff out below it (a cap
 * or bucket hat sits up on an afro, hair.ts PERCH). Under
 * a hijab the earrings and chain are hidden, so they are not drawn. Beyond 8 m only hats are drawn.
 */
import { CatmullRomCurve3, CylinderGeometry, Matrix4, OctahedronGeometry, RingGeometry, SphereGeometry, TubeGeometry, Vector3, type BufferGeometry } from "three";
import { hexOf, type Look } from "../../../shared/avatar";
import { earShape } from "./face";
import type { Detail } from "./figure";
import { fromFace, curve, grid, layer, PERCH, PUFFS, scalp, type Scalp } from "./hair";
import { HIJAB_SIDE } from "./headwear";
import type { Measurements } from "./measure";
import { add, dressing, lathe, piece, shade, tube, type Dressing, type Paint } from "./shapes";

type Accessory = Look["accessories"][number];
type Glasses = Extract<Accessory, `glasses-${string}`>;
type Hat = "cap" | "bucket" | "fedora";

const TAU = Math.PI * 2;
const GOLD = "#d6a32b";
const HATS: readonly Accessory[] = ["cap", "bucket", "fedora"];

/** Half-width and half-height of each lens (metres for a middle-sized head), how square its corners are, the rim's width and colour. */
const FRAMES: Record<Glasses, { a: number; b: number; n: number; rim: number; colour: string }> = {
  "glasses-round": { a: 0.03, b: 0.03, n: 2, rim: 0.0065, colour: "#5a3a24" },
  "glasses-square": { a: 0.029, b: 0.026, n: 4, rim: 0.007, colour: "#16110f" },
  "glasses-cat": { a: 0.032, b: 0.021, n: 3, rim: 0.007, colour: "#5b1b2b" },
  "glasses-rect": { a: 0.034, b: 0.021, n: 4, rim: 0.0065, colour: "#2e3136" },
  "glasses-wire": { a: 0.026, b: 0.025, n: 2, rim: 0.0022, colour: "#c8963e" },
};

interface Kit {
  look: Look;
  m: Measurements;
  head: Scalp;
  near: boolean;
  /** Head sizes relative to the middle height's. */
  s: number;
  out: Dressing;
}

const xyz = (v: Vector3) => [v.x, v.y, v.z] as const;
const ring = (points: readonly Vector3[], radius: number, along: number) => new TubeGeometry(new CatmullRomCurve3([...points], true), along, radius, 3, true);

/** Lenses' frames flat in front of the eyes, a bridge over the nose, and arms back over the ears. */
function glasses(k: Kit, id: Glasses): void {
  const { m, s } = k;
  const frame = FRAMES[id];
  const [a, b, rim] = [frame.a * s, frame.b * s, frame.rim * s];
  const h = m.head;
  const [cx, cy] = [0.17 * h, 0.48 * h];
  const faceZ = (x: number, y: number) => -m.headDepth * Math.sqrt(Math.max(0, 1 - (x / m.headWidth) ** 2 - (y / (h / 2) - 1) ** 2));
  const cz = faceZ(cx, cy) - 0.02 * s;
  const tilt = 0.18;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const lens = new RingGeometry(1 - rim / Math.min(a, b), 1, 12, 1).rotateY(Math.PI);
    const position = lens.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const [x, y] = [position.getX(i), position.getY(i)];
      const [r, angle] = [Math.hypot(x, y), Math.atan2(y, x)];
      const [c, n] = [Math.cos(angle), Math.sin(angle)];
      const power = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / frame.n);
      // A cat-eye's upper outer corner sweeps up and out into a wing.
      const flick = id === "glasses-cat" && c * side > 0 && n > 0 ? 1 + 1.4 * (c * side * n) ** 1.5 : 1;
      position.setXYZ(i, r * a * power(c) * (1 + 0.3 * (flick - 1)), r * b * power(n) * flick, 0);
    }
    // Outer edges turned back a little, round the face.
    parts.push(piece(lens, frame.colour, new Matrix4().makeTranslation(side * cx, cy, cz).multiply(new Matrix4().makeRotationY(-side * tilt))));
  }
  const edge = (side: number, along: number, up: number) => new Vector3(side * (cx + along * Math.cos(tilt)), cy + up, cz + along * Math.sin(tilt));
  const bridge = [edge(-1, -a + rim / 2, 0.004 * s), new Vector3(0, cy + 0.008 * s, Math.min(cz, faceZ(0, cy) - 0.016 * s)), edge(1, -a + rim / 2, 0.004 * s)];
  const thin = id === "glasses-wire" ? 0.0011 : 0.0018;
  parts.push(piece(tube(bridge.map(xyz), thin * s, 2, 3), frame.colour));
  // Over the ear tops; with a hijab, into the cloth at the temples, ending well inside it (past the sag of its facets).
  const hijab = k.look.headwear === "hijab";
  const earTop = m.ear[1] + earShape(k.look.ears, m, 1).half[1];
  for (const side of [-1, 1]) {
    const arm = hijab
      ? [edge(side, a - rim / 2, 0.004 * s), k.head.toward(side * 0.98, 0.06, -0.12, HIJAB_SIDE - 0.008)]
      : [edge(side, a - rim / 2, 0.004 * s), k.head.toward(side * 0.97, 0.06, -0.25, 0.004), new Vector3(side * (-m.ear[0] + 0.002), earTop + 0.003, m.ear[2])];
    parts.push(piece(tube(arm.map(xyz), thin * s, 3, 3), frame.colour));
  }
  add(k.out.detail, "head", ...parts);
}

/** Studs, hoops or drops at each lobe, in front of anything worn behind the ear. */
function earrings(k: Kit, id: "studs" | "hoops" | "drops"): void {
  const { m, s } = k;
  const high = earShape(k.look.ears, m, 1).half[1];
  for (const side of [-1, 1]) {
    const lobe = new Vector3(side * (-m.ear[0] + 0.007 * s), m.ear[1] - high * 0.8, m.ear[2] - 0.004 * s);
    // A hoop passes through the lobe itself; studs and drops sit on it.
    const parts = id === "hoops" ? [] : [piece(new OctahedronGeometry(0.0042 * s), GOLD, { at: xyz(lobe) })];
    if (id === "hoops") {
      // Hanging edge-on to the face, so they show from the front and the side.
      const r = 0.018 * s;
      const centre = lobe.clone().add(new Vector3(side * 0.002, -r, 0));
      const loop = Array.from({ length: 8 }, (_, i) => centre.clone().add(new Vector3(0, r * Math.cos((i * TAU) / 8), r * Math.sin((i * TAU) / 8))));
      parts.push(piece(ring(loop, 0.0021 * s, 6), GOLD));
    }
    if (id === "drops") {
      const pearl = lobe.clone().add(new Vector3(side * 0.001, -0.017 * s, 0));
      parts.push(piece(tube([xyz(lobe), xyz(pearl)], 0.0008 * s, 1, 3), GOLD));
      parts.push(piece(new SphereGeometry(0.0062 * s, 5, 4), "#f1ead9", { at: xyz(pearl), scale: [1, 1.15, 1] }));
    }
    add(k.out.detail, "head", ...parts);
  }
}

/** A gold chain round the base of the neck, dipping in front, over the top of any garment. */
function necklace(k: Kit): void {
  const { m } = k;
  const t = m.torso;
  // The shoulders' slope as body.ts draws the torso (its torsoProfile), and the thickest top over it.
  const radius = curve([[0.86 * t, m.chest * 0.96], [0.96 * t, m.chest * 0.72], [t + 0.005, m.neckRadius * 1.25]]);
  const loop = Array.from({ length: 12 }, (_, i) => {
    const a = (i * TAU) / 12;
    const y = t - 0.008 - 0.07 * m.scale * ((1 - Math.cos(a)) / 2) ** 2;
    const r = radius(y);
    return new Vector3((r + 0.016) * Math.sin(a), y, (r * m.depth + 0.016) * Math.cos(a));
  });
  const links: Paint = (_, n) => (Math.floor(n / 6) % 2 ? GOLD : shade(GOLD, 0.75));
  add(k.out.detail, "torso", piece(ring(loop, 0.0036 * k.s, 10), links));
}

/** At the top of the hand joint, just below the end of any sleeve. */
const wristRadius = (m: Measurements) => m.limb * 0.68 * 1.05 + 0.005;

function watch(k: Kit): void {
  const r = wristRadius(k.m);
  const band = new CylinderGeometry(r, r, 0.012 * k.s, 8, 1, true).translate(0, -0.006, 0);
  // The face on the back of the left wrist, outward (-X).
  const face = new CylinderGeometry(0.011 * k.s, 0.011 * k.s, 0.005, 6).rotateZ(Math.PI / 2).translate(-(r + 0.002), -0.006, 0);
  add(k.out.detail, "handL", piece(band, "#3b2a20"), piece(face, (at) => (at.x < -(r + 0.0035) ? "#f4f1ea" : GOLD)));
}

function bracelets(k: Kit): void {
  const r = wristRadius(k.m);
  const bangle = (extra: number, y: number, colour: string) => piece(new CylinderGeometry(r + extra, r + extra, 0.005 * k.s, 8, 1, true).translate(0, y, 0), colour);
  add(k.out.detail, "handR", bangle(0.001, -0.003, GOLD), bangle(0.003, -0.01, "#b5652d"));
}

/** A ring round the hat's edge, its profile turned out and down by `drop` (metres up, by f), closed underneath: brims and visors. */
function brim(k: Kit, phis: readonly number[], inner: (phi: number) => Vector3, width: number, drop: (f: number) => number, thick: number): BufferGeometry {
  const rows = k.near ? 3 : 1;
  return grid(phis.length - 1, rows, (i, j) => {
    const at = inner(phis[i]);
    const out = new Vector3(at.x, 0, at.z).normalize();
    const outer = at.clone().addScaledVector(out, width).add(new Vector3(0, drop(fromFace(phis[i])), 0));
    return [at, outer, outer.clone().setY(outer.y - thick), at.clone().setY(at.y - thick)][j];
  });
}

/** Caps, bucket hats and fedoras, over tucked hair and over a durag. */
function hat(k: Kit, id: Hat): void {
  const { m, head, near } = k;
  const colour = hexOf("headwearColor", k.look.headwearColor) ?? "#1d2b53";
  const lift = (near ? 0.014 : 0.024) + (k.look.headwear === "durag" ? 0.012 : 0);
  const cols = near ? 12 : 6;
  const around = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
  const shell = (...pieces: BufferGeometry[]) => add(k.out.shell, "head", ...pieces);
  // Over an afro a cap or bucket hat sits up on the hair, so the afro shows below its brim (the fedora's band is high enough already).
  const perch = (edge: (f: number) => number) => (PUFFS.includes(k.look.hair) ? (f: number) => Math.min(edge(f), PERCH(f)) : edge);
  if (id === "cap") {
    const edge = perch(curve([[0, 1.18], [0.5 * Math.PI, 1.3], [Math.PI, 1.45]]));
    k.out.hatEdge = edge;
    // Only the visor, over the front, has a brim.
    k.out.hatDrop = (f) => (f < 0.3 * Math.PI ? 0.017 : 0);
    const panels: Paint = (at) => (Math.floor((head.angles(at)[0] * 6) / TAU) % 2 ? shade(colour, 0.88) : colour);
    shell(piece(layer(head, cols, near ? 3 : 2, (phi) => edge(fromFace(phi)), () => lift, 0.003), panels));
    // The visor reaches forward over the face, curved round the forehead.
    const visor = brim(k, around(0.7 * Math.PI, 1.3 * Math.PI, near ? 4 : 2), (phi) => head.at(phi, edge(fromFace(phi)), lift), 0.065 * k.s, () => -0.012, 0.005);
    shell(piece(visor, shade(colour, 0.9)));
    if (near) shell(piece(new SphereGeometry(0.007, 5, 3), colour, { at: xyz(head.at(0, 0, lift + 0.003)) }));
    return;
  }
  if (id === "bucket") {
    const edge = perch(curve([[0, 1.25], [0.5 * Math.PI, 1.38], [Math.PI, 1.45]]));
    k.out.hatEdge = edge;
    k.out.hatDrop = () => 0.035 * k.s + 0.005;
    shell(piece(layer(head, cols, near ? 3 : 2, (phi) => edge(fromFace(phi)), () => lift + 0.004), colour));
    // Sloping down all round, stitched in rings.
    const stitched: Paint = (_, n) => (Math.floor(n / (2 * cols)) === 0 ? shade(colour, 0.85) : colour);
    shell(piece(brim(k, around(0, TAU, cols), (phi) => head.at(phi, edge(fromFace(phi)), lift + 0.004), 0.05 * k.s, () => -0.035 * k.s, 0.005), stitched));
    return;
  }
  // The fedora: a crown dipping a little at the top, with a dark band, its brim snapped down in front and turned up behind.
  const h = m.head;
  const yb = 0.7 * h;
  k.out.hatEdge = () => Math.acos(yb / (h / 2) - 1);
  const turn = (f: number) => -0.012 * Math.cos(f) + 0.01 * Math.sin(f) ** 2;
  k.out.hatDrop = (f) => 0.004 - Math.min(0, turn(f));
  const rb = m.headWidth * Math.sqrt(1 - (yb / (h / 2) - 1) ** 2) + lift;
  const zs = m.headDepth / m.headWidth;
  // The crown's dip clears the top of the head by the hat's own lift, so tucked hair or a durag never shows through it.
  const top = h + lift + 0.01;
  const crown = near
    ? [[rb, yb - 0.004], [rb * 0.97, top - 0.02], [rb * 0.84, top + 0.008], [0, top]] as const
    : [[rb, yb - 0.004], [rb * 0.9, top + 0.005], [0, top]] as const;
  shell(piece(lathe(crown, cols), (at) => (at.y < yb + 0.022 ? shade(colour, 0.4) : colour), { scale: [1, 1, zs] }));
  const inner = (phi: number) => new Vector3(rb * Math.sin(phi), yb, rb * zs * Math.cos(phi));
  shell(piece(brim(k, around(0, TAU, cols), inner, 0.05 * k.s, turn, 0.004), colour));
}

/** Worn under a hijab, so not drawn: the earrings and the chain. */
export const hiddenUnder = (look: Look, id: string): boolean => look.headwear === "hijab" && ["studs", "hoops", "drops", "necklace"].includes(id);

export function accessories(look: Look, m: Measurements, detail: Detail): Dressing {
  const worn = look.accessories.find((id) => HATS.includes(id)) as Hat | undefined;
  const out: Dressing = { ...dressing(), tucksHair: worn !== undefined };
  if (detail === "simple") return out;
  const k: Kit = { look, m, head: scalp(m), near: detail === "near", s: m.head / 0.33, out };
  if (worn) hat(k, worn);
  if (!k.near) return out;
  for (const id of look.accessories) {
    if (hiddenUnder(look, id)) continue;
    if (id.startsWith("glasses-")) glasses(k, id as Glasses);
    else if (id === "studs" || id === "hoops" || id === "drops") earrings(k, id);
    else if (id === "necklace") necklace(k);
    else if (id === "watch") watch(k);
    else if (id === "bracelets") bracelets(k);
  }
  return out;
}
