/**
 * How the other people move (avatar/motion.ts), how they react at the end of a hand (avatar/reactions.ts) and
 * their name plates (world/Avatars.tsx). Joint turns are checked through a real rig: a "simple" figure posed by
 * animate(), so a sign slip (an arm swinging back, a bow leaning the wrong way) shows up as a misplaced joint.
 */
import { Euler, Quaternion, Vector3, type Bone, type SkinnedMesh } from "three";
import { describe, expect, it } from "vitest";
import { buildFigure, JOINT_NAMES, type Detail, type Figure, type JointName } from "../../client/src/avatar/figure";
import { measure } from "../../client/src/avatar/measure";
import {
  ACT_MS,
  actNow,
  animate,
  blinkAt,
  easeLook,
  SEATED_HEAD,
  fanSize,
  gazeAt,
  GENERIC_FAN,
  isFloating,
  MAX_FAN,
  newRig,
  reachArm,
  SEATED_HEM,
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
import { floorHeight, MIRROR, SEAT_HEIGHT, seatPose, TABLE_RADIUS, tableSpot } from "../../client/src/world/layout";
import { inReflection } from "../../client/src/world/Mirror";
import { applyRig } from "../../client/src/avatar/pose";
import { animates, contrast, liveParts, plateInk, plateLift, plateText, sitPlace } from "../../client/src/world/Avatars";
import { MOUTH_SHAPES } from "../../client/src/avatar/face";
import { BOARD_BOTTOM } from "../../client/src/tableui/Tables";
import { GARMENT_PALETTE, GESTURE_MS, GESTURES, STARTING_LOOKS, type Look } from "../../shared/avatar";
import type { RoomSnapshot, TableSnapshot } from "../../shared/protocol";

const LOOK = STARTING_LOOKS[0];
const m = measure(LOOK);
/** The shortest and tallest heights in the narrowest and widest builds. */
const EXTREMES: Look[] = (["shortest", "tallest"] as const).flatMap((height) => (["slender", "round"] as const).map((build) => ({ ...LOOK, height, build })));
/** A figure of `look` posed by `scene` at the origin facing -Z. */
function posedLook(look: Look, over: Partial<Scene>, detail: Detail = "simple"): Figure {
  const figure = buildFigure(look, detail);
  const rig = animate({ ...scene(over), m: measure(look) }, newRig());
  for (const name of JOINT_NAMES) figure.joints[name].rotation.set(...rig.joints[name]);
  figure.joints.pelvis.position.y = rig.pelvisY;
  figure.root.position.y = rig.lift;
  return figure;
}
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

/** A figure (simple unless asked) standing at the origin facing -Z, posed by the rig. */
function posed(rig: Rig, detail: Detail = "simple"): Figure {
  const figure = buildFigure(LOOK, detail);
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
    expect(animate(scene({ floating: true, calm: true, t: 1 }), newRig()).lift).toBe(animate(scene({ floating: true, calm: true, t: 2.3 }), newRig()).lift);
  });

  it("floats with the head over the water and the paddling hands at the surface, for every height", () => {
    // A swimmer's feet: their eyes 0.25 m over the water (controls/motion.ts EYES_ABOVE_WATER), the house's eye height above the feet.
    const surface = -0.12;
    const feet = surface + 0.25 - 1.6;
    for (const look of EXTREMES) {
      for (const t of [0, 0.9, 1.7, 2.6]) {
        const figure = posedLook(look, { floating: true, t });
        figure.root.position.y += feet;
        figure.root.updateMatrixWorld(true);
        const at = (joint: JointName) => figure.joints[joint].getWorldPosition(new Vector3()).y;
        expect(at("head"), `${look.height} ${look.build}`).toBeGreaterThan(surface);
        expect(Math.abs(at("upperArmL") - surface), `${look.height} ${look.build}`).toBeLessThan(0.15);
        for (const hand of ["handL", "handR"] as const) {
          expect(at(hand), `${look.height} ${hand}`).toBeGreaterThan(surface - 0.3);
          expect(at(hand), `${look.height} ${hand}`).toBeLessThan(surface + 0.1);
        }
        figure.dispose();
      }
    }
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

  it("sits forward on the cushion, so the knees go under the table top for every height and build", () => {
    for (const seat of [0, 1, 2, 3] as const) {
      const place = sitPlace("spades-1", seat);
      const chair = seatPose("spades-1", seat);
      expect(Math.hypot(place.x - chair.x, place.z - chair.z)).toBeCloseTo(0.18, 5);
      const centre = tableSpot("spades-1");
      for (const look of EXTREMES) {
        const figure = posedLook(look, { seated: { holding: true, lean: 0, look: null } });
        figure.root.position.x = place.x;
        figure.root.position.z = place.z;
        figure.root.rotation.y = place.ry;
        figure.root.updateMatrixWorld(true);
        for (const knee of ["shinL", "shinR"] as const) {
          const at = figure.joints[knee].getWorldPosition(new Vector3());
          expect(Math.hypot(at.x - centre.x, at.z - centre.z), `${look.height} ${look.build} seat ${seat}`).toBeLessThan(TABLE_RADIUS);
        }
        // The hips stay on the cushion, which reaches 0.82 m from the table's centre.
        const hips = figure.joints.pelvis.getWorldPosition(new Vector3());
        expect(Math.hypot(hips.x - centre.x, hips.z - centre.z)).toBeGreaterThan(0.82);
        figure.dispose();
      }
    }
  });

  it("eases the head to a new turn and back, never turning it more than 0.1 rad in a frame", () => {
    const look = { yaw: 0, pitch: SEATED_HEAD };
    let last = { ...look };
    const steps: number[] = [];
    // Turn moves to the far side, then the hand ends.
    for (const target of [{ yaw: 1, pitch: -0.08 }, { yaw: -1, pitch: -0.08 }, null]) {
      for (let i = 0; i < 90; i += 1) {
        easeLook(look, target, DT);
        steps.push(Math.abs(look.yaw - last.yaw), Math.abs(look.pitch - last.pitch));
        last = { ...look };
      }
    }
    expect(Math.max(...steps)).toBeLessThan(0.1);
    expect(look.yaw).toBeCloseTo(0, 2);
    expect(look.pitch).toBeCloseTo(SEATED_HEAD, 2);
    // At rest the eased look is the plain seated head, so the idle carries on as if there were none.
    const rested = flat(animate(scene({ seated: { holding: true, lean: 0, look: { yaw: 0, pitch: SEATED_HEAD } } }), newRig()));
    expect(rested).toEqual(flat(animate(scene({ seated: { holding: true, lean: 0, look: null } }), newRig())));
  });

  it("draws a seated VR player with the scripted pose, never their real head or hands", () => {
    const tracked = { head: { pitch: 0.3, yaw: -0.5 }, hands: [{ x: 0.2, y: 1, z: -0.4 }, { x: -0.2, y: 1, z: -0.4 }] as Scene["hands"] };
    expect(liveParts(tracked, true)).toEqual({});
    expect(liveParts(tracked, false)).toEqual(tracked);
    const seated = { holding: true, lean: 0, look: null };
    expect(flat(animate(scene({ seated, ...liveParts(tracked, true) }), newRig()))).toEqual(flat(animate(scene({ seated }), newRig())));
  });

  it("draws every top's hem up onto the lap while seated, so none hangs below the waist into the thighs", () => {
    for (const look of STARTING_LOOKS) {
      const figure = buildFigure(look, "near");
      const body = figure.root.getObjectByName("body") as SkinnedMesh;
      const hem = body.skeleton.bones.findIndex((bone: Bone) => bone.name === "hem");
      const lowest = (seated: Scene["seated"]) => {
        applyRig(figure, animate({ ...scene({ seated }), m: measure(look) }, newRig()));
        figure.root.updateMatrixWorld(true);
        // Measured down from the waist in the torso's own frame, however it leans.
        let low = Infinity;
        const at = new Vector3();
        for (let i = 0; i < body.geometry.attributes.position.count; i++) {
          if (body.geometry.attributes.skinIndex.getX(i) === hem) low = Math.min(low, figure.joints.torso.worldToLocal(body.getVertexPosition(i, at).applyMatrix4(body.matrixWorld)).y);
        }
        return low;
      };
      const standing = lowest(null);
      const sitting = lowest({ holding: true, lean: 0, look: null });
      // Standing, the top hangs past the waist (a one-piece ends at it); seated, it is drawn up to SEATED_HEM of that.
      expect(standing, look.top).toBeLessThan(-0.015);
      expect(sitting, look.top).toBeGreaterThan(standing * SEATED_HEM - 0.001);
      expect(sitting, look.top).toBeGreaterThan(-0.015);
      figure.dispose();
    }
  });

  it("draws every skirt and dress up onto the seat while seated, so none hangs through the chair, at every height and build", () => {
    const skirts = EXTREMES.flatMap((look) => [{ ...look, onePiece: "none", bottom: "midi" }, { ...look, onePiece: "none", bottom: "maxi" }, { ...look, onePiece: "dress" }] as Look[]);
    for (const look of skirts) {
      for (const detail of ["near", "far"] as const) {
        const figure = buildFigure(look, detail);
        const body = figure.root.getObjectByName("body") as SkinnedMesh;
        const skirt = body.skeleton.bones.findIndex((bone: Bone) => bone.name === "skirt");
        const lowest = (seated: Scene["seated"]) => {
          applyRig(figure, animate({ ...scene({ seated }), m: measure(look) }, newRig()));
          figure.root.updateMatrixWorld(true);
          let low = Infinity;
          const at = new Vector3();
          for (let i = 0; i < body.geometry.attributes.position.count; i++) {
            if (body.geometry.attributes.skinIndex.getX(i) === skirt) low = Math.min(low, body.getVertexPosition(i, at).applyMatrix4(body.matrixWorld).y);
          }
          return low;
        };
        const label = `${look.height} ${look.build} ${look.onePiece === "dress" ? "dress" : look.bottom} ${detail}`;
        // Standing it hangs well below the knees' height; seated it ends on the cushion, not through it.
        expect(lowest(null), label).toBeLessThan(SEAT_HEIGHT);
        expect(lowest({ holding: true, lean: 0, look: null }), label).toBeGreaterThanOrEqual(SEAT_HEIGHT);
        figure.dispose();
      }
    }
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

  it("brings the card slap's hand down hard by its landing, standing and seated", () => {
    for (const seated of [null, { holding: true, lean: 0, look: null }]) {
      const at = (share: number) => where(pose({ seated, act: { kind: "slap", ms: ACT_MS.slap * share } }), "handR");
      expect(at(0.65).y, seated ? "seated" : "standing").toBeLessThan(at(0.4).y - 0.1);
    }
  });

  it("raises the brows in every act, a friendly head shake too, and lets them rest after", () => {
    const brows = (kind: Act, ms = ACT_MS[kind] / 2) => animate(scene({ act: { kind, ms } }), newRig()).brows;
    for (const kind of ["wave", "boston", "laugh", "grin"] as const) expect(brows(kind), kind).toBeGreaterThan(0.6);
    // Rueful, never reproachful: no knit brow in any act.
    for (const kind of [...GESTURES.map((gesture) => gesture.id), "shrug", "grin"] as Act[]) expect(brows(kind), kind).toBeGreaterThan(0.3);
    expect(animate(scene({ act: { kind: "shake", ms: ACT_MS.shake / 2 } }), newRig()).mouth).toBe("grin");
    for (const kind of [...GESTURES.map((gesture) => gesture.id), "shrug", "grin"] as Act[]) expect(Math.abs(brows(kind, ACT_MS[kind] - 1)), kind).toBeLessThan(0.05);
    expect(animate(scene(), newRig()).brows).toBe(0);
    // The laugh holds its wide open mouth.
    const mouths = new Set(Array.from({ length: 16 }, (_, i) => animate(scene({ act: { kind: "laugh", ms: 300 + i * 60 } }), newRig()).mouth));
    expect([...mouths]).toEqual(["laugh"]);
  });

  it("uses every mouth shape the face has, surprise included", () => {
    const used = new Set(animate(scene(), newRig()).mouth);
    for (const kind of Object.keys(ACT_MS) as Act[]) {
      for (let ms = 0; ms < ACT_MS[kind]; ms += 20) used.add(animate(scene({ act: { kind, ms } }), newRig()).mouth);
    }
    for (const shape of MOUTH_SHAPES) expect(used.has(shape), shape).toBe(true);
  });

  it("plays a gesture out of a VR player's tracked head and hands, and returns to them after", () => {
    const tracked = { head: { pitch: 0.1, yaw: 0.2 }, hands: [{ x: -0.25, y: 1.0, z: -0.3 }, { x: 0.25, y: 1.0, z: -0.3 }] as Scene["hands"] };
    const at = (kind: Act, ms: number) => posed(animate(scene({ ...tracked, act: { kind, ms } }), newRig()));
    const still = posed(animate(scene(tracked), newRig()));
    const wave = at("wave", ACT_MS.wave / 2);
    expect(where(wave, "handR").y).toBeGreaterThan(where(wave, "head").y);
    expect(animate(scene({ ...tracked, act: { kind: "shake", ms: ACT_MS.shake * 0.3 } }), newRig()).joints.head[1]).not.toBeCloseTo(0.2, 2);
    const end = at("wave", ACT_MS.wave - 1);
    for (const hand of ["handL", "handR"] as const) expect(where(end, hand).distanceTo(where(still, hand)), hand).toBeLessThan(0.02);
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
    // A lone winner (tonk) always applauds, on every hand.
    for (const hand of [4, 5, 6, 7]) {
      const tonk = watchHands("", table("hand-over", hand, { points: [0, 3, 0, 0] }, "tonk"), true).bySeat!;
      expect(tonk[1]).toBe("clap");
    }
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
    // The drawn hand goes with it: skinned through the skeleton, its vertices hang from that wrist, as at rest.
    const reach = (drawn: Figure) => {
      const body = drawn.root.getObjectByName("body") as SkinnedMesh;
      const [on, bone, at] = [body.geometry.attributes.skinIndex, body.skeleton.bones.indexOf(drawn.joints.handR as never), new Vector3()];
      let most = 0;
      for (let i = 0; i < on.count; i++) if (on.getX(i) === bone) most = Math.max(most, body.getVertexPosition(i, at).distanceTo(where(drawn, "handR")));
      return most;
    };
    const [still, reaching] = [reach(posed(animate(scene(), newRig()), "near")), reach(posed(animate(scene({ hands: [null, hand] }), newRig()), "near"))];
    expect(still).toBeGreaterThan(0.5 * m.hand);
    expect(reaching).toBeCloseTo(still, 6);
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

  it("staggers the plates a whole plate apart: opposite seats at a table, and neighbours standing in a crowd", () => {
    const PLATE = 0.22 - 1e-9;
    const seats = ([0, 1, 2, 3] as const).map((seat) => plateLift("ana", seat));
    expect(Math.abs(seats[2] - seats[0])).toBeGreaterThanOrEqual(PLATE);
    expect(Math.abs(seats[3] - seats[1])).toBeGreaterThanOrEqual(PLATE);
    const ids = Array.from({ length: 40 }, (_, i) => `member-${i}`);
    const standing = [...new Set(ids.map((id) => plateLift(id, null)))].sort();
    expect(standing.length).toBe(4);
    for (let i = 1; i < standing.length; i += 1) expect(standing[i] - standing[i - 1]).toBeGreaterThanOrEqual(PLATE);
    for (const lift of [...seats, ...standing]) expect(lift).toBeGreaterThanOrEqual(0.2);
    expect(plateLift("bo", null)).toBe(plateLift("bo", null));
  });

  it("keeps every seated plate under the table's board, for the tallest figure at the highest seat", () => {
    for (const look of EXTREMES) {
      const mm = measure(look);
      const head = mm.height - (mm.joints.pelvis[1] - seatedLegs(mm).pelvisY);
      for (const seat of [0, 1, 2, 3] as const) expect(head + plateLift("ana", seat) + 0.22 / 2, `${look.height} ${look.build} seat ${seat}`).toBeLessThan(BOARD_BOTTOM);
    }
  });

  it("poses a figure only in view: beyond 15 m only while it gestures, or once to settle a new seat", () => {
    expect(animates(5, true, false, true)).toBe(true);
    expect(animates(5, false, true, false)).toBe(false);
    expect(animates(15.1, true, false, true)).toBe(false);
    expect(animates(15.1, true, true, true)).toBe(true);
    expect(animates(30, true, false, false)).toBe(true);
  });

  it("counts someone as in the foyer mirror only where its glass can show them to me", () => {
    const [nx, nz] = [Math.sin(MIRROR.ry), Math.cos(MIRROR.ry)];
    const at = (out: number, side: number) => [MIRROR.x + out * nx + side * nz, MIRROR.z + out * nz - side * nx] as const;
    const eye = at(2, 0);
    // Behind me, in line with the glass: in it.
    expect(inReflection(...eye, ...at(4, 0.3))).toBe(true);
    // In front of the glass but far along the wall, or behind its wall: not.
    expect(inReflection(...eye, ...at(3, 6))).toBe(false);
    expect(inReflection(...eye, ...at(-2, 0))).toBe(false);
    // Nothing shows to an eye behind the glass.
    expect(inReflection(...at(-1, 0), ...at(3, 0))).toBe(false);
  });
});
