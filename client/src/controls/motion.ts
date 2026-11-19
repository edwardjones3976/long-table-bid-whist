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
 *
 * Under the head is the Body: an upright cylinder that walks, runs, jumps,
 * falls and floats. It touches the world only through a Ground
 * (world/ground.ts), so all of it can be tested against a few lines of made-up ground.
 */
import type { Pose } from "../../../shared/protocol";
import { STEP_UP, type Ground } from "../world/ground";
import { EYE_HEIGHT_STANDING, PLAYER_RADIUS } from "../world/layout";

export type Walkable = (x: number, z: number) => boolean;

export interface Gait {
  /** Metres per second. */
  walk: number;
  run: number;
  /** Seconds from rest to full speed. Short on purpose: a long acceleration is what makes people queasy in a headset. */
  accel: number;
}

export const DESK_GAIT: Gait = { walk: 2.2, run: 4, accel: 0.12 };
export const VR_GAIT: Gait = { walk: 1.8, run: 3.2, accel: 0.08 };
/** Seconds from full speed to rest. */
export const STOP_TIME = 0.08;
/** Radians per second at full smooth-turn input. */
export const TURN_SPEED = 2;
export const DEAD_ZONE = 0.15;
/** How far a stick must be pushed to fire a snap turn or start a teleport aim, and how far back to re-arm. */
export const FLICK_ON = 0.6;
export const FLICK_OFF = 0.3;

/** m/s2. With JUMP_HEIGHT it makes a jump about 0.7 s long: a hop, not a float. */
export const GRAVITY = 13;
/** How far the feet rise above the take-off point. */
export const JUMP_HEIGHT = 0.85;
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
/** A jump pressed this long before landing, or this long after walking off an edge, still jumps. */
export const JUMP_GRACE = 0.1;
/** In the air the feet still catch a surface this far above them. */
export const AIR_REACH = 0.05;
/** How hard the stick pushes the body in the air, m/s2: enough to place a landing, not to turn round. */
export const AIR_STEER = 2;
/** A walking body takes a whole step up or down in this long, so the view does not jerk on stairs. */
export const STEP_TIME = 0.08;
/** Floating: how far the eyes ride above the water, the share of normal speed, and the fastest a plunge sinks (m/s). */
export const EYES_ABOVE_WATER = 0.25;
export const WATER_SPEED = 0.5;
export const WATER_SINK = 3;

export const TELEPORT_RANGE = 7;
/** After an aim ends, this long before another may start: a stick bouncing back cannot teleport twice. */
export const AIM_PAUSE = 0.25;
/** The teleport arc is a thrown ball: launch speed (m/s) and gravity (m/s2). */
export const ARC_SPEED = 8;
export const ARC_GRAVITY = 9.8;
/** The longest frame that is acted on, so the world does not lurch after a stall (a tab switch). */
const MAX_DT = 0.1;

const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
const frame = (dt: number): number => Math.min(Math.max(dt, 0), MAX_DT);
const approach = (value: number, target: number, step: number): number =>
  value < target ? Math.min(target, value + step) : Math.max(target, value - step);

/** Zero inside the zone, then rising smoothly from 0 to 1 so there is no jump at the edge. */
export function deadZone(value: number, zone = DEAD_ZONE): number {
  const size = Math.abs(value);
  if (size <= zone) return 0;
  return Math.sign(value) * Math.min(1, (size - zone) / (1 - zone));
}

