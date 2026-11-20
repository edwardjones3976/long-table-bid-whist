/**
 * How another person's avatar moves: pure functions of time and a little kept state, giving joint turns.
 * No scene and no React here, so all of it is unit-tested; world/Avatars.tsx keeps the state per avatar
 * and turns a figure's joints by the result every frame.
 *
 *   stepGait(gait, moved, dt, m)    walking speed and stride phase from how far the eased position moved
 *   stepAir(air, y, vy, dt)         the height the feet last rested at; tuckOf(air, y) tucks while above it
 *   isFloating(x, z, y)             in the pool: the feet below the floor under them
 *   animate(scene, rig)             one frame: every joint's turn, the hip height, a bob, the mouth and brows, and the hem
 *   reachArm(...)                   two-bone IK, for a VR player's tracked hands
 *   actNow(id, now, ...lists)       the gesture or reaction a member is playing now, if any
 *   blinkAt(seed, t), gazeAt(...)   the face: seeded blinks, eyes on the nearest member moving
 *   seatOf(room, id), seatedLegs(m), fanSize(...)   sitting at a table with a fan of card backs
 *
 * Joint turns are Euler angles in three's default XYZ order. Each limb hangs down its joint's -Y at rest,
 * so for an arm or leg +x swings it forward (the figure faces -Z) and +z swings it toward the figure's right;
 * for the torso and head +x tips them back (the face up). Avatars never take part in the rules: nothing
 * here reads a card, only what every seat plate already shows.
 */
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { GESTURE_MS, type GestureId, type Hand } from "../../../shared/avatar";
import type { RoomSnapshot, Seat, TableId, TableStatus } from "../../../shared/protocol";
import { EYE_HEIGHT_STANDING, floorHeight, SEAT_HEIGHT } from "../world/layout";
import { JOINT_NAMES, type JointName, type MouthShape } from "./figure";
import type { Measurements } from "./measure";

export type Turn = [x: number, y: number, z: number];

/** What an avatar plays once: a member's gesture, or one of the automatic end-of-hand reactions. */
export type Act = GestureId | "shrug" | "grin";
/** How long each act plays, in ms; every one is under two seconds. */
export const ACT_MS: Record<Act, number> = { ...GESTURE_MS, shrug: 1300, grin: 1400 };

/** A gesture or reaction as it arrived: who, which and when (Date.now()). */
export interface Played {
  memberId: string;
  kind: Act;
  at: number;
}

export interface Rig {
  joints: Record<JointName, Turn>;
  /** The hip joint's height above the feet point: lower while sitting. */
  pelvisY: number;
  /** Added to the figure's height: the dip of a stride, the bob of floating. */
  lift: number;
  mouth: MouthShape;
  /** -1 knit to 1 raised: Figure.face.setBrows. */
  brows: number;
  /** How far the top hangs below the waist: Figure.setHem. */
  hem: number;
}

export interface Gait {
  /** Radians around the stride cycle. */
  phase: number;
  /** Eased ground speed, m/s. */
  speed: number;
}

export interface Air {
  /** Where the feet last came to rest. */
  ground: number;
  /** Seconds the height has held still. */
  settled: number;
}

export interface Seated {
  /** A fan of card backs is in the left hand. */
  holding: boolean;
  /** 0 to 1: leaning in to play a card. */
  lean: number;
  /** Where the head turns (yaw from the body, pitch up), or null for a calm idle. */
  look: { yaw: number; pitch: number } | null;
}

export interface Scene {
  /** Seconds on a running clock. */
  t: number;
  m: Measurements;
  /** This person's own number (seedOf), so two idles never move in step. */
  seed: number;
  gait: Gait;
  /** 0 on the ground to 1 knees up: tuckOf. */
  tuck: number;
  floating: boolean;
  seated: Seated | null;
  act: { kind: Act; ms: number } | null;
  /** A VR player's live head and hands (Pose in shared/protocol.ts). */
  head?: { pitch: number; yaw: number };
  hands?: [Hand | null, Hand | null];
  /** Reduce motion: calm idles, no sway. */
  calm: boolean;
}

const TAU = Math.PI * 2;
const SIDES = ["L", "R"] as const;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
/** An angle brought into -PI..PI. */
export const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const set = (turn: Turn, x: number, y: number, z: number) => {
  turn[0] = x;
  turn[1] = y;
  turn[2] = z;
};

