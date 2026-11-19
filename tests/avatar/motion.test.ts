/**
 * How the other people move (avatar/motion.ts), how they react at the end of a hand (avatar/reactions.ts) and
 * their name plates (world/Avatars.tsx). Joint turns are checked through a real rig: a "simple" figure posed by
 * animate(), so a sign slip (an arm swinging back, a bow leaning the wrong way) shows up as a misplaced joint.
 */
import { Euler, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildFigure, JOINT_NAMES, type Figure, type JointName } from "../../client/src/avatar/figure";
import { measure } from "../../client/src/avatar/measure";
import {
  ACT_MS,
  actNow,
  animate,
  blinkAt,
  fanSize,
  gazeAt,
  GENERIC_FAN,
  isFloating,
  MAX_FAN,
  newRig,
  reachArm,
  seatedLegs,
  seatOf,
  STILL,
  stepAir,
  stepGait,
  tuckOf,
  type Act,
  type Air,
  type Gait,
  type Rig,
  type Scene,
  type Turn,
} from "../../client/src/avatar/motion";
import { handWinners, reactionsOn, watchHands } from "../../client/src/avatar/reactions";
import { floorHeight, SEAT_HEIGHT, seatPose, tableSpot } from "../../client/src/world/layout";
import { contrast, plateInk, plateText } from "../../client/src/world/Avatars";
import { GARMENT_PALETTE, GESTURE_MS, GESTURES, STARTING_LOOKS } from "../../shared/avatar";
import type { RoomSnapshot, TableSnapshot } from "../../shared/protocol";

const LOOK = STARTING_LOOKS[0];
const m = measure(LOOK);
const DT = 1 / 60;

const scene = (over: Partial<Scene> = {}): Scene => ({
  t: 1,
  m,
  seed: 7,
  gait: { phase: 0, speed: 0 },
  tuck: 0,
  floating: false,
  seated: null,
  act: null,
  calm: false,
  ...over,
});

/** A simple figure standing at the origin facing -Z, posed by the rig. */
function posed(rig: Rig): Figure {
  const figure = buildFigure(LOOK, "simple");
  for (const name of JOINT_NAMES) figure.joints[name].rotation.set(...rig.joints[name]);
  figure.joints.pelvis.position.y = rig.pelvisY;
  figure.root.position.y = rig.lift;
  figure.root.updateMatrixWorld(true);
  return figure;
}
const where = (figure: Figure, joint: JointName) => figure.joints[joint].getWorldPosition(new Vector3());
const pose = (over: Partial<Scene> = {}) => posed(animate(scene(over), newRig()));
const flat = (rig: Rig) => JOINT_NAMES.flatMap((name) => rig.joints[name]).concat(rig.pelvisY, rig.lift);

/** Forward kinematics of a two-bone arm hanging down -Y from the shoulder: where its wrist lands. */
function fk(shoulder: Vector3, upper: Turn, fore: Turn): Vector3 {
  const first = new Quaternion().setFromEuler(new Euler(...upper));
  const second = first.clone().multiply(new Quaternion().setFromEuler(new Euler(...fore)));
  return shoulder.clone().add(new Vector3(0, -m.upperArm, 0).applyQuaternion(first)).add(new Vector3(0, -m.foreArm, 0).applyQuaternion(second));
}

function walk(gait: Gait, speed: number, frames: number): Gait {
  for (let i = 0; i < frames; i += 1) gait = stepGait(gait, speed * DT, DT, m);
  return gait;
}

