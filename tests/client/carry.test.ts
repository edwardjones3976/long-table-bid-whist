/**
 * Carrying (client/src/tableui/carry.ts): which pointer holds what, and where a held thing rides.
 * The registry is driven the way AtTable.tsx drives it, with events shaped like the ones the pointer
 * library sends for each controller's grip and ray; the 3D layer itself needs a headset.
 */
import { Euler, Quaternion, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { cue, cueLog } from "../../client/src/controls/feedback";
import {
  attach,
  blend,
  BRING_DISTANCE,
  BRING_TIME,
  Carries,
  ease,
  FACE_LIMIT,
  faceHolder,
  GRAB_RADIUS,
  HOLD_MS,
  isCarry,
  keepAbove,
  makeGate,
  makePose,
  noteAction,
  pressOf,
  RAY_HOLD,
  rayPoint,
  ride,
  tapSlop,
  wasLetGo,
  type Pose,
} from "../../client/src/tableui/carry";
import { TAP_SLOP } from "../../client/src/tableui/direct";

const LEFT = { handedness: "left" };
const RIGHT = { handedness: "right" };
/** A pointer event as either event system sends it: the library's carry pointerState, the browser's do not. */
const event = (pointerId: number, pointerType: string, inputSource?: object, type = "controller") => ({
  pointerId,
  pointerType,
  pointerState: inputSource && { type, inputSource },
});
// One controller has two pointers, each with its own id.
const leftGrip = event(23412, "grab", LEFT);
const leftRay = event(23413, "ray", LEFT);
const rightGrip = event(23414, "grab", RIGHT);
const rightRay = event(23415, "ray", RIGHT);
const mouse = event(1, "mouse");

/** What a piece does when it is pressed: takes hold, if the registry lets it. */
function take(held: Carries, pointer: ReturnType<typeof event>, thing: string, from = "hand"): boolean {
  const press = pressOf(pointer);
  return held.begin({ pointerId: press.pointerId, thing, hand: press.hand, how: press.how, from, carrying: false, over: null, rig: null });
}

describe("who is pressing", () => {
  it("reads the hand, the kind of hold and the controller to buzz from the library's event", () => {
    expect(pressOf(leftGrip)).toEqual({ pointerId: 23412, hand: "left", how: "grip", source: LEFT, xr: true });
    expect(pressOf(rightRay)).toEqual({ pointerId: 23415, hand: "right", how: "ray", source: RIGHT, xr: true });
    // A tracked hand's pinch comes as a grab or a ray too.
    expect(pressOf(event(23420, "grab", RIGHT, "hand"))).toMatchObject({ hand: "right", how: "grip", xr: true });
    // A source that is neither hand (a gaze pointer) is still a pointer of its own.
    expect(pressOf(event(23430, "ray", { handedness: "none" }))).toMatchObject({ hand: "none", how: "ray", xr: true });
  });

  it("knows the mouse and a finger on glass by having no controller behind them", () => {
    expect(pressOf(mouse)).toEqual({ pointerId: 1, hand: "none", how: "mouse", source: undefined, xr: false });
    expect(pressOf(event(7, "touch"))).toMatchObject({ how: "touch", xr: false });
    expect(pressOf(event(8, "pen"))).toMatchObject({ how: "touch", xr: false });
    expect(pressOf({ pointerId: 9 })).toMatchObject({ how: "touch", xr: false });
    expect(pressOf({ pointerId: 9, pointerType: "mouse", pointerState: null })).toMatchObject({ how: "mouse", xr: false });
  });
});

describe("carrying", () => {
  it("lets both hands carry at once, each on its own", () => {
    const held = new Carries();
    const seen = vi.fn();
    held.subscribe(seen);
    expect(take(held, leftGrip, "card-a")).toBe(true);
    expect(take(held, rightGrip, "card-b")).toBe(true);
    expect(held.inHand("left")?.thing).toBe("card-a");
    expect(held.inHand("right")?.thing).toBe("card-b");
    expect(held.holder("card-b")?.pointerId).toBe(23414);
    // The left card becomes a carry and comes over the felt; the right one is untouched.
    held.update(23412, { carrying: true });
    held.update(23412, { over: "play" });
    expect(held.report()).toEqual([
      { pointerId: 23412, thing: "card-a", hand: "left", how: "grip", from: "hand", carrying: true, over: "play" },
      { pointerId: 23414, thing: "card-b", hand: "right", how: "grip", from: "hand", carrying: false, over: null },
    ]);
    // Letting the left one go leaves the right one held.
    expect(held.end(23412)?.thing).toBe("card-a");
    expect(held.list().map((carry) => carry.thing)).toEqual(["card-b"]);
    expect(held.inHand("left")).toBeUndefined();
    expect(seen).toHaveBeenCalledTimes(5);
    expect(held.version).toBe(5);
  });

  it("never lets one thing be held twice: a second pointer pressing it is ignored", () => {
    const held = new Carries();
    expect(take(held, leftGrip, "card-a")).toBe(true);
    const before = held.version;
    expect(take(held, rightGrip, "card-a")).toBe(false);
    expect(take(held, rightRay, "card-a")).toBe(false);
    expect(take(held, mouse, "card-a")).toBe(false);
    expect(held.list()).toHaveLength(1);
    expect(held.holder("card-a")?.hand).toBe("left");
    expect(held.version).toBe(before);
    // The hand that was refused holds nothing, and is free to take something else.
    expect(held.inHand("right")).toBeUndefined();
    expect(take(held, rightGrip, "card-b")).toBe(true);
  });

  it("takes one thing for a grip and trigger squeezed together, whichever lands first, and lights nothing else", () => {
    const grip = new Carries();
    expect(take(grip, leftGrip, "card-a")).toBe(true);
    // The trigger of the same hand: its ray may cross a token or the felt, and presses neither.
    expect(grip.blocked(23413, "left")).toBe(true);
    expect(take(grip, leftRay, "token-bid-4", "table")).toBe(false);
    expect(grip.list()).toHaveLength(1);

    const ray = new Carries();
    expect(take(ray, leftRay, "card-a")).toBe(true);
    expect(ray.blocked(23412, "left")).toBe(true);
    expect(take(ray, leftGrip, "card-b")).toBe(false);
    expect(ray.list().map((carry) => [carry.thing, carry.how])).toEqual([["card-a", "ray"]]);
    // The other hand is not held up by any of it.
    expect(ray.blocked(23414, "right")).toBe(false);
    expect(ray.blocked(23415, "right")).toBe(false);
    // And once the hand lets go, both its pointers are free again.
    ray.end(23413);
    expect(ray.blocked(23412, "left")).toBe(false);
    expect(ray.blocked(23413, "left")).toBe(false);
  });

  it("gives one pointer one thing at a time", () => {
    const held = new Carries();
    expect(take(held, leftGrip, "card-a")).toBe(true);
    expect(take(held, leftGrip, "card-b")).toBe(false);
    expect(held.blocked(23412, "left")).toBe(true);
    expect(held.get(23412)?.thing).toBe("card-a");
  });

  it("treats the mouse and each finger as pointers of their own, of no hand", () => {
    const held = new Carries();
    expect(take(held, mouse, "card-a")).toBe(true);
    expect(take(held, event(7, "touch"), "card-b")).toBe(true);
    expect(take(held, event(8, "touch"), "card-c")).toBe(true);
    expect(held.inHand("none")).toBeUndefined();
    expect(held.blocked(1, "none")).toBe(true);
    expect(held.blocked(2, "none")).toBe(false);
    // A hand can still carry beside them.
    expect(take(held, rightGrip, "card-d")).toBe(true);
    expect(held.list()).toHaveLength(4);
  });

  it("records a change only when something changed, and keeps a carry a carry", () => {
    const held = new Carries();
    take(held, leftGrip, "card-a");
    const before = held.version;
    held.update(23412, {});
    held.update(23412, { carrying: false, over: null });
    held.update(999, { carrying: true });
    expect(held.version).toBe(before);
    held.update(23412, { carrying: true });
    held.update(23412, { over: "play" });
    held.update(23412, { over: "play" });
    expect(held.version).toBe(before + 2);
    // Moving off every zone clears `over` and leaves it carried.
    held.update(23412, { over: null });
    expect(held.get(23412)).toMatchObject({ carrying: true, over: null });
  });

  it("puts everything back on cancel, and tells its listeners once", () => {
    const held = new Carries();
    take(held, leftGrip, "card-a");
    take(held, rightRay, "pile-stock", "table");
    take(held, mouse, "card-c");
    const seen = vi.fn();
    held.subscribe(seen);
    const back = held.clear();
    expect(back.map((carry) => carry.thing)).toEqual(["card-a", "pile-stock", "card-c"]);
    expect(back.map((carry) => carry.hand)).toEqual(["left", "right", "none"]);
    expect(held.list()).toEqual([]);
    expect(held.inHand("left")).toBeUndefined();
    expect(seen).toHaveBeenCalledTimes(1);
    // Nothing held: nothing to put back, nobody told.
    expect(held.clear()).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("clears up after a controller that went away: only its carry goes, and it cannot act afterwards", () => {
    const held = new Carries();
    take(held, leftGrip, "card-a");
    take(held, rightGrip, "card-b");
    // The right controller has switched off: its pointer no longer holds its capture.
    const gone = held.sweep((carry) => carry.hand !== "right");
    expect(gone.map((carry) => carry.thing)).toEqual(["card-b"]);
    expect(held.list().map((carry) => carry.thing)).toEqual(["card-a"]);
    expect(held.holder("card-b")).toBeUndefined();
    // A late release from that pointer finds nothing to let go of.
    expect(held.end(23414)).toBeUndefined();
    // With every pointer alive, a sweep changes nothing.
    const before = held.version;
    expect(held.sweep(() => true)).toEqual([]);
    expect(held.version).toBe(before);
    // The session ends: everything goes.
    expect(held.sweep(() => false).map((carry) => carry.thing)).toEqual(["card-a"]);
    expect(held.list()).toEqual([]);
  });

  it("hands a carry back exactly once, so one carry can never send two moves", () => {
    const held = new Carries();
    take(held, leftGrip, "card-a");
    held.update(23412, { carrying: true, over: "play" });
    const sent: string[] = [];
    // What a release does: the carry leaves the map first, then acts.
    const release = (): void => {
      const carry = held.end(23412);
      if (carry?.carrying && carry.over) sent.push(`${carry.thing} -> ${carry.over}`);
    };
    release();
    release();
    held.sweep(() => false);
    release();
    expect(sent).toEqual(["card-a -> play"]);
  });

  it("stops telling a listener that has unsubscribed", () => {
    const held = new Carries();
    const seen = vi.fn();
    const stop = held.subscribe(seen);
    take(held, leftGrip, "card-a");
    stop();
    held.end(23412);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe("a release that is not one", () => {
  // WebXR ends a press cut short (the controller switched off) with the "end" event alone; a button really let go
  // gets `squeeze` or `select` first. The pointer library reports both as a release.
  it("takes a button really let go for a release, however often it is asked", () => {
    const hand = { handedness: "right" };
    noteAction({ type: "squeezestart", inputSource: hand });
    noteAction({ type: "squeeze", inputSource: hand });
    expect(wasLetGo({ type: "squeezeend", inputSource: hand })).toBe(true);
    expect(wasLetGo({ type: "squeezeend", inputSource: hand })).toBe(true);
  });

  it("does not take a controller that switched off with its grip down for one: the card must go back, not be played", () => {
    const hand = { handedness: "right" };
    noteAction({ type: "squeezestart", inputSource: hand });
    expect(wasLetGo({ type: "squeezeend", inputSource: hand })).toBe(false);
    // Nor when an earlier squeeze of the same hand ran to its end.
    noteAction({ type: "squeeze", inputSource: hand });
    expect(wasLetGo({ type: "squeezeend", inputSource: hand })).toBe(true);
    noteAction({ type: "squeezestart", inputSource: hand });
    expect(wasLetGo({ type: "squeezeend", inputSource: hand })).toBe(false);
  });

  it("keeps the trigger and the grip apart, and one hand from the other", () => {
    const left = { handedness: "left" };
    const right = { handedness: "right" };
    noteAction({ type: "selectstart", inputSource: left });
    noteAction({ type: "squeezestart", inputSource: left });
    noteAction({ type: "select", inputSource: left });
    expect(wasLetGo({ type: "selectend", inputSource: left })).toBe(true);
    expect(wasLetGo({ type: "squeezeend", inputSource: left })).toBe(false);
    expect(wasLetGo({ type: "selectend", inputSource: right })).toBe(false);
    expect(wasLetGo({ type: "squeezeend", inputSource: right })).toBe(false);
  });

  it("always takes the mouse, a finger and anything that is not such an event for a release", () => {
    expect(wasLetGo({ type: "pointerup" })).toBe(true);
    expect(wasLetGo({ type: "click", inputSource: null })).toBe(true);
    expect(wasLetGo(undefined)).toBe(true);
    expect(wasLetGo(null)).toBe(true);
    // A completed action's own events are not asked about, but would not be refused.
    expect(wasLetGo({ type: "select", inputSource: {} })).toBe(true);
  });
});

describe("a press, a tap and a carry", () => {
  it("calls a press that stayed within 3 cm a tap, in the hand or under the mouse", () => {
    expect(TAP_SLOP).toBeCloseTo(0.03);
    for (const how of ["grip", "mouse", "touch"] as const) {
      expect(tapSlop(how, 0.5)).toBe(TAP_SLOP);
      expect(isCarry(how, 0.029, 0.05, 0, true)).toBe(false);
      expect(isCarry(how, 0.03, 0.05, 0, true)).toBe(true);
    }
    // However long a grip is held, a hand that has not moved has not carried.
    expect(isCarry("grip", 0, 0.05, 5000, true)).toBe(false);
  });

  it("allows a ray the same small angle at any distance", () => {
    expect(tapSlop("ray", 0.3)).toBe(TAP_SLOP);
    expect(tapSlop("ray", 2)).toBeCloseTo(0.1);
    expect(isCarry("ray", 0.09, 2, 0, false)).toBe(false);
    expect(isCarry("ray", 0.11, 2, 0, false)).toBe(true);
  });

  it("turns a trigger held on a card into a carry, and leaves a quick pull a click", () => {
    expect(HOLD_MS).toBeGreaterThanOrEqual(150);
    expect(HOLD_MS).toBeLessThanOrEqual(300);
    expect(isCarry("ray", 0, 0.6, HOLD_MS - 1, true)).toBe(false);
    expect(isCarry("ray", 0, 0.6, HOLD_MS, true)).toBe(true);
    // A token or a pile does not come to the hand: holding the trigger on one is still a press.
    expect(isCarry("ray", 0, 0.6, 5000, false)).toBe(false);
  });

  it("opens the hover gate once per 150 ms for each hand", () => {
    const gate = makeGate(150);
    expect(gate("left", 1000)).toBe(true);
    expect(gate("left", 1100)).toBe(false);
    // The other hand has its own.
    expect(gate("right", 1100)).toBe(true);
    expect(gate("left", 1149)).toBe(false);
    expect(gate("left", 1150)).toBe(true);
    expect(gate("left", 1200)).toBe(false);
  });
});

const pose = (position: [number, number, number], euler: [number, number, number] = [0, 0, 0]): Pose => ({
  position: new Vector3(...position),
  quaternion: new Quaternion().setFromEuler(new Euler(...euler)),
});
const near = (a: Pose, b: Pose): void => {
  expect(a.position.distanceTo(b.position)).toBeLessThan(1e-9);
  expect(a.quaternion.angleTo(b.quaternion)).toBeLessThan(1e-6);
};
/** The way a thing's face looks: its own +z. */
const facing = (thing: Pose): Vector3 => new Vector3(0, 0, 1).applyQuaternion(thing.quaternion);

describe("where a held thing rides", () => {
  it("keeps the offset it had when it was taken and follows the hand one to one", () => {
    const hand = pose([0.2, 0.9, -0.3], [0.4, -0.3, 0.1]);
    const card = pose([0.23, 0.82, -0.36], [-1.05, 0, 0]);
    const offset = attach(hand, card, makePose());
    // At the moment of the grab it is exactly where it was.
    near(ride(hand, offset, makePose()), card);
    // The hand moves and turns: the card is in the same place in the hand's own frame.
    const later = pose([-0.1, 1.05, -0.5], [-0.2, 0.9, 0.5]);
    const ridden = ride(later, offset, makePose());
    near(attach(later, ridden, makePose()), offset);
    // A hand that only moves carries the card the same distance, unturned.
    const shifted: Pose = { position: hand.position.clone().add(new Vector3(0.1, 0.05, -0.2)), quaternion: hand.quaternion.clone() };
    near(ride(shifted, offset, makePose()), { position: card.position.clone().add(new Vector3(0.1, 0.05, -0.2)), quaternion: card.quaternion });
  });

  it("swings a card held out in front round with the wrist", () => {
    const hand = pose([0, 1, 0]);
    const offset = attach(hand, pose([0, 1, -0.1]), makePose());
    // A quarter turn to the left about the vertical: what was ahead is now to the left.
    const turned = ride(pose([0, 1, 0], [0, Math.PI / 2, 0]), offset, makePose());
    expect(turned.position.x).toBeCloseTo(-0.1);
    expect(turned.position.z).toBeCloseTo(0);
    expect(turned.position.y).toBeCloseTo(1);
  });

  it("brings a card taken by the ray to a quarter of a metre in front of that hand, then follows the same way", () => {
    expect(BRING_DISTANCE).toBeCloseTo(0.25);
    expect(BRING_TIME).toBeCloseTo(0.12);
    const hand = pose([0.1, 0.95, -0.2], [-0.5, 0.2, 0]);
    const card = pose([0.3, 0.78, -0.9], [-1.05, 0, 0]);
    const offset = attach(hand, card, makePose());
    const at = (t: number): Pose => ride(hand, blend(offset, RAY_HOLD, ease(t), makePose()), makePose());
    // It starts where it lay and ends 0.25 m along the ray, its face back toward the hand.
    near(at(0), card);
    const arrived = at(1);
    expect(arrived.position.distanceTo(rayPoint(hand, BRING_DISTANCE, new Vector3()))).toBeLessThan(1e-9);
    expect(arrived.position.distanceTo(hand.position)).toBeCloseTo(BRING_DISTANCE);
    expect(facing(arrived).angleTo(hand.position.clone().sub(arrived.position))).toBeLessThan(1e-6);
    // On the way it only comes nearer.
    let last = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const left = at(t).position.distanceTo(arrived.position);
      expect(left).toBeLessThanOrEqual(last + 1e-9);
      last = left;
    }
    // Afterwards it rides the hand rigidly, like a card taken by a grip.
    const moved = pose([-0.2, 1.1, -0.1], [0.3, -0.6, 0.2]);
    const riding = ride(moved, RAY_HOLD, makePose());
    expect(riding.position.distanceTo(rayPoint(moved, BRING_DISTANCE, new Vector3()))).toBeLessThan(1e-9);
  });

  it("eases in and out between 0 and 1", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(-3)).toBe(0);
    expect(ease(7)).toBe(1);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.9)).toBeGreaterThan(0.9);
  });

  it("points a ray down the pointer's own -z", () => {
    expect(rayPoint(pose([1, 2, 3]), 0.5, new Vector3()).toArray()).toEqual([1, 2, 2.5]);
    const left = rayPoint(pose([0, 0, 0], [0, Math.PI / 2, 0]), 2, new Vector3());
    expect(left.x).toBeCloseTo(-2);
    expect(left.z).toBeCloseTo(0);
  });
});

describe("a held card and its holder", () => {
  const eye = new Vector3(0, 1.2, 0);

  it("never turns its face from its holder by a quarter turn: it is turned back by the least it takes", () => {
    expect(FACE_LIMIT).toBeLessThan(Math.PI / 2);
    expect(FACE_LIMIT).toBeGreaterThan(1.2);
    // A wrist rolled over so the card shows its back, at every angle on the way round.
    for (let roll = 0; roll <= Math.PI * 2; roll += Math.PI / 12) {
      for (const axis of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(1, 1, 0).normalize()]) {
        const card: Pose = { position: new Vector3(0.1, 0.85, -0.45), quaternion: new Quaternion().setFromAxisAngle(axis, roll) };
        const toEye = eye.clone().sub(card.position);
        const before = facing(card).angleTo(toEye);
        const was = card.quaternion.clone();
        faceHolder(card, eye);
        const after = facing(card).angleTo(toEye);
        expect(after).toBeLessThanOrEqual(FACE_LIMIT + 1e-6);
        if (before <= FACE_LIMIT) expect(card.quaternion.equals(was)).toBe(true);
        else {
          // Brought back to the limit, and no further than that.
          expect(after).toBeCloseTo(FACE_LIMIT, 5);
          expect(card.quaternion.angleTo(was)).toBeCloseTo(before - FACE_LIMIT, 5);
        }
        // Where it is does not change.
        expect(card.position.toArray()).toEqual([0.1, 0.85, -0.45]);
      }
    }
  });

  it("copes with a card whose face is dead away from the eyes, and one held at the eyes themselves", () => {
    const card: Pose = { position: new Vector3(0, 1.2, -0.5), quaternion: new Quaternion().setFromEuler(new Euler(0, Math.PI, 0)) };
    expect(facing(card).angleTo(eye.clone().sub(card.position))).toBeCloseTo(Math.PI);
    faceHolder(card, eye);
    expect(facing(card).angleTo(eye.clone().sub(card.position))).toBeCloseTo(FACE_LIMIT, 5);
    const atEye: Pose = { position: eye.clone(), quaternion: new Quaternion() };
    expect(() => faceHolder(atEye, eye)).not.toThrow();
    expect(atEye.quaternion.angleTo(new Quaternion())).toBe(0);
  });
});

describe("a held card and the table top", () => {
  const [width, height] = [0.1, 0.14];
  const lowest = (card: Pose): number => {
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => new Vector3((sx * width) / 2, (sy * height) / 2, 0).applyQuaternion(card.quaternion).add(card.position)));
    return Math.min(...corners.map((corner) => corner.y));
  };

  it("never sinks below it: the card is lifted just far enough for its lowest corner", () => {
    const floor = 0.744;
    for (const euler of [[0, 0, 0], [-Math.PI / 2, 0, 0], [-1.05, 0, 0], [-0.9, 0.4, 0.3], [0.7, -1.2, 2.1]] as [number, number, number][]) {
      for (const y of [0.5, 0.74, 0.78]) {
        const card = pose([0.05, y, -0.6], euler);
        const sunk = lowest(card) < floor;
        keepAbove(card, width, height, floor);
        expect(lowest(card)).toBeGreaterThanOrEqual(floor - 1e-9);
        // Just far enough, straight up.
        if (sunk) expect(lowest(card)).toBeCloseTo(floor, 9);
        else expect(card.position.y).toBe(y);
        expect(card.position.x).toBe(0.05);
        expect(card.position.z).toBe(-0.6);
      }
    }
  });

  it("leaves a card well above the table alone", () => {
    const card = pose([0, 1, -0.5], [-1.05, 0.2, 0]);
    keepAbove(card, width, height, 0.744);
    expect(card.position.y).toBe(1);
  });
});

describe("reach and feedback", () => {
  it("takes hold a little further out than the library's own 7 cm, and not so far that a whole hand of cards is in range", () => {
    expect(GRAB_RADIUS).toBeGreaterThan(0.07);
    expect(GRAB_RADIUS).toBeLessThanOrEqual(0.1);
  });

  it("logs each cue with the hand it went to, for tests that cannot feel a buzz", () => {
    const from = cueLog.length;
    cue("grab", LEFT);
    cue("place", RIGHT);
    cue("refuse");
    cue("hover", { handedness: "none" });
    expect(cueLog.slice(from).map((entry) => [entry.cue, entry.hand])).toEqual([
      ["grab", "left"],
      ["place", "right"],
      ["refuse", "none"],
      ["hover", "none"],
    ]);
    expect(cueLog.at(-1)!.at).toBeGreaterThan(0);
    // The log is the last two hundred, oldest first.
    for (let i = 0; i < 250; i += 1) cue("hover", LEFT);
    expect(cueLog).toHaveLength(200);
    expect(cueLog.every((entry) => entry.cue === "hover" && entry.hand === "left")).toBe(true);
  });
});
