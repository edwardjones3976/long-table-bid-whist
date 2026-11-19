/**
 * Carrying: which pointer holds which thing on the table, and where a held thing rides.
 * AtTable.tsx draws from this, Hands.tsx shows each hand's state from it, and nothing here knows a card rule.
 *
 * WHAT THE LIBRARIES DO, as read in node_modules (@react-three/xr 6.6.32 dist/default.js, pointer.js, xr.js, space.js;
 * @pmndrs/pointer-events 6.6.32 dist/combine.js, pointer.js, event.js, intersections/sphere.js and ray.js;
 * @pmndrs/xr dist/pointer/event.js and store.js; @react-three/fiber 9.8.2 dist/events-*.esm.js):
 *
 *  One controller has two pointers and one of them is live. DefaultXRController puts a grab pointer (grip space, a
 *  sphere of `radius`, pressed by squeeze) and a ray pointer (target-ray space, pressed by select, blind nearer than
 *  0.2 m) in one CombinedPointer(false). Every frame that enables exactly one: the pointer holding a capture, else the
 *  one whose hit is nearest, so the grab pointer whenever its sphere touches anything that listens and the ray
 *  otherwise. The other is disabled: its hover ends (pointerout, pointerleave), its ray is not drawn and its button
 *  emits nothing. A tracked hand is the same with a pinch as both buttons. So grip and trigger squeezed together on
 *  a card give one grab and no click, and a held thing keeps its hand, by the library alone. The two hands are
 *  independent: the root CombinedPointer(true) commits every controller every frame (useFrame priority -50).
 *  The guards here add only what the library cannot know: two hands (or a hand and the mouse) on one thing.
 *
 *  What an event carries. pointerId: one number per pointer object (23412 upward; a controller's grab and ray
 *  differ, and a controller that reconnects gets new ones). pointerType: "grab" or "ray"; the mouse and a finger on
 *  glass come through R3F with the browser's own id and "mouse", "touch" or "pen". pointerState: the library's
 *  input source state, { type: "controller" | "hand", inputSource, ... }, so inputSource.handedness is the hand
 *  (R3F events have none). pointerPosition and pointerQuaternion: the pointer space's place and turn in the world
 *  when the hit was worked out (the grip or fingertip for a grab, the start of the ray for a ray).
 *
 *  Capture. object.setPointerCapture(pointerId): the library patches Object3D with it, and R3F offers the same three
 *  calls on event.target and event.currentTarget for the mouse. A capturing pointer stops looking at the scene: every
 *  frame its hit is recomputed from the live pose (a grab carries the grabbed point rigidly with the hand, a ray keeps
 *  it at the same distance along the ray) and pointermove goes to the capturing object. pointerup clears the capture
 *  and is then emitted there; the library's click needs the press to have begun on that same object.
 *
 *  A release that is not one. WebXR ends the action of a controller that goes away with a button down by
 *  `squeezeend` or `selectend` alone; a button really let go gets `squeeze` or `select` first (WebXR Device API,
 *  primary actions; the emulator the browser tests use does the same). The library binds pointer.up() to the "end"
 *  event, so both arrive as an ordinary pointerup: a card held over the felt by a controller that switched off would
 *  be played. This was seen in an emulated headset. noteAction() and wasLetGo() below tell the two apart.
 *
 *  What ends a capture with no pointerup at all. A pointer taken away while it is live is exited: pointercancel,
 *  then pointerout and pointerleave, on the capturing object. The session ending or going out of view (system menu,
 *  headset off): every pointer is disabled, the capture is dropped in silence and only pointerout and pointerleave
 *  are emitted. For the mouse R3F never calls an object's onPointerCancel or onLostPointerCapture; it drops the
 *  capture a frame after the browser's lostpointercapture. The one test that holds for every pointer is to ask each
 *  frame whether the capture is still there (hasPointerCapture): sweep() below.
 */
import { Quaternion, Vector3 } from "three";
import { TAP_SLOP } from "./direct";

export type Hand = "left" | "right" | "none";
/** How a thing was taken: a gripping hand, a controller's ray, the mouse, or a finger on a touch screen. */
export type Grasp = "grip" | "ray" | "mouse" | "touch";

/** How near a controller's grip must be to a thing to take hold of it (the library's own sphere is 0.07 m). */
export const GRAB_RADIUS = 0.09;
/** A trigger held this long on a card is a carry, not a click (the library itself calls a press of up to 300 ms a click). */
export const HOLD_MS = 250;
/** A card taken by the ray comes to this far in front of that hand, over this many seconds. */
export const BRING_DISTANCE = 0.25;
export const BRING_TIME = 0.12;

export interface Press {
  pointerId: number;
  hand: Hand;
  how: Grasp;
  /** The controller to buzz (an XRInputSource); undefined for the mouse and touch screens. */
  source: unknown;
  /** A controller or tracked hand: it has a pose of its own, read every frame. */
  xr: boolean;
}