describe("moving", () => {
  it("advances the walk phase with speed, and stops it when still", () => {
    const slow = walk({ phase: 0, speed: 1 }, 1, 10);
    const fast = walk({ phase: 0, speed: 2 }, 2, 10);
    expect(slow.phase).toBeGreaterThan(0);
    expect(fast.phase).toBeGreaterThan(slow.phase * 1.5);
    const stopped = walk(fast, 0, 120);
    expect(stopped.speed).toBeLessThan(STILL);
    expect(walk(stopped, 0, 60).phase).toBe(stopped.phase);
  });

  it("swings the legs in turn while walking, stands them straight when still, and leans in to run", () => {
    const stride = animate(scene({ gait: { phase: Math.PI / 2, speed: 1.6 } }), newRig());
    expect(stride.joints.thighL[0]).toBeGreaterThan(0.3);
    expect(stride.joints.thighR[0]).toBeLessThan(-0.3);
    // Each arm swings with the other leg.
    expect(stride.joints.upperArmL[0]).toBeLessThan(0);
    const striding = posed(stride);
    expect(where(striding, "footL").z).toBeLessThan(where(striding, "footR").z);
    // The stance leg's foot stays on the floor while the legs are open.
    expect(Math.min(where(striding, "footL").y, where(striding, "footR").y)).toBeCloseTo(m.ankle, 1);
    const still = animate(scene(), newRig());
    for (const joint of ["thighL", "thighR", "shinL", "shinR"] as const) expect(Math.abs(still.joints[joint][0])).toBe(0);
    const run = animate(scene({ gait: { phase: 0, speed: 4 } }), newRig());
    expect(run.joints.torso[0]).toBeLessThan(stride.joints.torso[0] - 0.1);
  });

  it("tucks while the feet rise off the ground, and stands on a bench once it has landed", () => {
    let air: Air = { ground: 0, settled: 0 };
    let y = 0;
    for (let i = 0; i < 12; i += 1) {
      y += 3 * DT;
      air = stepAir(air, y, 3, DT);
    }
    expect(tuckOf(air, y)).toBeGreaterThan(0.9);
    const tucked = animate(scene({ tuck: tuckOf(air, y) }), newRig());
    expect(tucked.joints.thighL[0]).toBeGreaterThan(0.8);
    expect(tucked.joints.shinL[0]).toBeLessThan(-1.2);
    // Landed on a bench top at 0.45 m: still for a moment, and the knees come down.
    for (let i = 0; i < 20; i += 1) air = stepAir(air, 0.45, 0, DT);
    expect(tuckOf(air, 0.45)).toBe(0);
    // Stepping down off it is never a tuck.
    air = stepAir(air, 0, -2, DT);
    expect(tuckOf(air, 0)).toBe(0);
  });

  it("floats in the pool with a bob and paddling arms, but wades the shallow end on its feet", () => {
    expect(isFloating(-10, -35, -1.35)).toBe(true);
    expect(isFloating(-21, -35, floorHeight(-21, -35))).toBe(false);
    expect(isFloating(0, 0, 0)).toBe(false);
    const a = animate(scene({ floating: true, t: 1 }), newRig());
    const b = animate(scene({ floating: true, t: 2.3 }), newRig());
    expect(Math.abs(a.joints.upperArmL[2])).toBeGreaterThan(0.6);
    expect(a.joints.upperArmR[2]).toBeGreaterThan(0.6);
    expect(a.lift).not.toBeCloseTo(b.lift, 3);
    expect(a.joints.upperArmL[0]).not.toBeCloseTo(b.joints.upperArmL[0], 2);
    // Reduce motion: no bob.
    expect(animate(scene({ floating: true, calm: true }), newRig()).lift).toBe(0);
  });

  it("keeps a calm idle still with Reduce motion, and sways gently without it", () => {
    const at = (t: number, calm: boolean) => flat(animate(scene({ t, calm }), newRig()));
    expect(at(1, true)).toEqual(at(3.7, true));
    expect(at(1, false)).not.toEqual(at(3.7, false));
  });
});