/** Smooth turning on the spot: `turn` is -1..1, positive to the right. Returns the same object when nothing changed. */
export function smoothTurn(pose: Pose, turn: number, dt: number): Pose {
  return turn ? { x: pose.x, z: pose.z, ry: wrap(pose.ry - turn * TURN_SPEED * frame(dt)) } : pose;
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

/**
 * Whether a stick is asking to aim a teleport: it starts when pushed mostly
 * forward (y is negative forward) and lasts until the stick is back near rest.
 */
export function stickAim(held: boolean, x: number, y: number): boolean {
  return held ? Math.hypot(x, y) > FLICK_OFF : -y >= FLICK_ON && -y > Math.abs(x);
}

/** Running by stick click: a click while the stick is pushed starts it, and it lasts until the stick is back at rest. */
export function runLatch(running: boolean, clicked: boolean, pushed: boolean): boolean {
  return pushed && (running || clicked);
}

// ---- the body ----

export interface Body {
  /** Where the head is on the plan. */
  x: number;
  z: number;
  /** Feet height in metres above the house floor. */
  y: number;
  /** What the legs are doing, m/s. A wall stops the body, not the legs, so a jump beside a bench still carries onto it. */
  vx: number;
  vz: number;
  /** Vertical speed while in the air. */
  vy: number;
  grounded: boolean;
  /** In water too deep to stand in. */
  floating: boolean;
  /** The feet are under water. */
  wet: boolean;
  /** Moving at the run gait. Kept while stopping, so a run stops as quickly as a walk. */
  running: boolean;
  /** Seconds since the feet left the ground. */
  airTime: number;
  /** This time in the air began with a jump: no second jump, and no late one. */
  jumped: boolean;
  /** The jump control was down last frame: it must be let go before it can jump again. */
  jumpHeld: boolean;
  /** Seconds a press made in the air is still remembered for. */
  jumpEarly: number;
}

/** A body standing still at (x, z) with its feet at `y`. */
export function makeBody(x: number, z: number, y = 0): Body {
  return { x, z, y, vx: 0, vz: 0, vy: 0, grounded: true, floating: false, wet: false, running: false, airTime: 0, jumped: false, jumpHeld: false, jumpEarly: 0 };
}

export interface BodyInput {
  /** -1..1 along the facing and to its right. How far the stick is pushed scales the speed. */
  forward: number;
  strafe: number;
  /** The facing the stick is read against: the head's. */
  ry: number;
  run: boolean;
  /** The jump control is down. */
  jump: boolean;
  /** False while no jump may start: jumping switched off, a teleport being aimed, a menu open. */
  mayJump: boolean;
}

/**
 * Whether the body cannot have its centre here: something is in the way, or the floor itself is too high to step onto.
 * `feet` is set only in the air: then it passes over what it cannot stand on below its feet (Ground.blocked).
 */
function stuck(ground: Ground, x: number, z: number, reach: number, feet = -Infinity): boolean {
  return ground.blocked(x, z, reach, feet) || ground.floor(x, z, reach) > reach;
}

/** How much (0 to 1) of the move (dx, dz) the body can make before it touches something, found to 1/256 of the move. */
function upTo(ground: Ground, x: number, z: number, dx: number, dz: number, reach: number, feet: number): number {
  if (!dx && !dz) return 0;
  if (!stuck(ground, x + dx, z + dz, reach, feet)) return 1;
  let free = 0;
  let blocked = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (free + blocked) / 2;
    if (stuck(ground, x + dx * mid, z + dz * mid, reach, feet)) blocked = mid;
    else free = mid;
  }
  return free;
}

/** The highest surface the body can get on top of: a step while walking, anything under water while floating, barely above the feet in the air. */
export const reachOf = (b: Body, eye: number): number => b.y + (b.floating ? eye - EYES_ABOVE_WATER : b.grounded ? STEP_UP : AIR_REACH);
/** The feet height that counts against things that cannot be stood on: only in the air, where a jump passes over them. */
const feetOf = (b: Body): number => (b.grounded || b.floating ? -Infinity : b.y);
/** Whether `b`, as it is now, could not have its centre at (x, z): what moveBody checks every step, for a move made some other way (a real step in a headset). */
export const blockedAt = (g: Ground, b: Body, x: number, z: number, eye: number): boolean => stuck(g, x, z, reachOf(b, eye), feetOf(b));

/**
 * One frame of walking, running, jumping, falling and floating; `body` is updated in place.
 * `eye` is the height of the eyes above the feet, which sets how deep the body floats.
 * Returns the moment worth a cue, if there was one: feet landing on something dry, or going into water.
 *
 * The frame is cut into sub-steps no longer than half the body's radius, so no frame
 * rate and no speed carries the body through anything at least that thick.
 */