export const newRig = (): Rig => ({
  joints: Object.fromEntries(JOINT_NAMES.map((name) => [name, [0, 0, 0]])) as unknown as Record<JointName, Turn>,
  pelvisY: 0,
  lift: 0,
  mouth: "relaxed",
  brows: 0,
  hem: 1,
});

/** A steady number from a member id, for seeding their blinks and idles. */
export function seedOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

/** A well-mixed 0..1 from a seed and a counter. */
function mix(seed: number, k: number): number {
  let h = Math.imul(seed ^ Math.imul(k + 1, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---- moving ----

/** Below this eased speed (m/s) a body stands still. */
export const STILL = 0.15;
const strideShare = (speed: number) => clamp(speed / 1.2, 0, 1);
/** 0 walking to 1 running; the house walks at about 2 m/s and runs at 3.2 to 4. */
const runShare = (speed: number) => clamp((speed - 2.4) / 1.2, 0, 1);

/** One frame of walking: `moved` metres over the ground in `dt` seconds. The stride lengthens into a run. */
export function stepGait(gait: Gait, moved: number, dt: number, m: Measurements): Gait {
  if (!(dt > 0)) return gait;
  const speed = Math.max(0, gait.speed + (moved / dt - gait.speed) * Math.min(1, dt * 8));
  if (speed < STILL) return { phase: gait.phase, speed };
  const cycle = m.joints.pelvis[1] * (2.2 + 1.2 * runShare(speed));
  return { phase: (gait.phase + (TAU * speed * dt) / cycle) % TAU, speed };
}

/** One frame of height: a body that stops rising or falling for a moment has landed, on a bench or the floor. */
export function stepAir(air: Air, y: number, vy: number, dt: number): Air {
  const settled = Math.abs(vy) < 0.25 ? air.settled + dt : 0;
  return { ground: y < air.ground || settled > 0.2 ? y : air.ground, settled };
}

/** 0 to 1: how far the knees come up, from how high the feet are above where they last rested. */
export const tuckOf = (air: Air, y: number): number => clamp((y - air.ground - 0.04) / 0.25, 0, 1);

/** Floating in the pool: the feet well below the floor under them (wading the shallow end stands on it). */
export const isFloating = (x: number, z: number, y: number): boolean => y < floorHeight(x, z) - 0.1;

// ---- at a table ----

/** The table and seat a member plays at, or null (standing, or the table's non-playing host). */
export function seatOf(room: RoomSnapshot, memberId: string): { tableId: TableId; seat: Seat } | null {
  for (const table of room.tables) {
    const seat = table.seats.findIndex((info) => info.memberId === memberId);
    if (seat >= 0) return { tableId: table.id, seat: seat as Seat };
  }
  return null;
}

/** A small fan for a match at a table whose hands I cannot count. */
export const GENERIC_FAN = 5;
/** The most backs drawn: a full hand with the bid whist kitty taken in. */
export const MAX_FAN = 18;

/**
 * How many card backs a seated person holds: their public hand count at my own table, a small generic fan
 * at another table while its match runs, none in a lobby or between matches.
 */
export function fanSize(status: TableStatus | undefined, mine: boolean, count: number | null | undefined): number {
  if (status !== "playing") return 0;
  return mine ? clamp(Math.round(count ?? 0), 0, MAX_FAN) : GENERIC_FAN;
}

/** Feet tucked this far back under the knees, radians. */
const TUCK = 0.12;
/** A seated head at rest tips this far down toward the table, radians. */
export const SEATED_HEAD = -0.12;

/** Eases a seated head's look toward `target` (or back to the rest), at most 3 rad/s, so a change of turn never snaps it. */
export function easeLook(look: { yaw: number; pitch: number }, target: Seated["look"], dt: number): void {
  const to = target ?? { yaw: 0, pitch: SEATED_HEAD };
  const step = (from: number, goal: number) => from + clamp((goal - from) * Math.min(1, dt * 4), -dt * 3, dt * 3);
  look.yaw = step(look.yaw, to.yaw);
  look.pitch = step(look.pitch, to.pitch);
}
/** Seated, the top's hem is drawn up to this share of its hang, so it lies on the lap rather than through the thighs. */
export const SEATED_HEM = 0.1;

/**
 * Sitting on a chair at SEAT_HEIGHT: the hip joint just above the cushion, thighs sloping down only as far as
 * it takes for the feet to reach the floor (short legs dangle a little), shins down and tucked back, feet flat.
 */
export function seatedLegs(m: Measurements): { pelvisY: number; thigh: number; shin: number; foot: number } {
  const pelvisY = SEAT_HEIGHT + m.limb * 1.2;
  const hang = pelvisY - (m.shin + m.ankle) * Math.cos(TUCK);
  const slope = Math.min(0.4, Math.asin(clamp(hang / m.thigh, 0, 1)));
  const thigh = Math.PI / 2 - slope;
  return { pelvisY, thigh, shin: -thigh - TUCK, foot: TUCK };
}

/** How far the arms hang out from the sides, so they clear the waist and hips of every build. */
export function armsOut(m: Measurements): number {
  const clear = Math.max(m.waist, m.hip) + m.limb * 0.9 - m.joints.upperArmR[0];
  return clamp(Math.asin(clamp(clear / (m.upperArm * 1.3), 0, 1)), 0.05, 0.35);
}

// ---- gestures and reactions ----

/** The latest of a member's acts if it is still playing, with how far in (ms). */
export function actNow(memberId: string, now: number, ...lists: readonly (readonly Played[])[]): { kind: Act; ms: number } | null {
  let latest: Played | null = null;
  for (const list of lists) for (const played of list) if (played.memberId === memberId && (!latest || played.at >= latest.at)) latest = played;
  if (!latest) return null;
  const ms = now - latest.at;
  return ms >= 0 && ms < ACT_MS[latest.kind] ? { kind: latest.kind, ms } : null;
}

/** 0 to 1 to 0 over an act: in over its first 15%, out over its last 20%, so it starts and ends at the idle. */
const envelope = (p: number) => smooth(clamp(Math.min(p / 0.15, (1 - p) / 0.2), 0, 1));

/** An act's pose: joint turns, the mouth, and the brows (raised in every act: they are all friendly). */
type Shape = { joints: Partial<Record<JointName, Turn>>; mouth: MouthShape; brows?: number };

/** Each act's pose at `s` seconds in (`p` of the way through). Seated acts keep the legs and use the table. */
const ACTS: Record<Act, (s: number, p: number, seated: boolean) => Shape> = {
  wave: (s) => ({ joints: { upperArmR: [0.15, 0, 2.5], foreArmR: [0, 0, 0.3 + 0.4 * Math.sin(TAU * 2.5 * s)], head: [0.06, -0.1, 0.08] }, mouth: "smile", brows: 1 }),
  clap: (s) => {
    const apart = 0.22 * (0.5 + 0.5 * Math.cos(TAU * 3 * s));
    return {
      joints: { upperArmL: [0.95, 0, 0.32 - apart], upperArmR: [0.95, 0, -0.32 + apart], foreArmL: [0.9, 0, 0], foreArmR: [0.9, 0, 0] },
      mouth: "grin",
      brows: 0.7,
    };
  },
  laugh: (s) => {
    const shake = Math.sin(TAU * 5 * s);
    return {
      joints: {
        torso: [0.1 + 0.02 * shake, 0, 0.02 * shake],
        head: [0.25 + 0.05 * shake, 0, 0],
        upperArmL: [0.3, 0, 0.25],
        upperArmR: [0.3, 0, -0.25],
        foreArmL: [1.3, 0, 0],
        foreArmR: [1.3, 0, 0],
      },
      // Held open, not flicked to a grin with every shake, so it reads as a laugh.
      mouth: "laugh",
      brows: 1,
    };
  },
  bow: (_s, _p, seated) => ({
    joints: { torso: [seated ? -0.35 : -0.6, 0, 0], head: [-0.2, 0, 0], upperArmR: [0.45, 0, -0.35], foreArmR: [1.5, 0, 0] },
    mouth: "smile",
    brows: 0.4,
  }),
  slap: (_s, p, seated) => {
    // Up for 45%, down hard by 58%, then held where it landed: on the table edge, or on the other palm.
    const down = p < 0.45 ? 0 : smooth(clamp((p - 0.45) / 0.13, 0, 1));
    const up = smooth(clamp(p / 0.45, 0, 1)) * (1 - down);
    const [rest, raised, landed] = seated ? [0.55, 1.7, 0.55] : [0.3, 1.9, 0.7];
    const shoulder = rest + (raised - rest) * up + (landed - rest) * down;
    return {
      joints: {
        torso: [-0.12 * down, 0, 0],
        upperArmR: [shoulder, 0, seated ? -0.05 : -0.35],
        foreArmR: [0.4 + (seated ? 0.45 : 0.6) * down, 0, 0],
        ...(seated ? {} : { upperArmL: [0.6, 0, 0.3] as Turn, foreArmL: [0.9, 0, 0] as Turn }),
      },
      mouth: "grin",
      brows: 0.6,
    };
  },
  boston: (s, p) => {
    const pump = 0.5 * (0.5 + 0.5 * Math.sin(TAU * 2 * s));
    return {
      joints: { upperArmL: [0.2, 0, -2.6], upperArmR: [0.2, 0, 2.6], foreArmL: [0, 0, -pump], foreArmR: [0, 0, pump], torso: [0.08, 0, 0], head: [0.2, 0, 0] },
      // A moment of happy surprise as the arms go up, then the grin and the cheer.
      mouth: p < 0.15 ? "surprise" : p < 0.3 ? "grin" : "open",
      brows: 1,
    };
  },
  // Rueful, not reproachful: brows up and a grin while the head shakes.
  shake: (s) => ({ joints: { head: [0, 0.38 * Math.sin(TAU * 2.2 * s), 0] }, mouth: "grin", brows: 0.4 }),
  shrug: () => ({
    joints: {
      upperArmL: [0.2, 0, -0.45],
      upperArmR: [0.2, 0, 0.45],
      foreArmL: [1.0, 0, 0],
      foreArmR: [1.0, 0, 0],
      handL: [0, -0.9, 0],
      handR: [0, 0.9, 0],
      head: [0, 0, 0.15],
    },
    mouth: "smile",
    brows: 0.8,
  }),
  grin: (s) => ({ joints: { head: [0.06 + 0.06 * Math.sin(TAU * 1.4 * s), 0, 0] }, mouth: "grin", brows: 0.8 }),
};

// ---- the frame ----

/** One frame of a body: fills `rig` (reused, so nothing is made per frame) and returns it. */
export function animate(scene: Scene, rig: Rig): Rig {
  const { t, m } = scene;
  const j = rig.joints;
  for (const name of JOINT_NAMES) set(j[name], 0, 0, 0);
  rig.pelvisY = m.joints.pelvis[1];
  rig.lift = 0;
  rig.mouth = "relaxed";
  rig.brows = 0;
  rig.hem = scene.seated ? SEATED_HEM : 1;
  const sway = scene.calm ? 0 : 1;
  const own = (scene.seed / 4294967296) * TAU;
  const out = armsOut(m);
  set(j.upperArmL, 0, 0, -out);
  set(j.upperArmR, 0, 0, out);
  set(j.foreArmL, 0.1, 0, 0);
  set(j.foreArmR, 0.1, 0, 0);

  let idle = sway;
  if (scene.seated) {
    const { holding, lean, look } = scene.seated;
    const legs = seatedLegs(m);
    rig.pelvisY = legs.pelvisY;
    set(j.thighL, legs.thigh, 0, -0.06);
    set(j.thighR, legs.thigh, 0, 0.06);
    set(j.shinL, legs.shin, 0, 0);
    set(j.shinR, legs.shin, 0, 0);
    set(j.footL, legs.foot, 0, 0);
    set(j.footR, legs.foot, 0, 0);
    // Upright and settled, elbows in: the fan held before the chest in the left hand, the right hand by the table
    // edge, reaching in to play.
    set(j.torso, -0.05 - 0.2 * lean, 0, 0);
    set(j.head, SEATED_HEAD, 0, 0);
    set(j.upperArmL, holding ? 0.3 : 0.35, 0, holding ? 0.25 : 0.15);
    set(j.foreArmL, holding ? 1.45 : 1.15, 0, 0);
    set(j.upperArmR, 0.35 + 0.5 * lean, 0, -0.15);
    set(j.foreArmR, 1.15 - 0.35 * lean, 0, 0);
    if (look) {
      set(j.head, look.pitch, look.yaw, 0);
      // The idle fades in as an eased look comes back to rest, so nothing jumps when it gets there.
      idle *= 1 - clamp((Math.abs(look.yaw) + Math.abs(look.pitch - SEATED_HEAD)) / 0.15, 0, 1);
    }
  } else if (scene.floating) {
    // The eyes where the swimmer's own are (just over the water), with a gentle bob; the arms paddle out at the
    // surface in slow circles and the legs kick softly below.
    const k = t * 1.8 + own;
    const reach = scene.calm ? 0.4 : 1;
    rig.lift = EYE_HEIGHT_STANDING - (m.height - 0.52 * m.head) + 0.035 * sway * Math.sin(k * 0.6);
    set(j.upperArmL, 0.35 * reach * Math.sin(k), 0, -(1.3 + 0.12 * reach * Math.cos(k)));
    set(j.upperArmR, -0.35 * reach * Math.sin(k), 0, 1.3 + 0.12 * reach * Math.cos(k));
    set(j.foreArmL, 0.5, 0, 0);
    set(j.foreArmR, 0.5, 0, 0);
    set(j.thighL, 0.2 + 0.25 * reach * Math.sin(k * 1.5), 0, 0);
    set(j.thighR, 0.2 - 0.25 * reach * Math.sin(k * 1.5), 0, 0);
    set(j.shinL, -0.4, 0, 0);
    set(j.shinR, -0.4, 0, 0);
  } else {
    const { phase, speed } = scene.gait;
    const a = strideShare(speed);
    const r = runShare(speed);
    const swing = (0.42 + 0.25 * r) * a;
    for (const side of SIDES) {
      const q = phase + (side === "L" ? 0 : Math.PI);
      j[`thigh${side}` as const][0] = Math.sin(q) * swing;
      // The knee folds as the leg swings through, more in a run.
      j[`shin${side}` as const][0] = -Math.max(0, Math.sin(q + 1.3)) * (0.75 + 0.6 * r) * a;
      // Each arm swings with the other leg.
      j[`upperArm${side}` as const][0] = -Math.sin(q) * swing * 0.8;
      j[`foreArm${side}` as const][0] += (0.25 + 0.7 * r) * a;
    }
    // The stance leg stays straight on the floor, so the hips dip as the legs open.
    rig.lift = -rig.pelvisY * (1 - Math.cos(swing * Math.sin(phase)));
    // Running leans in.
    set(j.torso, -(0.04 * a + 0.2 * r), Math.sin(phase) * 0.07 * a, 0);
    const tuck = scene.tuck;
    if (tuck > 0) {
      for (const side of SIDES) {
        j[`thigh${side}` as const][0] += 1.0 * tuck;
        j[`shin${side}` as const][0] -= 1.5 * tuck;
        j[`upperArm${side}` as const][0] += 0.6 * tuck;
      }
      j.upperArmL[2] -= 0.3 * tuck;
      j.upperArmR[2] += 0.3 * tuck;
    }
    idle = sway * (1 - a) * (1 - tuck);
  }

  if (idle > 0) {
    // Standing or sitting at ease: breathing, a little weight shift, a slow look around. None with Reduce motion.
    j.torso[0] += 0.012 * idle * Math.sin(1.3 * t + own);
    j.torso[2] += 0.02 * idle * Math.sin(0.5 * t + own);
    j.head[0] += 0.04 * idle * Math.sin(0.33 * t + own * 2);
    j.head[1] += 0.12 * idle * Math.sin(0.21 * t + own * 3);
    j.upperArmL[0] += 0.03 * idle * Math.sin(0.5 * t + own);
    j.upperArmR[0] += 0.03 * idle * Math.sin(0.5 * t + own + 1);
  }

  // A VR player's live head and hands first, so a gesture blends out of them and back.
  if (scene.head) set(j.head, scene.head.pitch, scene.head.yaw, 0);
  scene.hands?.forEach((hand, i) => hand && reachInto(rig, m, SIDES[i], hand));

  if (scene.act) {
    const { kind, ms } = scene.act;
    const p = clamp(ms / ACT_MS[kind], 0, 1);
    const e = envelope(p);
    const shape = ACTS[kind](ms / 1000, p, scene.seated !== null);
    for (const [name, turn] of Object.entries(shape.joints) as [JointName, Turn][]) {
      const now = j[name];
      for (let i = 0; i < 3; i += 1) now[i] += (turn[i] - now[i]) * e;
    }
    if (e > 0.25) rig.mouth = shape.mouth;
    rig.brows = (shape.brows ?? 0) * e;
  }
  return rig;
}

// ---- reaching ----

const DOWN = new Vector3(0, -1, 0);
const scratch = { matrix: new Matrix4(), part: new Matrix4(), euler: new Euler(), target: new Vector3(), shoulder: new Vector3() };

/** Bends one arm of the rig so its wrist lands on a tracked hand: the target is taken into the torso's own frame first. */
function reachInto(rig: Rig, m: Measurements, side: "L" | "R", hand: Hand): void {
  const { matrix, part, euler, target, shoulder } = scratch;
  const j = rig.joints;
  matrix.makeTranslation(0, rig.pelvisY, 0).multiply(part.makeRotationFromEuler(euler.set(...j.pelvis)));
  matrix.multiply(part.makeTranslation(...m.joints.torso)).multiply(part.makeRotationFromEuler(euler.set(...j.torso)));
  target.set(hand.x, hand.y - rig.lift, hand.z).applyMatrix4(matrix.invert());
  shoulder.set(...m.joints[`upperArm${side}`]);
  const solved = reachArm(shoulder, target, m.upperArm, m.foreArm, side === "L" ? -1 : 1);
  set(j[`upperArm${side}`], ...solved.upper);
  set(j[`foreArm${side}`], ...solved.fore);
  set(j[`hand${side}`], 0, 0, 0);
}

/**
 * Two-bone IK. Turns for the upper arm (in its parent's frame) and the forearm (in the upper arm's) that put
 * the wrist on `target`, the elbow bending down, back and out to `side` (-1 left, 1 right). Both points are in
 * the upper arm's parent frame. A target out of reach gets the straight arm pointing at it; one too close,
 * the arm folded as far as it goes. `wrist` is where the wrist lands.
 */
export function reachArm(shoulder: Vector3, target: Vector3, upper: number, fore: number, side: -1 | 1): { upper: Turn; fore: Turn; wrist: Vector3 } {
  const toward = target.clone().sub(shoulder);
  const length = toward.length();
  const dir = length > 1e-6 ? toward.divideScalar(length) : DOWN.clone();
  const reach = clamp(length, Math.abs(upper - fore) + 0.01, upper + fore - 1e-5);
  const bend = Math.acos(clamp((upper * upper + reach * reach - fore * fore) / (2 * upper * reach), -1, 1));
  const pole = new Vector3(side * 0.5, -1, 0.6);
  let across = pole.sub(dir.clone().multiplyScalar(pole.dot(dir)));
  if (across.lengthSq() < 1e-8) across = new Vector3(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z));
  across.normalize();
  const elbowDir = dir.clone().multiplyScalar(Math.cos(bend)).add(across.multiplyScalar(Math.sin(bend)));
  const wrist = shoulder.clone().add(dir.clone().multiplyScalar(reach));
  const foreDir = wrist.clone().sub(shoulder.clone().add(elbowDir.clone().multiplyScalar(upper))).divideScalar(fore);
  const upperTurn = new Quaternion().setFromUnitVectors(DOWN, elbowDir);
  const foreTurn = upperTurn.clone().invert().multiply(new Quaternion().setFromUnitVectors(DOWN, foreDir.normalize()));
  const euler = new Euler();
  const turn = (q: Quaternion): Turn => {
    euler.setFromQuaternion(q, "XYZ");
    return [euler.x, euler.y, euler.z];
  };
  return { upper: turn(upperTurn), fore: turn(foreTurn), wrist };
}

// ---- the face ----

/** How long a blink takes, s. */
const BLINK_S = 0.16;

/**
 * 0 open to 1 closed. One blink in every four-second slot, at a seeded moment in its first 0.4 to 2.4 s,
 * so blinks come 2 to 6 s apart, look random and cost nothing to work out at any time.
 */
export function blinkAt(seed: number, t: number): number {
  const slot = Math.floor(t / 4);
  const into = (t - (slot * 4 + 0.4 + mix(seed, slot) * 2)) / BLINK_S;
  return into < 0 || into > 1 ? 0 : 1 - Math.abs(2 * into - 1);
}

/** Facing angle (as ry: the figure faces -Z turned by it) from (x, z) toward (tx, tz). */
export const bearing = (x: number, z: number, tx: number, tz: number): number => Math.atan2(x - tx, z - tz);

export interface Mover {
  x: number;
  z: number;
  speed: number;
}

/**
 * Where the eyes glance, -1..1 to the figure's right: toward the nearest member moving within 6 m in front
 * of `facing` (body and head turn together), else straight ahead.
 */
export function gazeAt(x: number, z: number, facing: number, movers: Iterable<Mover>): number {
  let nearest = Infinity;
  let gaze = 0;
  for (const other of movers) {
    const distance = Math.hypot(other.x - x, other.z - z);
    if (other.speed < 0.4 || distance < 0.2 || distance > 6 || distance >= nearest) continue;
    const turn = wrap(bearing(x, z, other.x, other.z) - facing);
    if (Math.abs(turn) > 1.3) continue;
    nearest = distance;
    // A turn to the left is +; the gaze is + to the right.
    gaze = clamp(-turn / 0.9, -1, 1);
  }
  return gaze;
}