describe("at a table", () => {
  const seats = (ids: (string | null)[]) => ids.map((memberId) => ({ occupant: memberId ? "human" : "open", memberId }));
  const room = {
    tables: [
      { id: "tonk-1", seats: seats([null, null, null, null]), host: { memberId: "bo" } },
      { id: "spades-1", seats: seats(["cy", null, "ana", null]), host: null },
    ],
  } as unknown as RoomSnapshot;

  it("seats a player in their own chair, facing the table, settled at chair height with the feet down", () => {
    expect(seatOf(room, "ana")).toEqual({ tableId: "spades-1", seat: 2 });
    // The non-playing host stands at their corner.
    expect(seatOf(room, "bo")).toBeNull();
    expect(seatOf(room, "dee")).toBeNull();

    const place = seatPose("spades-1", 2);
    const centre = tableSpot("spades-1");
    const facing = new Vector3(-Math.sin(place.ry), 0, -Math.cos(place.ry));
    expect(facing.dot(new Vector3(centre.x - place.x, 0, centre.z - place.z).normalize())).toBeCloseTo(1, 5);

    const sitting = pose({ seated: { holding: true, lean: 0, look: null } });
    const standing = pose();
    const hip = where(sitting, "thighL");
    expect(hip.y).toBeCloseTo(seatedLegs(m).pelvisY, 5);
    expect(hip.y - m.limb * 1.45).toBeGreaterThan(SEAT_HEIGHT - 0.03);
    // Thighs forward over the chair, knees in front of the hips, feet on or just above the floor, tucked under the knees.
    const knee = where(sitting, "shinL");
    expect(knee.z).toBeLessThan(hip.z - m.thigh * 0.85);
    const ankle = where(sitting, "footL");
    expect(ankle.y).toBeGreaterThan(m.ankle - 0.01);
    expect(ankle.y).toBeLessThan(m.ankle + 0.2);
    expect(ankle.z).toBeGreaterThan(knee.z);
    // Down by the hip's drop: these short-legged figures sit only a little lower than they stand.
    expect(where(sitting, "head").y).toBeLessThan(where(standing, "head").y - (m.joints.pelvis[1] - seatedLegs(m).pelvisY) + 0.01);
    // The fan hand is up in front of the chest, over the table edge.
    expect(where(sitting, "handL").z).toBeLessThan(-0.25);
  });

  it("sizes the fan of card backs to the public hand count at my table, and shows none in a lobby", () => {
    expect(fanSize("playing", true, 7)).toBe(7);
    expect(fanSize("playing", true, 0)).toBe(0);
    expect(fanSize("playing", true, 40)).toBe(MAX_FAN);
    expect(fanSize("playing", true, null)).toBe(0);
    expect(fanSize("playing", false, undefined)).toBe(GENERIC_FAN);
    for (const status of ["available", "lobby", "results", undefined] as const) {
      expect(fanSize(status, true, 5)).toBe(0);
      expect(fanSize(status, false, 5)).toBe(0);
    }
  });

  it("leans in to play and turns the head toward whoever has the turn", () => {
    const settled = animate(scene({ seated: { holding: true, lean: 0, look: null } }), newRig());
    const leaning = animate(scene({ seated: { holding: true, lean: 1, look: { yaw: 0.6, pitch: -0.08 } } }), newRig());
    expect(leaning.joints.torso[0]).toBeLessThan(settled.joints.torso[0] - 0.15);
    expect(leaning.joints.head[1]).toBeCloseTo(0.6, 5);
  });
});