export function moveBody(body: Body, input: BodyInput, dt: number, ground: Ground, gait: Gait, eye = EYE_HEIGHT_STANDING): "land" | "splash" | null {
  const time = frame(dt);
  let { forward, strafe } = input;
  const size = Math.hypot(forward, strafe);
  // Diagonals are no faster than straight lines.
  if (size > 1) {
    forward /= size;
    strafe /= size;
  }
  // The gait follows the stick while it is pushed; a body that is stopping keeps the gait it had.
  if (size) body.running = input.run;
  else if (!body.vx && !body.vz) body.running = false;
  const top = (body.running ? gait.run : gait.walk) * (body.floating ? WATER_SPEED : 1);
  const sin = Math.sin(input.ry);
  const cos = Math.cos(input.ry);
  const wantX = (-sin * forward + cos * strafe) * top;
  const wantZ = (-cos * forward - sin * strafe) * top;

  // One jump per press. A press in the air is remembered briefly, and the ground is too after walking off an edge.
  const pressed = input.jump && !body.jumpHeld;
  body.jumpHeld = input.jump;
  body.jumpEarly = !input.mayJump ? 0 : pressed ? JUMP_GRACE : Math.max(0, body.jumpEarly - time);
  if (body.jumpEarly > 0 && (body.grounded || (!body.floating && !body.jumped && body.airTime <= JUMP_GRACE))) {
    body.vy = JUMP_SPEED;
    body.grounded = false;
    body.jumped = true;
    body.jumpEarly = 0;
  }

  const reachNow = (): number => reachOf(body, eye);
  // Never start a walk from inside something (a headset session begun, or its view recentred, with the head inside something can do it): there every direction would be blocked.
  const startReach = reachNow();
  const startFeet = feetOf(body);
  if (size && stuck(ground, body.x, body.z, startReach, startFeet)) {
    const out = nearestWalkable(body.x, body.z, (x, z) => !stuck(ground, x, z, startReach, startFeet), body);
    body.x = out.x;
    body.z = out.z;
  }

  const fastest = Math.max(Math.hypot(body.vx, body.vz), top, Math.abs(body.vy) + GRAVITY * time);
  const steps = Math.max(1, Math.ceil((fastest * time) / (PLAYER_RADIUS / 2)));
  const h = time / steps;
  let event: "land" | "splash" | null = null;
  for (let i = 0; i < steps; i++) {
    // Ease the legs toward what the stick asks: quicker to stop than to start. In the air the stick only nudges, and letting go changes nothing.
    const dvx = wantX - body.vx;
    const dvz = wantZ - body.vz;
    const gap = Math.hypot(dvx, dvz);
    const rate = body.grounded || body.floating ? top / (dvx * body.vx + dvz * body.vz < 0 ? STOP_TIME : gait.accel) : size ? AIR_STEER : 0;
    if (rate * h >= gap - 1e-9) {
      body.vx = wantX;
      body.vz = wantZ;
    } else if (rate) {
      body.vx += (dvx / gap) * rate * h;
      body.vz += (dvz / gap) * rate * h;
    }

    // Move, sliding along whatever blocks: blocked, each direction goes as far as it can, so the body stops against a
    // thing at any frame rate, not up to a whole step short of it.
    const reach = reachNow();
    const feet = feetOf(body);
    const dx = body.vx * h;
    const dz = body.vz * h;
    if (dx || dz) {
      if (!stuck(ground, body.x + dx, body.z + dz, reach, feet)) {
        body.x += dx;
        body.z += dz;
      } else {
        body.x += dx * upTo(ground, body.x, body.z, dx, 0, reach, feet);
        body.z += dz * upTo(ground, body.x, body.z, 0, dz, reach, feet);
      }
    }

    // Settle the height. `level` is where the feet come to rest here: the floor, or the float level where the water is too deep to stand in.
    const surface = ground.water(body.x, body.z);
    const floatY = surface === null ? -Infinity : surface + EYES_ABOVE_WATER - eye;
    const floor = ground.floor(body.x, body.z, reach);
    const deep = floor < floatY;
    const level = deep ? floatY : floor;
    const stepRate = (STEP_UP / STEP_TIME) * h;
    let landed = false;
    if (body.floating) {
      // Swimming onto a shelf carries the body up to it before it stands.
      body.y = approach(body.y, level, stepRate);
      if (!deep && body.y >= level) {
        body.floating = false;
        body.grounded = true;
      }
    } else if (body.grounded) {
      if (level < body.y - STEP_UP) {
        // Walked off an edge.
        body.grounded = false;
        body.jumped = false;
        body.vy = 0;
        body.airTime = 0;
      } else {
        body.y = approach(body.y, level, stepRate);
        if (deep && body.y <= level) {
          body.grounded = false;
          body.floating = true;
        }
      }
    } else {
      let vy = body.vy - GRAVITY * h;
      let y = body.y + ((body.vy + vy) / 2) * h;
      if (deep && body.y < surface!) {
        // Water takes the speed out of a plunge and brings the body to the float level gently.
        const sink = Math.min(WATER_SINK, 0.4 + (body.y - floatY) * 8);
        if (vy < -sink) {
          vy = -sink;
          y = body.y + vy * h;
        }
      }
      if (vy <= 0 && y <= level) {
        // Exactly onto the surface: no bounce, no sinking in.
        body.y = level;
        body.vy = 0;
        body.airTime = 0;
        body.jumped = false;
        if (deep) body.floating = true;
        else body.grounded = landed = true;
      } else {
        // Coming down onto something it cannot stand on (a lounger's back), the body stays on top of it, not inside it.
        // shortcut: a body with no sideways speed rests up there until the stick steers it off; give Ground a stand rule for such tops if that shows.
        if (vy < 0 && stuck(ground, body.x, body.z, y + AIR_REACH, y)) {
          y = body.y;
          vy = 0;
        }
        body.y = y;
        body.vy = vy;
        body.airTime += h;
      }
    }
    const wet = surface !== null && body.y < surface;
    if (wet && !body.wet) event = "splash";
    else if (landed && !wet && !event) event = "land";
    body.wet = wet;
  }
  return event;
}

