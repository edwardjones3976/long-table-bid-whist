/**
 * Movement maths for the player rig. Pure: no three.js, no DOM, no stores.
 *
 * A Pose is a point on the floor plus a facing (see world/layout.ts): ry = 0
 * looks toward -z, forward is (-sin ry, -cos ry), and a positive turn is to the left.
 *
 * The rig (the XR origin, or the desktop camera's feet) and the head are kept
 * apart because in a headset the head wanders inside the rig: `local` below is
 * the head's pose in rig space (all zero on desktop). Collision, teleport and
 * seating all work on the head, then rigForHead() turns the answer back into a rig pose.
 */
import type { Pose } from "../../../shared/protocol";

export type Walkable = (x: number, z: number) => boolean;

export interface MoveInput {
  /** -1..1, positive walks the way the pose faces. */
  forward: number;
  /** -1..1, positive steps to the right. */
  strafe: number;
  /** -1..1 smooth turn, positive to the right. */
  turn: number;
  run: boolean;
}

export const WALK_SPEED = 2.2;
export const RUN_SPEED = 4;
/** Radians per second at full smooth-turn input. */
export const TURN_SPEED = 2;
export const DEAD_ZONE = 0.15;
/** How far a stick must be pushed to fire a snap turn or start a teleport aim, and how far back to re-arm. */
export const FLICK_ON = 0.6;
export const FLICK_OFF = 0.3;
export const TELEPORT_RANGE = 7;
/** The teleport arc is a thrown ball: launch speed (m/s) and gravity (m/s2). */
export const ARC_SPEED = 8;
export const ARC_GRAVITY = 9.8;
/** A long frame (tab switch) must not carry the body through a wall: 0.1 s at RUN_SPEED is under the 0.8 m a wall blocks. */
const MAX_DT = 0.1;

const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Zero inside the zone, then rising smoothly from 0 to 1 so there is no jump at the edge. */
export function deadZone(value: number, zone = DEAD_ZONE): number {
  const size = Math.abs(value);
  if (size <= zone) return 0;
  return Math.sign(value) * Math.min(1, (size - zone) / (1 - zone));
}

/**
 * One frame of walking and smooth turning. Blocked moves slide along whichever
 * axis is still free. Seated players can turn but not move. Returns the same
 * object when nothing changed.
 */
export function step(pose: Pose, input: MoveInput, dt: number, isWalkable: Walkable, seated = false): Pose {
  const time = Math.min(Math.max(dt, 0), MAX_DT);
  const ry = input.turn ? wrap(pose.ry - input.turn * TURN_SPEED * time) : pose.ry;
  let { forward, strafe } = input;
  if (seated || (!forward && !strafe)) return ry === pose.ry ? pose : { x: pose.x, z: pose.z, ry };

  // Diagonals are no faster than straight lines.
  const size = Math.hypot(forward, strafe);
  if (size > 1) {
    forward /= size;
    strafe /= size;
  }
  const distance = (input.run ? RUN_SPEED : WALK_SPEED) * time;
  const sin = Math.sin(pose.ry);
  const cos = Math.cos(pose.ry);
  const dx = (-sin * forward + cos * strafe) * distance;
  const dz = (-cos * forward - sin * strafe) * distance;

  // Never start from inside something: there every direction would be blocked.
  const from = isWalkable(pose.x, pose.z) ? pose : nearestWalkable(pose.x, pose.z, isWalkable, pose);
  if (isWalkable(from.x + dx, from.z + dz)) return { x: from.x + dx, z: from.z + dz, ry };
  if (dx && isWalkable(from.x + dx, from.z)) return { x: from.x + dx, z: from.z, ry };
  if (dz && isWalkable(from.x, from.z + dz)) return { x: from.x, z: from.z + dz, ry };
  return from === pose && ry === pose.ry ? pose : { x: from.x, z: from.z, ry };
}

/** Turn on the spot by a fixed angle; direction 1 is right, -1 is left. */
export function snapTurn(pose: Pose, direction: 1 | -1, degrees: number): Pose {
  return { x: pose.x, z: pose.z, ry: wrap(pose.ry - (direction * degrees * Math.PI) / 180) };
}

/**
 * Turns a held stick into single flicks: returns 1 (right) or -1 (left) once
 * when pushed past FLICK_ON, then 0 until it has come back inside FLICK_OFF.
 * `state` is the caller's memory of one stick and is updated in place.
 */
export function flick(value: number, state: { armed: boolean }): -1 | 0 | 1 {
  if (state.armed && Math.abs(value) >= FLICK_ON) {
    state.armed = false;
    return value > 0 ? 1 : -1;
  }
  if (Math.abs(value) <= FLICK_OFF) state.armed = true;
  return 0;
}

/** Where a teleport aimed at (x, z) would land, and whether it is allowed: walkable floor within range. */
export function teleportTarget(
  from: Pose,
  x: number,
  z: number,
  isWalkable: Walkable,
  range = TELEPORT_RANGE,
): { x: number; z: number; valid: boolean } {
  const valid =
    Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x - from.x, z - from.z) <= range && isWalkable(x, z);
  return { x, z, valid };
}

/**
 * Seconds until a ball thrown from height `y` above the floor with upward
 * speed `vy` (ARC_SPEED times the aim direction's y) reaches the floor.
 */
export function arcFlightTime(y: number, vy: number): number {
  return (vy + Math.sqrt(vy * vy + 2 * ARC_GRAVITY * Math.max(0, y))) / ARC_GRAVITY;
}

/** The closest walkable point to (x, z), searched in widening rings; `fallback` when there is none within 6 m. */
export function nearestWalkable(x: number, z: number, isWalkable: Walkable, fallback: Pose): { x: number; z: number } {
  if (isWalkable(x, z)) return { x, z };
  for (let radius = 0.25; radius <= 6; radius += 0.25) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const px = x + Math.sin(angle) * radius;
      const pz = z + Math.cos(angle) * radius;
      if (isWalkable(px, pz)) return { x: px, z: pz };
    }
  }
  return { x: fallback.x, z: fallback.z };
}

/** Where to stand after leaving a seat: a step back from the table, still facing it. */
export function standUpPose(seat: Pose, isWalkable: Walkable, fallback: Pose): Pose {
  const back = 0.6;
  const spot = nearestWalkable(seat.x + Math.sin(seat.ry) * back, seat.z + Math.cos(seat.ry) * back, isWalkable, fallback);
  return { x: spot.x, z: spot.z, ry: seat.ry };
}

/** The head's world pose, from the rig's pose and the head's pose inside the rig. */
export function headPose(rig: Pose, local: Pose): Pose {
  const sin = Math.sin(rig.ry);
  const cos = Math.cos(rig.ry);
  return { x: rig.x + cos * local.x + sin * local.z, z: rig.z - sin * local.x + cos * local.z, ry: wrap(rig.ry + local.ry) };
}

/** The rig pose that puts the head exactly at `head` (position and facing). */
export function rigForHead(head: Pose, local: Pose): Pose {
  const ry = wrap(head.ry - local.ry);
  const sin = Math.sin(ry);
  const cos = Math.cos(ry);
  return { x: head.x - (cos * local.x + sin * local.z), z: head.z - (-sin * local.x + cos * local.z), ry };
}
