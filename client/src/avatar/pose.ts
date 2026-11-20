/**
 * The pose I send to the room. On a desktop or a phone it is where I stand and face. In VR it also carries
 * my head's pitch and yaw and both hands, measured from my feet point and my body's facing, within the
 * limits in shared/avatar.ts (the server clamps them again).
 *
 *   bodyYaw(previous, headYaw)          in VR the body turns only once the head is more than HEAD_LEAD off it
 *   poseToSend(feet, ry, tracked?)      the Pose: plain without `tracked`, with head and hands in VR
 *   applyRig(figure, rig)               turns a figure's joints, brows and hem to one frame of motion.ts's animate()
 *
 * controls/Player.tsx builds it every frame (desk.pose, which the mirror draws me from) and sends it a few times a second.
 */
import { HAND_HEIGHT, HAND_REACH, HEAD_TURN, type Hand } from "../../../shared/avatar";
import type { Pose } from "../../../shared/protocol";
import { JOINT_NAMES, type Figure } from "./figure";
import { wrap, type Rig } from "./motion";

/** How far (radians) the head turns on its own before the body comes round after it. */
export const HEAD_LEAD = 0.6;

type Point = { x: number; y: number; z: number };

export interface Tracked {
  /** The head's world facing and its pitch (radians, up positive). */
  headYaw: number;
  pitch: number;
  /** Each hand's world position, left then right; null while it is not tracked. */
  hands: [Point | null, Point | null];
}

const clamp = (value: number, limit: number, low = -limit): number => Math.min(limit, Math.max(low, value));

export function bodyYaw(previous: number | null, headYaw: number): number {
  if (previous === null) return headYaw;
  const off = wrap(headYaw - previous);
  return Math.abs(off) <= HEAD_LEAD ? previous : wrap(headYaw - Math.sign(off) * HEAD_LEAD);
}

/** `feet` is the world feet point (y the feet height sent), `ry` the body's facing. */
export function poseToSend(feet: Point, ry: number, tracked?: Tracked): Pose {
  const pose: Pose = { x: feet.x, z: feet.z, ry, y: feet.y };
  if (!tracked) return pose;
  const sin = Math.sin(ry);
  const cos = Math.cos(ry);
  // Into the body's own frame: x to its right, z toward its back (it faces -Z), as world/layout.ts turns a Pose.
  const local = (hand: Point | null): Hand | null => {
    if (!hand) return null;
    const dx = hand.x - feet.x;
    const dz = hand.z - feet.z;
    return { x: clamp(dx * cos - dz * sin, HAND_REACH), y: clamp(hand.y - feet.y, HAND_HEIGHT, 0), z: clamp(dx * sin + dz * cos, HAND_REACH) };
  };
  pose.head = { pitch: clamp(tracked.pitch, HEAD_TURN), yaw: clamp(wrap(tracked.headYaw - ry), HEAD_TURN) };
  pose.hands = [local(tracked.hands[0]), local(tracked.hands[1])];
  return pose;
}

export function applyRig(figure: Figure, rig: Rig): void {
  for (const joint of JOINT_NAMES) figure.joints[joint].rotation.set(...rig.joints[joint]);
  figure.joints.pelvis.position.y = rig.pelvisY;
  figure.root.position.y = rig.lift;
  figure.face.setBrows(rig.brows);
  figure.setHem(rig.hem);
}