describe("gestures", () => {
  const kinds = GESTURES.map((gesture) => gesture.id);

  it("plays each gesture once, for its own time, ending under GESTURE_MS back at the idle", () => {
    for (const kind of kinds) {
      expect(ACT_MS[kind]).toBe(GESTURE_MS[kind]);
      expect(ACT_MS[kind]).toBeLessThan(2000);
      const played = [{ memberId: "ana", kind, at: 1000 }];
      expect(actNow("ana", 1000 + GESTURE_MS[kind] / 2, played)).toEqual({ kind, ms: GESTURE_MS[kind] / 2 });
      expect(actNow("ana", 1000 + GESTURE_MS[kind], played)).toBeNull();
      expect(actNow("bo", 1000 + GESTURE_MS[kind] / 2, played)).toBeNull();
      for (const seated of [null, { holding: true, lean: 0, look: null }]) {
        const idle = flat(animate(scene({ seated }), newRig()));
        const mid = flat(animate(scene({ seated, act: { kind, ms: GESTURE_MS[kind] / 2 } }), newRig()));
        const end = flat(animate(scene({ seated, act: { kind, ms: GESTURE_MS[kind] - 1 } }), newRig()));
        expect(mid, kind).not.toEqual(idle);
        end.forEach((value, i) => expect(Math.abs(value - idle[i]), kind).toBeLessThan(0.02));
      }
    }
    for (const kind of ["shrug", "grin"] as const) expect(ACT_MS[kind]).toBeLessThan(2000);
  });

  it("lets a newer act replace one still playing", () => {
    const list = [
      { memberId: "ana", kind: "wave" as Act, at: 0 },
      { memberId: "ana", kind: "clap" as Act, at: 500 },
    ];
    expect(actNow("ana", 600, list)?.kind).toBe("clap");
    expect(actNow("ana", 600, list.slice(0, 1), [{ memberId: "ana", kind: "laugh", at: 550 }])?.kind).toBe("laugh");
  });

  it("moves the right way: a wave and the Boston raise hands over the head, a bow leans the head forward", () => {
    const mid = (kind: Act) => pose({ act: { kind, ms: ACT_MS[kind] / 2 } });
    const idle = pose();
    const head = where(idle, "head");
    expect(where(mid("wave"), "handR").y).toBeGreaterThan(head.y);
    const boston = mid("boston");
    expect(where(boston, "handL").y).toBeGreaterThan(head.y);
    expect(where(boston, "handR").y).toBeGreaterThan(head.y);
    expect(where(mid("bow"), "head").z).toBeLessThan(head.z - 0.15);
    const clap = mid("clap");
    expect(where(clap, "handL").z).toBeLessThan(-0.2);
    expect(where(clap, "handR").x - where(clap, "handL").x).toBeLessThan(0.25);
    expect(animate(scene({ act: { kind: "laugh", ms: 700 } }), newRig()).mouth).not.toBe("relaxed");
  });
});

describe("reactions", () => {
  const table = (phase: string, handNumber: number, result: unknown, game: TableSnapshot["game"] = "spades"): TableSnapshot =>
    ({ tableId: "spades-1", game, revision: 1, you: 0, view: { phase, handNumber, turn: 0, result, handCounts: [0, 0, 0, 0] } }) as unknown as TableSnapshot;
  const spades = [{ delta: 60 }, { delta: -40 }];

  it("fires once per hand-over, from the hand's public result, and not for a hand that ended before I sat", () => {
    let seen = watchHands(null, table("hand-over", 1, spades), true);
    expect(seen.bySeat).toBeNull();
    seen = watchHands(seen.seen, table("play", 2, null), true);
    expect(seen.bySeat).toBeNull();
    seen = watchHands(seen.seen, table("hand-over", 2, spades), true);
    const reacted = seen.bySeat!;
    expect(reacted).toHaveLength(4);
    // Team 0 (seats 0 and 2) took the hand: they applaud or grin; the others shrug or laugh.
    for (const seat of [0, 2]) expect(["clap", "grin"]).toContain(reacted[seat]);
    for (const seat of [1, 3]) expect(["shrug", "laugh"]).toContain(reacted[seat]);
    // Partners do not move as one.
    expect(reacted[0]).not.toBe(reacted[2]);
    expect(reacted[1]).not.toBe(reacted[3]);
    expect(watchHands(seen.seen, table("hand-over", 2, spades), true).bySeat).toBeNull();
    expect(watchHands(seen.seen, table("game-over", 3, spades), true).bySeat).not.toBeNull();
  });

  it("does nothing when switched off", () => {
    expect(reactionsOn({ reactions: true })).toBe(true);
    expect(reactionsOn({ reactions: false })).toBe(false);
    const quiet = watchHands("", table("hand-over", 4, spades), false);
    expect(quiet.bySeat).toBeNull();
    expect(watchHands(quiet.seen, table("hand-over", 4, spades), true).bySeat).toBeNull();
  });

  it("names each game's winners: tonk payouts, a made or set bid whist contract", () => {
    const view = (result: unknown) => ({ result }) as unknown as NonNullable<TableSnapshot["view"]>;
    expect(handWinners("tonk", view({ points: [0, 2, 0, 0] }))).toEqual([1]);
    expect(handWinners("tonk", view({ points: [0, 0, 0, 0] }))).toEqual([]);
    expect(handWinners("bid-whist", view({ team: 1, made: true }))).toEqual([1, 3]);
    expect(handWinners("bid-whist", view({ team: 1, made: false }))).toEqual([0, 2]);
    expect(handWinners("spades", view([{ delta: 10 }, { delta: 10 }]))).toEqual([]);
  });
});

