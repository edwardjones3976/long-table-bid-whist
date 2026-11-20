/**
 * Body measurements from a look's build and height. Every part (body, face, clothes, hair) is shaped
 * from these numbers, which is why every garment fits every body with no per-body work.
 *
 *   const m = measure(look)
 *   m.height, m.head, m.shoulder, m.limb ...   metres
 *   m.joints.foreArmL                           where that joint sits on its parent
 *   m.ear                                       the left ear in head space; the right one mirrors it (x -> -x)
 *
 * About five heads tall with a slightly large head, soft rounded forms and short, simple legs. Head space
 * starts at the chin with y up to the crown at m.head. Left is -X and the front is -Z, as in figure.ts.
 */
import type { Look } from "../../../shared/avatar";
import type { JointName } from "./figure";

export interface Measurements {
  height: number;
  /** Height over the middle height (1.65 m): widths and lengths grow with it. */
  scale: number;
  /** Chin to crown, and the head's half-width and half-depth. */
  head: number;
  headWidth: number;
  headDepth: number;
  neck: number;
  neckRadius: number;
  /** Half-widths: out to the shoulder's edge, the chest, the waist and the hips. */
  shoulder: number;
  chest: number;
  waist: number;
  hip: number;
  /** Front-to-back over side-to-side for the torso and hips, whose cross-sections are ellipses. */
  depth: number;
  /** Radius of the upper arm; every other limb is sized from it. */
  limb: number;
  pelvis: number;
  torso: number;
  upperArm: number;
  foreArm: number;
  hand: number;
  thigh: number;
  shin: number;
  /** Height of the ankle joint above the floor, and the foot's length. */
  ankle: number;
  foot: number;
  joints: Record<JointName, [number, number, number]>;
  ear: [number, number, number];
}

/** Standing height in metres for each height option. */
export const HEIGHT_M: Record<Look["height"], number> = { shortest: 1.5, short: 1.58, middle: 1.65, tall: 1.73, tallest: 1.82 };

/** At the middle height. Round carries its weight at the waist and in depth. */
const BUILDS: Record<Look["build"], { shoulder: number; chest: number; waist: number; hip: number; depth: number; limb: number }> = {
  slender: { shoulder: 0.175, chest: 0.135, waist: 0.115, hip: 0.13, depth: 0.68, limb: 0.038 },
  medium: { shoulder: 0.195, chest: 0.155, waist: 0.14, hip: 0.145, depth: 0.7, limb: 0.044 },
  broad: { shoulder: 0.23, chest: 0.185, waist: 0.16, hip: 0.16, depth: 0.7, limb: 0.054 },
  round: { shoulder: 0.205, chest: 0.18, waist: 0.19, hip: 0.18, depth: 0.82, limb: 0.052 },
};

export function measure(look: Pick<Look, "build" | "height">): Measurements {
  const height = HEIGHT_M[look.height];
  const k = height / 1.65;
  const b = BUILDS[look.build];
  // The head grows half as fast as the body, so tall figures are not all head.
  const head = 0.33 * (0.5 + 0.5 * k);
  const neck = 0.06 * k;
  const body = height - head - neck;
  const legs = body * 0.52;
  const pelvis = body * 0.09;
  const torso = body - legs - pelvis;
  const thigh = legs * 0.47;
  const shin = legs * 0.43;
  const [shoulder, hip, limb] = [b.shoulder * k, b.hip * k, b.limb * k];
  const [upperArm, foreArm] = [0.27 * k, 0.24 * k];
  const arm = (side: number): [number, number, number] => [side * (shoulder - limb), torso - 0.05 * k, 0];
  const leg = (side: number): [number, number, number] => [side * hip * 0.55, 0, 0];
  const headWidth = head * 0.42;
  return {
    height,
    scale: k,
    head,
    headWidth,
    headDepth: head * 0.46,
    neck,
    neckRadius: head * 0.15 + (b.limb - 0.044) * 0.8,
    shoulder,
    chest: b.chest * k,
    waist: b.waist * k,
    hip,
    depth: b.depth,
    limb,
    pelvis,
    torso,
    upperArm,
    foreArm,
    hand: 0.13 * k,
    thigh,
    shin,
    ankle: legs - thigh - shin,
    foot: 0.19 * k,
    joints: {
      pelvis: [0, legs, 0],
      torso: [0, pelvis, 0],
      neck: [0, torso, 0],
      head: [0, neck, 0],
      upperArmL: arm(-1),
      foreArmL: [0, -upperArm, 0],
      handL: [0, -foreArm, 0],
      upperArmR: arm(1),
      foreArmR: [0, -upperArm, 0],
      handR: [0, -foreArm, 0],
      thighL: leg(-1),
      shinL: [0, -thigh, 0],
      footL: [0, -shin, 0],
      thighR: leg(1),
      shinR: [0, -thigh, 0],
      footR: [0, -shin, 0],
    },
    ear: [-headWidth * 0.97, head * 0.46, head * 0.04],
  };
}