// ---- teleport ----

/** The height a walker coming over the bare floor would stand at here, or null when it cannot stand here at all. */
export function standing(ground: Ground, x: number, z: number): number | null {
  const reach = ground.floor(x, z, -Infinity) + STEP_UP;
  return ground.blocked(x, z, reach) ? null : ground.floor(x, z, reach);
}

/** The word shown at a landing point that is refused. */
export type Refused = "Too far" | "Blocked" | "Too deep";

/**
 * Where a teleport aimed at (x, z) from `from` would land, and why not if it may not.
 * It lands only on ground-level surfaces (the bare floor, or something a walker steps onto from it),
 * within range, with no wall between and never in water too deep to stand in. Furniture tops are for jumping.
 * `y` is where the feet would be and `water` the height of the water there, if any.
 */
export function teleportTarget(
  ground: Ground,
  from: { x: number; z: number },
  x: number,
  z: number,
  eye = EYE_HEIGHT_STANDING,
  range = TELEPORT_RANGE,
): { x: number; z: number; y: number; water: number | null; why: Refused | null } {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { x, z, y: 0, water: null, why: "Blocked" };
  const stand = standing(ground, x, z);
  const y = stand ?? ground.floor(x, z, -Infinity);
  const water = ground.water(x, z);
  let why: Refused | null = null;
  if (Math.hypot(x - from.x, z - from.z) > range) why = "Too far";
  else if (stand === null || ground.wallBetween(from.x, from.z, x, z)) why = "Blocked";
  else if (water !== null && y < water + EYES_ABOVE_WATER - eye) why = "Too deep";
  return { x, z, y, water, why };
}

/** Who is aiming: a hand's stick, or the desktop and gamepad control, whose arc starts at the view. */
export type AimSource = "left" | "right" | "view";
const AIM_SOURCES: readonly AimSource[] = ["left", "right", "view"];

export interface Aim {
  /** Who holds the aim, or null when nobody is aiming. */
  source: AimSource | null;
  /** Seconds before another aim may start. */
  pause: number;
  /** A control starts an aim only after it has been at rest since the last one ended. */
  armed: Record<AimSource, boolean>;
}

export const makeAim = (): Aim => ({ source: null, pause: 0, armed: { left: true, right: true, view: true } });

/**
 * One frame of the teleport aim; `aim` is updated in place. `wants` is which controls ask to aim right now.
 * The first to ask holds the aim until it lets go; `mayStart` is false where none may begin (in the air, seated).
 * `cancel` ends an aim without teleporting. Returns true on the frame the holder lets go: the caller teleports or refuses.
 */
export function aimStep(aim: Aim, wants: Record<AimSource, boolean>, mayStart: boolean, cancel: boolean, dt: number): boolean {
  aim.pause = Math.max(0, aim.pause - dt);
  const letGo = aim.source !== null && !cancel && !wants[aim.source];
  if (aim.source && (cancel || letGo)) {
    aim.source = null;
    aim.pause = AIM_PAUSE;
    // Whatever is still pushed must come back to rest first, so nothing left over starts the next aim.
    for (const source of AIM_SOURCES) aim.armed[source] = false;
  }
  for (const source of AIM_SOURCES) if (!wants[source]) aim.armed[source] = true;
  if (!aim.source && mayStart && aim.pause <= 0) {
    const next = AIM_SOURCES.find((source) => wants[source] && aim.armed[source]);
    if (next) {
      aim.source = next;
      aim.armed[next] = false;
    }
  }
  return letGo;
}

/**
 * Seconds until a ball thrown from height `y` above the floor with upward
 * speed `vy` (ARC_SPEED times the aim direction's y) reaches the floor.
 */
export function arcFlightTime(y: number, vy: number): number {
  return (vy + Math.sqrt(vy * vy + 2 * ARC_GRAVITY * Math.max(0, y))) / ARC_GRAVITY;
}

// ---- places to stand ----

/** The closest walkable point to (x, z), searched in widening rings; `fallback` when there is none within 6 m. */
export function nearestWalkable(x: number, z: number, isWalkable: Walkable, fallback: { x: number; z: number }): { x: number; z: number } {
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