describe("live VR hands and the face", () => {
  it("reaches a hand target with two-bone IK, and points at one out of reach", () => {
    const shoulder = new Vector3(0.15, 1.35, 0);
    for (const target of [new Vector3(0.3, 1.2, -0.3), new Vector3(0.1, 1.0, -0.2), new Vector3(0.4, 1.6, 0.05)]) {
      const solved = reachArm(shoulder, target, m.upperArm, m.foreArm, 1);
      expect(fk(shoulder, solved.upper, solved.fore).distanceTo(target)).toBeLessThan(0.002);
    }
    const far = new Vector3(1.5, 1.35, -1.5);
    const straight = reachArm(shoulder, far, m.upperArm, m.foreArm, 1);
    const stretched = fk(shoulder, straight.upper, straight.fore);
    expect(straight.wrist.distanceTo(stretched)).toBeLessThan(0.002);
    expect(stretched.distanceTo(shoulder)).toBeCloseTo(m.upperArm + m.foreArm, 3);
    expect(stretched.clone().sub(shoulder).normalize().dot(far.clone().sub(shoulder).normalize())).toBeCloseTo(1, 4);
    // The whole rig: a tracked right hand out in front lands where it was sent, relative to the feet point.
    const hand = { x: 0.25, y: 1.15, z: -0.35 };
    const figure = pose({ hands: [null, hand] });
    expect(where(figure, "handR").distanceTo(new Vector3(hand.x, hand.y, hand.z))).toBeLessThan(0.01);
    const turned = animate(scene({ head: { pitch: 0.3, yaw: -0.5 } }), newRig());
    expect(turned.joints.head).toEqual([0.3, -0.5, 0]);
  });

  it("blinks every 2 to 6 seconds at seeded moments", () => {
    for (const seed of [1, 99, 123456789]) {
      const starts: number[] = [];
      let last = 0;
      for (let t = 0; t < 400; t += 0.005) {
        const closed = blinkAt(seed, t);
        if (closed > 0 && last === 0) starts.push(t);
        last = closed;
      }
      expect(starts.length).toBeGreaterThan(60);
      for (let i = 1; i < starts.length; i += 1) {
        expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(1.99);
        expect(starts[i] - starts[i - 1]).toBeLessThanOrEqual(6.01);
      }
    }
    expect(blinkAt(5, 10)).toBe(blinkAt(5, 10));
  });

  it("glances toward the nearest member moving in front, never at one standing still or behind", () => {
    // Facing -Z from the origin: someone walking ahead and to the right.
    expect(gazeAt(0, 0, 0, [{ x: 1.5, z: -3, speed: 1.5 }])).toBeGreaterThan(0.3);
    expect(gazeAt(0, 0, 0, [{ x: -1.5, z: -3, speed: 1.5 }])).toBeLessThan(-0.3);
    expect(gazeAt(0, 0, 0, [{ x: 1.5, z: -3, speed: 0 }])).toBe(0);
    expect(gazeAt(0, 0, 0, [{ x: 0, z: 3, speed: 2 }])).toBe(0);
    expect(gazeAt(0, 0, 0, [{ x: 0, z: -9, speed: 2 }])).toBe(0);
  });
});

describe("the name plate", () => {
  it("writes the symbol before the name, in text that stands out on every plate colour", () => {
    expect(plateText("Ana", "spade")).toBe("♠ Ana");
    expect(plateText("Bo", "star")).toBe("★ Bo");
    expect(plateText("Bo", "none")).toBe("Bo");
    for (const colour of GARMENT_PALETTE) expect(contrast(colour.hex, plateInk(colour.hex)), colour.id).toBeGreaterThanOrEqual(4.5);
  });
});