/** Who is pressing, from a pointer event of either kind (see the notes above). */
export function pressOf(event: { pointerId: number; pointerType?: string; pointerState?: unknown }): Press {
  const state = event.pointerState;
  if (state !== null && typeof state === "object" && "inputSource" in state) {
    const source = (state as { inputSource: { handedness?: string } | null }).inputSource;
    const side = source?.handedness;
    return { pointerId: event.pointerId, hand: side === "left" || side === "right" ? side : "none", how: event.pointerType === "ray" ? "ray" : "grip", source, xr: true };
  }
  return { pointerId: event.pointerId, hand: "none", how: event.pointerType === "mouse" ? "mouse" : "touch", source: undefined, xr: false };
}

export interface Carry<Rig = unknown> {
  pointerId: number;
  /** The carried thing's three.js name: card-<id>, pile-stock, token-<button id>... */
  thing: string;
  hand: Hand;
  how: Grasp;
  /** Where it was taken from: "hand", "kitty" or "spread" for a card, else "table". */
  from: string;
  /** False while the press may still be a tap; latched true once it has become a carry, and then letting go drops. */
  carrying: boolean;
  /** The drop zone it is over, as last measured; null over none. */
  over: string | null;
  /** What the 3D layer keeps for this carry (its capture, its offsets). */
  rig: Rig;
}

/**
 * What every pointer holds, keyed by pointer id. A thing is held by at most one pointer and a hand holds at most
 * one thing; an entry leaves the map exactly once (end, sweep or clear), so one carry can never act twice.
 */
export class Carries<Rig = unknown> {
  private readonly held = new Map<number, Carry<Rig>>();
  private readonly listeners = new Set<() => void>();
  /** Goes up on every change; React re-reads on it. */
  version = 0;

  private changed(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get(pointerId: number): Carry<Rig> | undefined {
    return this.held.get(pointerId);
  }

  /** The carry that has this thing, if any pointer does. */
  holder(thing: string): Carry<Rig> | undefined {
    for (const carry of this.held.values()) if (carry.thing === thing) return carry;
    return undefined;
  }

  /** What the left or right hand holds. The mouse and touch screens are no hand, and each finger is its own pointer. */
  inHand(hand: Hand): Carry<Rig> | undefined {
    if (hand === "none") return undefined;
    for (const carry of this.held.values()) if (carry.hand === hand) return carry;
    return undefined;
  }

  /** Whether this pointer must neither hover nor press: it is carrying, or its hand is, with its other pointer. */
  blocked(pointerId: number, hand: Hand): boolean {
    return this.held.has(pointerId) || this.inHand(hand) !== undefined;
  }

  /** Takes hold. False, with nothing changed, when the pointer or its hand is already carrying or the thing is already held. */
  begin(carry: Carry<Rig>): boolean {
    if (this.blocked(carry.pointerId, carry.hand) || this.holder(carry.thing)) return false;
    this.held.set(carry.pointerId, carry);
    this.changed();
    return true;
  }

  /** Records that the press became a carry, or which zone it is over. */
  update(pointerId: number, patch: { carrying?: boolean; over?: string | null }): void {
    const carry = this.held.get(pointerId);
    if (!carry) return;
    const carrying = patch.carrying ?? carry.carrying;
    const over = patch.over === undefined ? carry.over : patch.over;
    if (carrying === carry.carrying && over === carry.over) return;
    carry.carrying = carrying;
    carry.over = over;
    this.changed();
  }

  /** Lets go: the entry is removed and handed back, once. A second call for the same pointer gets nothing. */
  end(pointerId: number): Carry<Rig> | undefined {
    const carry = this.held.get(pointerId);
    if (!carry) return undefined;
    this.held.delete(pointerId);
    this.changed();
    return carry;
  }

  /** Removes and returns every carry whose pointer is gone (a controller switched off, a session ended, a lost capture). */
  sweep(alive: (carry: Carry<Rig>) => boolean): Carry<Rig>[] {
    const gone = [...this.held.values()].filter((carry) => !alive(carry));
    for (const carry of gone) this.held.delete(carry.pointerId);
    if (gone.length) this.changed();
    return gone;
  }

  /** Removes and returns everything carried: a cancel, or leaving the table. */
  clear(): Carry<Rig>[] {
    return this.sweep(() => false);
  }

  list(): Carry<Rig>[] {
    return [...this.held.values()];
  }

  /** For browser tests: what each pointer holds, as plain data. */
  report(): Omit<Carry, "rig">[] {
    return this.list().map(({ pointerId, thing, hand, how, from, carrying, over }) => ({ pointerId, thing, hand, how, from, carrying, over }));
  }
}

/** The one registry: only one table is handled at a time (the one I sit or stand at). */
export const carries = new Carries();

// Which of a controller's actions ("select", "squeeze") last ran to its end. Controllers that are gone are forgotten.
const completed = new WeakMap<object, Set<string>>();

/** To be told of every `selectstart`, `select`, `squeezestart` and `squeeze` of the XR session (Tables.tsx listens). */
export function noteAction(event: { type: string; inputSource: object }): void {
  const kinds = completed.get(event.inputSource) ?? new Set<string>();
  completed.set(event.inputSource, kinds);
  // A new press has not been let go yet; `select` or `squeeze` says this one was.
  if (event.type.endsWith("start")) kinds.delete(event.type.slice(0, -5));
  else kinds.add(event.type);
}

/**
 * Whether the release behind a pointerup or click was the player's own. `native` is the browser's event under it
 * (event.nativeEvent). False only for WebXR's `selectend` or `squeezeend` with no `select` or `squeeze` before it:
 * the controller switched off, or the session was taken away, with the button still down. The mouse, a finger and
 * anything else are always let go.
 */
export function wasLetGo(native: unknown): boolean {
  const { type, inputSource } = (native ?? {}) as { type?: unknown; inputSource?: object | null };
  if (!inputSource || (type !== "selectend" && type !== "squeezeend")) return true;
  return completed.get(inputSource)?.has(type.slice(0, -3)) ?? false;
}

/** How far a press may wander and still be a tap: 3 cm in the hand, and the same small angle of a ray at any distance. */
export function tapSlop(how: Grasp, distance: number): number {
  return how === "ray" ? Math.max(TAP_SLOP, distance * 0.05) : TAP_SLOP;
}

/**
 * Whether a press has become a carry: it moved further than a tap may, or (a ray on a thing that comes to the hand)
 * the trigger was held. `distance` is from the pointer to the thing when it was pressed.
 */
export function isCarry(how: Grasp, moved: number, distance: number, heldMs: number, comes: boolean): boolean {
  return moved >= tapSlop(how, distance) || (how === "ray" && comes && heldMs >= HOLD_MS);
}

/** A gate that opens at most once per `ms` for each key: one hover cue per hand, however many cards it brushes. */
export function makeGate(ms: number): (key: string, now: number) => boolean {
  const last = new Map<string, number>();
  return (key, now) => {
    const before = last.get(key);
    if (before !== undefined && now - before < ms) return false;
    last.set(key, now);
    return true;
  };
}

/** A place and a turn. */
export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}

export const makePose = (): Pose => ({ position: new Vector3(), quaternion: new Quaternion() });

const turn = new Quaternion();
const a = new Vector3();
const b = new Vector3();
const c = new Vector3();

/** A thing as its pointer sees it: its pose in the pointer's own frame. Taken once, at the moment of the grab. */
export function attach(pointer: Pose, thing: Pose, out: Pose): Pose {
  turn.copy(pointer.quaternion).invert();
  out.position.copy(thing.position).sub(pointer.position).applyQuaternion(turn);
  out.quaternion.copy(turn).multiply(thing.quaternion);
  return out;
}

/** Where a thing with that offset is now: it follows the pointer one to one, place and turn. */
export function ride(pointer: Pose, offset: Pose, out: Pose): Pose {
  out.position.copy(offset.position).applyQuaternion(pointer.quaternion).add(pointer.position);
  out.quaternion.copy(pointer.quaternion).multiply(offset.quaternion);
  return out;
}

/** `t` of the way from one pose to another (0 to 1). */
export function blend(from: Pose, to: Pose, t: number, out: Pose): Pose {
  out.position.lerpVectors(from.position, to.position, t);
  out.quaternion.slerpQuaternions(from.quaternion, to.quaternion, t);
  return out;
}

/** Slow out, slow in, 0 to 1. */
export const ease = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Where a card brought by the ray rides in that ray's frame: straight ahead, upright, its face back toward the hand. */
export const RAY_HOLD: Pose = { position: new Vector3(0, 0, -BRING_DISTANCE), quaternion: new Quaternion() };

/** How far a held card's face may turn from its holder's eyes, in radians: short of the quarter turn it must never pass. */
export const FACE_LIMIT = 1.4;

/** Turns a thing back, by the least it takes, so that its face (its own +z) is within `limit` of the direction to `eye`. */
export function faceHolder(thing: Pose, eye: Vector3, limit = FACE_LIMIT): Pose {
  a.set(0, 0, 1).applyQuaternion(thing.quaternion);
  b.copy(eye).sub(thing.position);
  if (b.lengthSq() < 1e-10) return thing;
  const angle = a.angleTo(b.normalize());
  if (angle <= limit) return thing;
  c.crossVectors(a, b);
  // Face dead away from the eyes: any axis across the face will do.
  if (c.lengthSq() < 1e-10) c.set(0, 1, 0).applyQuaternion(thing.quaternion);
  thing.quaternion.premultiply(turn.setFromAxisAngle(c.normalize(), angle - limit));
  return thing;
}

/** Lifts a flat thing `width` by `height` just far enough that its lowest corner is not below `floor`. */
export function keepAbove(thing: Pose, width: number, height: number, floor: number): Pose {
  a.set(1, 0, 0).applyQuaternion(thing.quaternion);
  b.set(0, 1, 0).applyQuaternion(thing.quaternion);
  const lowest = thing.position.y - (Math.abs(a.y) * width + Math.abs(b.y) * height) / 2;
  if (lowest < floor) thing.position.y += floor - lowest;
  return thing;
}

/** The point `distance` along a pointer's ray (its own -z). */
export function rayPoint(pointer: Pose, distance: number, out: Vector3): Vector3 {
  return out.set(0, 0, -distance).applyQuaternion(pointer.quaternion).add(pointer.position);
}
