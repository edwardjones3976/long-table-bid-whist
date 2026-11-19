/**
 * The table I am sitting at (or hosting), handled directly: cards are picked up
 * and put down, piles are pulled, choices are tokens in front of me. Drawn in
 * my seat's frame: I am at the origin looking along -z and the table centre is
 * `reach` ahead. Where each thing lies is decided in direct.ts, so that a
 * seated arm reaches all of it; who holds what is kept in carry.ts.
 *
 *   my hand        one row of large cards just short of the table's near edge. Take one and it stays with that
 *                  pointer until it is let go: over a drop zone it is placed, anywhere else it goes back. A tap (a
 *                  ray, the mouse or a finger; a grip never taps) lifts (selects) it; a second tap on it, or a tap
 *                  on a zone, acts.
 *   drop zones     an outline and a word ("Play here", "Discard", "Kitty", "Your spread", "Add to run"). A card picked
 *                  by a tap goes to the small ones by a press on them (a ray or the mouse; the far melds are only
 *                  reached that way); the felt is pressed by the mouse alone.
 *   piles          Tonk's stock and discard pile: tap, or pull toward me, to draw
 *   tokens         bids, trump, house rules, ready, start, deal, new game, drop: tap, or push toward the centre.
 *                  A player's stand on a stepped rail within reach; the host's lie on the dealer's stand.
 *   pucks          "Bury six" beside the kitty, "Lay down" beside my spread
 *   leave          a small marker low beside my chair
 *   words          a board beyond the table, in the gap between the seat opposite and a neighbour;
 *                  seat plates; turn markers
 *
 * One implementation serves every pointer: the handlers are R3F pointer events with pointer capture, which the
 * mouse and touch reach through R3F and each controller's grip and ray, and a tracked hand's pinch, reach through
 * @react-three/xr's pointers (same handler names, same capture calls; carry.ts says what those do).
 * Each pointer carries on its own, so both hands can hold a card at once, and no thing is held twice.
 *
 *   in VR          a thing taken by a grip is attached to that hand: it keeps the offset it had when taken and is
 *                  placed from the hand's live pose every frame. A card taken by a trigger comes to a quarter of a
 *                  metre in front of that hand and then rides the same way. A held card never sinks into the table
 *                  and never turns its face from its holder.
 *   with the mouse a held thing slides on a plane just above the table, under the cursor.
 *
 * What letting go does is decided in direct.ts from describeTable's buttons; nothing here knows a rule. A card
 * carried by a hand is dropped on the zone its middle is over (with a little hold at the edges, so an edge does
 * not flicker); the mouse, which has no depth, drops on what the cursor is aimed at: a zone's outline, or a thing
 * standing in a zone (the discard pile, a meld, cards already staged), which carry userData.zone.
 *
 * Every state can be told without colour: hover lifts a thing a centimetre and frames it; held, it is larger, moves
 * with the hand, the hand's shape changes (controls/Hands.tsx), the zones show, and the zone under it thickens and
 * says what letting go will do; placed, it eases to its spot; refused or put back, it eases home and the reason
 * stands by its place for two seconds. Each moment is also a buzz and a sound to the hand that did it
 * (controls/feedback.ts). A carry also ends, with the thing put back, when its pointer goes away (a controller
 * switched off, the session ending: also when the browser reports that as a release), on cancel (the VR B button,
 * gamepad B, Esc: desk.cancelCount), when the window loses focus, when its card leaves my hand, and when I leave
 * the table.
 *
 * Object names (three.js `name`, for tests and the reticle): card-<id>, zone-<zone id>, pile-stock,
 * pile-discard, puck-bury, puck-lay, leave, and one per token: ready, unready, start, next-hand,
 * reset, else token-<button id>.
 */
import { getPointerById } from "@pmndrs/pointer-events";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import {
  BackSide,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Object3D,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type Ray,
} from "three";
import type { Card } from "../../../shared/cards";
import { cue } from "../controls/feedback";
import { desk } from "../controls/input";
import { net, useStore } from "../net/store";
import { local, useLocal } from "../state/local";
import { describeNow } from "../state/table";
import type { TableButton, TableDescription } from "../ui/actions";
import { CARD_ASPECT, cardLabel, makeCardBackTexture, makeCardTexture } from "../ui/cards";
import { TABLE_HEIGHT, type TableSpot } from "../world/layout";
import {
  attach,
  blend,
  BRING_TIME,
  carries,
  ease,
  faceHolder,
  isCarry,
  keepAbove,
  makePose,
  pressOf,
  RAY_HOLD,
  rayPoint,
  ride,
  tapSlop,
  wasLetGo,
  type Carries,
  type Carry,
  type Pose,
  type Press,
} from "./carry";
import {
  buryButton,
  dropCard,
  feltFloor,
  foresee,
  frameFor,
  HAND,
  handFan,
  layButton,
  LEAN,
  leaveSpot,
  meldRows,
  MELD_CARD,
  objectName,
  pileSpot,
  pruneSpread,
  puckSpot,
  pulled,
  pushed,
  settle,
  stagedRow,
  standing,
  tableMode,
  tableZones,
  TOKEN_LEAN,
  tokenButtons,
  tokenGrid,
  toward,
  zoneAt,
  type Frame,
  type Outcome,
  type Zone,
  type ZoneId,
} from "./direct";
import { confirmButton, resultSummary, seatLines, tableWords, wrap } from "./helpers";
import { hoverGate, INERT, Label, sourceOf } from "./Tables";
import type { TableActions } from "./useTableActions";

type Vec3 = [number, number, number];
type Rot = [number, number, number, "YXZ"?];
/** The cue a tap earned, if any: "place" when it did something, "refuse" when it could not. */
type Told = "place" | "refuse" | void;

const PLANE = new PlaneGeometry(1, 1);
const DISC = new CircleGeometry(1, 40);
const RING = new RingGeometry(0.965, 1, 64);
const RING_THICK = new RingGeometry(0.93, 1, 64);
const PUCK = new CylinderGeometry(0.05, 0.05, 0.018, 28);
const TURN_CONE = new ConeGeometry(0.025, 0.05, 3);
const SURROUND = new SphereGeometry(30, 8, 6);

const TOP = TABLE_HEIGHT + 0.004;
const STAGED_CARD = 0.07;
const PILE_CARD = 0.09;
const TRICK_CARD = 0.1;
// shortcut: room for 80 face-down cards, more than one deck holds; raise it for a game dealt from two decks.
const MAX_BACKS = 80;
const ON = "#14408f";
const OFF = "#2b2f3a";
const FLAT: Rot = [-Math.PI / 2, 0, 0];
/** How much larger a thing is drawn while a pointer has hold of it. */
const HELD_SCALE = 1.15;
/**
 * A drop zone is where a carried card is put, not a thing a hand takes hold of: a grip passes through it (the
 * library's pointerEventsType), so a hand resting by a zone keeps its ray, and a squeeze near one presses nothing.
 */
const NO_GRIP = { pointerEventsType: { deny: "grab" } } as const;
/**
 * The felt is the whole table top, so no hand presses it at all, by ray or by grip: a trigger pulled a little off a
 * card would otherwise play the card picked before. In VR a card is played by putting it there, or by a second press
 * on it. The mouse and the reticle, which do not miss that way, still press the felt.
 */
const NO_HANDS = { pointerEvents: "none" } as const;

// shortcut: card tables stand on the house floor at y = 0 (as the table meshes assume); give the plane the
// table's own height if a table is ever put on a raised floor.
/** Where a mouse or finger holds a card: just above the table top. */
const DRAG_PLANE = new Plane(new Vector3(0, 1, 0), -(TABLE_HEIGHT + 0.06));
/** A thing held by the mouse never goes further than this from my seat, however flat the pointer's ray. */
const MAX_REACH = 1.7;

/** What takes a pointer's capture: R3F's event target for the mouse and touch, the piece's own group for an XR pointer. */
interface Capture {
  setPointerCapture(id: number): void;
  releasePointerCapture(id: number): void;
  hasPointerCapture(id: number): boolean;
}

/** What the table keeps for each carry (carry.ts keeps who and what). Places are in my seat's frame. */
interface Rig {
  press: Press;
  capture: Capture;
  /** The carried thing itself, which a mouse's aim looks past. */
  self: Object3D;
  /** Where the thing was when taken and where it is now. */
  start: Vector3;
  point: Vector3;
  /** Mouse and touch: the pointer's ray in the world, which alone says where the thing is dropped (they have no depth). */
  aim: Ray | null;
  /** The furthest the press has wandered from where it began. */
  moved: number;
  since: number;
  /** A hand or a controller's ray: the thing as that pointer saw it when it took hold, to ride with it. */
  offset: Pose | null;
  /** That pointer's own place then (a grip), or the point on its ray where it took hold: what `moved` is measured from. */
  anchor: Vector3;
  /** How far from the pointer the thing was. */
  far: number;
  /** How far a card brought by the ray has come to the hand, 0 to 1. */
  pull: number;
}
type Held = Carry<Rig>;
const held = carries as Carries<Rig>;
/**
 * The mouse or finger press now down began on a piece (set by `pressing`, cleared by the next press anywhere). The
 * click that ends it belongs to that piece, so a zone under it takes no click: not even after Esc put the piece back.
 */
let pieceDown = false;
/** A click a zone takes: never one ending a press that began on a piece (XR pointers send no DOM pointerdown, so they are never held up by it). */
const zoneClick = (event: ThreeEvent<MouseEvent>): boolean => !pieceDown || pressOf(event as unknown as { pointerId: number }).xr;

/** What letting a thing go did: `placed` or not (the cue), and where it waits for the table's answer, if it does. */
interface Landing {
  placed: boolean;
  park?: Vec3 | "here";
}

interface FrameApi {
  root: RefObject<Group | null>;
  /** A mouse or finger press on a piece began or ended; `carried` says the ended press was a carry, not a tap. */
  pressing: (on: boolean, carried?: boolean) => void;
}
const FrameContext = createContext<FrameApi | null>(null);

/** Lets a carry's capture go. A pointer that is already gone says so by throwing. */
function letGo(carry: Held): void {
  try {
    carry.rig.capture.releasePointerCapture(carry.pointerId);
  } catch {
    // A cancelled touch or a vanished controller has nothing left to release.
  }
}

/** Where the mouse or a finger holds a thing now, or null when it points above the horizon. */
function sample(event: ThreeEvent<PointerEvent>, root: Group): Vector3 | null {
  const point = event.ray.intersectPlane(DRAG_PLANE, new Vector3());
  if (!point) return null;
  root.worldToLocal(point);
  const far = Math.hypot(point.x, point.z);
  if (far > MAX_REACH) point.set((point.x * MAX_REACH) / far, point.y, (point.z * MAX_REACH) / far);
  return point;
}

const worldTurn = new Quaternion();
/** A pose in the world, as my seat's frame sees it. */
function inSeat(position: Vector3, quaternion: Quaternion, root: Object3D, out: Pose): Pose {
  out.position.copy(position);
  root.worldToLocal(out.position);
  out.quaternion.copy(root.getWorldQuaternion(worldTurn).invert()).multiply(quaternion);
  return out;
}

const HAND_NOW = makePose();
const OFFSET = makePose();
const TARGET = makePose();
const PROBE = new Vector3();
const EYE = new Vector3();

/** Runs a tap and gives the cue it earned to the hand that made it. With no hand named (the reticle, a gamepad) it is only heard. */
function tell(tap: () => Told, source?: unknown): void {
  const told = tap();
  if (told) cue(told, source);
}

/**
 * A thing on the table that can be tapped, and carried if `onDrop` is given. It eases to `rest`; while a pointer
 * has hold of it, it goes where that pointer takes it. Without `onTap` and `onDrop` it cannot be used now: it takes
 * a press, buzzes, and does nothing.
 */
function Piece({
  name,
  rest,
  rotation,
  heldRotation,
  label,
  zone,
  size,
  from = "table",
  comes = false,
  caption,
  onTap,
  onDrop,
  onHeld,
  onRefuse,
  children,
}: {
  name: string;
  rest: Vec3;
  rotation: Rot;
  /** How it is turned while the mouse carries it. */
  heldRotation?: Rot;
  label?: string;
  /** The drop zone this thing stands in: a card aimed at it is dropped there. */
  zone?: ZoneId;
  /** Width and height of its face: it is framed while hovered or held, and kept above the table by its corners. */
  size?: [number, number];
  /** Where a carry of it is said to come from (carry.ts). */
  from?: string;
  /** A card: taken by a controller's ray, it comes to that hand. */
  comes?: boolean;
  /** Words riding above it while it is held: what letting go here will do. */
  caption?: string;
  /** A tap, which says what cue it earned. */
  onTap?: () => Told;
  /** Let go after being carried. */
  onDrop?: (carry: Held) => Landing;
  /** Called as it is carried, with the carry's place brought up to date. */
  onHeld?: (carry: Held) => void;
  /** Pressed while it cannot be used: says why (the refusal itself is only a buzz and a sound, which may be switched off). */
  onRefuse?: () => void;
  children: ReactNode;
}) {
  const frame = useContext(FrameContext)!;
  const group = useRef<Group>(null);
  const parked = useRef<{ point: Vector3; until: number; revision: number | undefined } | null>(null);
  const hovering = useRef(new Set<number>());
  const [hover, setHover] = useState(false);
  const isHeld = useSyncExternalStore(held.subscribe, () => held.holder(name) !== undefined);
  const reduced = useLocal((state) => state.comfort.reducedMotion);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const active = !!(onTap || onDrop);
  const restTurn = useMemo(() => new Quaternion().setFromEuler(new Euler(...rotation)), [rotation.join()]);
  const heldTurn = useMemo(() => (heldRotation ? new Quaternion().setFromEuler(new Euler(...heldRotation)) : null), [heldRotation?.join()]);

  useLayoutEffect(() => {
    group.current?.position.set(...rest);
    group.current?.quaternion.copy(restTurn);
    // Only where it first appears; after that it eases.
  }, []);
  // Gone while held (a card that left my hand, a token the table took away): the carry goes with it.
  useEffect(
    () => () => {
      const carry = held.holder(name);
      if (!carry) return;
      held.end(carry.pointerId);
      letGo(carry);
      if (!carry.rig.press.xr) frame.pressing(false);
    },
    [frame, name],
  );

  /** Ends this piece's carry by that pointer. Not `act`: the thing only goes back (a cancelled pointer). */
  const finish = (pointerId: number, act: boolean): void => {
    if (held.get(pointerId)?.thing !== name) return;
    // Out of the map before anything is done with it: one carry acts once.
    const carry = held.end(pointerId)!;
    const { rig } = carry;
    letGo(carry);
    if (!rig.press.xr) frame.pressing(false, carry.carrying);
    if (!act) return;
    if (!carry.carrying) {
      // A press that wandered off a thing that cannot be carried is no tap. Nor is a grip: squeezed and let go, the
      // thing only goes back (a ray, the mouse or a finger presses).
      if (onTap && carry.how !== "grip" && rig.moved < tapSlop(carry.how, rig.far)) tell(onTap, rig.press.source);
      return;
    }
    const landing = onDrop?.(carry) ?? { placed: false };
    cue(landing.placed ? "place" : "refuse", rig.press.source);
    // A thing whose drop was sent to the server waits at its spot until the table changes (a pulled pile then goes home
    // at once instead of covering my hand), or eases home after 1.5 s (a refusal is shown as a notice).
    // shortcut: any change to the table ends the wait; wait for the action's own reply if a slow link makes cards jump back.
    if (landing.park) {
      const point = landing.park === "here" ? rig.point.clone() : new Vector3(...landing.park);
      parked.current = { point, until: performance.now() + 1500, revision: net.getState().table?.revision };
    }
  };

  useFrame((state, delta) => {
    const self = group.current;
    const root = frame.root.current;
    if (!self || !root) return;
    const carry = held.holder(name);
    if (parked.current && (performance.now() > parked.current.until || net.getState().table?.revision !== parked.current.revision)) parked.current = null;
    // About 0.15 s to arrive; at once with reduced motion.
    const k = reduced ? 1 : 1 - Math.exp(-delta * 20);
    let to: Vector3 | null = parked.current?.point ?? null;
    let turnTo = parked.current && heldTurn ? heldTurn : restTurn;

    if (carry?.rig.press.xr) {
      // A hand or a controller's ray: placed from the pointer's live pose, which the library works out every frame
      // (not from pointer-move events), so the thing is exactly where the hand is.
      const { rig } = carry;
      const live = getPointerById(carry.pointerId)?.getIntersection();
      if (!live) return;
      inSeat(live.pointerPosition, live.pointerQuaternion, root, HAND_NOW);
      const ray = carry.how === "ray";
      rig.moved = Math.max(rig.moved, (ray ? rayPoint(HAND_NOW, rig.far, PROBE) : HAND_NOW.position).distanceTo(rig.anchor));
      if (!carry.carrying && onDrop && isCarry(carry.how, rig.moved, rig.far, performance.now() - rig.since, comes)) held.update(carry.pointerId, { carrying: true });
      const brought = ray && comes;
      // A grip has the thing from the first frame. A ray only once the press has become a carry: until then it may be a click.
      if (onDrop && rig.offset && (carry.carrying || !ray)) {
        let offset = rig.offset;
        if (brought) {
          rig.pull = reduced ? 1 : Math.min(1, rig.pull + delta / BRING_TIME);
          offset = blend(rig.offset, RAY_HOLD, ease(rig.pull), OFFSET);
        }
        ride(HAND_NOW, offset, TARGET);
        // A token or pile on the end of a ray slides with it but keeps its own turn.
        if (ray && !comes) TARGET.quaternion.copy(restTurn);
        if (size) {
          // The world matrix, because in VR the camera sits inside the moving rig.
          if (comes) faceHolder(TARGET, root.worldToLocal(EYE.setFromMatrixPosition(state.camera.matrixWorld)));
          keepAbove(TARGET, size[0] * HELD_SCALE, size[1] * HELD_SCALE, feltFloor(frameOf(root), TARGET.position.x, TARGET.position.z));
        }
        self.position.copy(TARGET.position);
        self.quaternion.copy(TARGET.quaternion);
        rig.point.copy(self.position);
        if (carry.carrying) onHeld?.(carry);
        return;
      }
    } else if (carry?.carrying) {
      // The mouse or a finger: toward the point under it, on the plane above the table.
      to = carry.rig.point;
      turnTo = heldTurn ?? restTurn;
    }

    // At rest, or pressed but not yet carried: up a little at once, so the press or the hover is felt.
    const lift = carry && onDrop ? 0.02 : hover && active ? 0.01 : 0;
    const [x, y, z] = to ? [to.x, to.y, to.z] : [rest[0], rest[1] + lift, rest[2]];
    const at = self.position;
    at.set(at.x + (x - at.x) * k, at.y + (y - at.y) * k, at.z + (z - at.z) * k);
    self.quaternion.slerp(turnTo, k);
  });

  const handlers = active
    ? {
        onPointerDown: (event: ThreeEvent<PointerEvent>) => {
          const root = frame.root.current;
          const self = group.current;
          if (event.button || !root || !self) return;
          event.stopPropagation();
          const press = pressOf(event);
          const capture = event.currentTarget as unknown as Capture;
          const rig: Rig = { press, capture, self, start: self.position.clone(), point: self.position.clone(), aim: null, moved: 0, since: performance.now(), offset: null, anchor: new Vector3(), far: 0, pull: 0 };
          if (press.xr) {
            // The library's own event: where its pointer is and how it is turned, in the world.
            const xr = event as unknown as { pointerPosition: Vector3; pointerQuaternion: Quaternion; point: Vector3 };
            const hand = inSeat(xr.pointerPosition, xr.pointerQuaternion, root, makePose());
            rig.offset = attach(hand, self, makePose());
            rig.far = xr.pointerPosition.distanceTo(xr.point);
            if (press.how === "ray") rayPoint(hand, rig.far, rig.anchor);
            else rig.anchor.copy(hand.position);
          } else {
            const at = sample(event, root);
            if (at) rig.start.copy(at);
            rig.point.copy(rig.start);
            rig.aim = event.ray.clone();
          }
          // Refused when another pointer has this thing, or this pointer's hand is already carrying: the press is ignored.
          if (!held.begin({ pointerId: press.pointerId, thing: name, hand: press.hand, how: press.how, from, carrying: false, over: null, rig })) return;
          capture.setPointerCapture(press.pointerId);
          if (!press.xr) frame.pressing(true);
          cue("grab", press.source);
        },
        onPointerMove: (event: ThreeEvent<PointerEvent>) => {
          // Only the mouse and touch move by events; a hand is read every frame.
          const carry = held.get(event.pointerId);
          const root = frame.root.current;
          if (!carry || carry.thing !== name || carry.rig.press.xr || !root) return;
          const at = sample(event, root);
          if (!at) return;
          const { rig } = carry;
          rig.point.copy(at);
          rig.aim = event.ray.clone();
          rig.moved = Math.max(rig.moved, at.distanceTo(rig.start));
          if (!onDrop) return;
          if (!carry.carrying && isCarry(carry.how, rig.moved, 0, 0, false)) held.update(carry.pointerId, { carrying: true });
          if (carry.carrying) onHeld?.(carry);
        },
        onPointerEnter: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          const press = pressOf(event);
          // A pointer that is carrying, or whose hand is, lights nothing up; nor does a thing another hand already has.
          if (held.blocked(press.pointerId, press.hand) || held.holder(name)) return;
          hovering.current.add(press.pointerId);
          setHover(true);
          if (hoverGate(press.hand, performance.now())) cue("hover", press.source);
        },
      }
    : {
        // What a thing that cannot be used now does with a press: takes it, so it neither reaches what lies behind
        // (the play zone) nor counts as a click on the room, which would capture the mouse (controls/input.ts).
        onPointerDown: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          cue("refuse", pressOf(event).source);
          onRefuse?.();
        },
      };

  return (
    <group
      ref={group}
      name={name}
      scale={isHeld ? HELD_SCALE : hover && active ? 1.08 : 1}
      // The centre reticle and gamepad (controls/activate.ts) press this.
      userData={{ onActivate: onTap && (() => tell(onTap)), label, zone }}
      {...handlers}
      // The click that follows a press belongs to this thing and to nothing behind it (a zone under a tapped card).
      onClick={(event: ThreeEvent<MouseEvent>) => event.stopPropagation()}
      // These stay when a thing stops being usable under a press or a pointer (the table moved on): the press still
      // ends, doing nothing, and the frame goes.
      onPointerUp={(event: ThreeEvent<PointerEvent>) => {
        if (held.get(event.pointerId)?.thing !== name) return;
        event.stopPropagation();
        // A controller that switched off with its button down has not let go: the thing only goes back (carry.ts).
        finish(event.pointerId, active && wasLetGo(event.nativeEvent));
      }}
      onPointerCancel={(event: ThreeEvent<PointerEvent>) => finish(event.pointerId, false)}
      onPointerLeave={(event: ThreeEvent<PointerEvent>) => {
        hovering.current.delete(event.pointerId);
        setHover(hovering.current.size > 0);
      }}
    >
      {size && (isHeld || (hover && active)) && (
        <mesh geometry={PLANE} position={[0, 0, -0.0012]} scale={[size[0] + 0.012, size[1] + 0.012, 1]} {...INERT}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {children}
      {caption && size && (
        // Small enough not to hide the trick beyond the card it rides on.
        <Label lines={wrap(caption, 26)} box={[0.22 * uiScale, 0.055 * uiScale]} options={{ background: caption.startsWith("Not") || caption.startsWith("Wait") ? "#5a1010" : "#10131c", fontPx: 48 }} position={[0, size[1] / 2 + 0.035 * uiScale, 0.004]} inert />
      )}
    </group>
  );
}

/** The frame of the table a root group draws, kept on the group so a piece can ask for the felt's height under it. */
const frameOf = (root: Object3D): Frame => root.userData.frame as Frame;

/** Words on a coloured plate; a disabled one is grey with a bar struck through it. */
function Plate({ lines, size, disabled = false }: { lines: string[]; size: [number, number]; disabled?: boolean }) {
  const [width, height] = size;
  const background = disabled ? OFF : ON;
  return (
    <>
      <mesh geometry={PLANE} scale={[width, height, 1]}>
        <meshBasicMaterial color={background} />
      </mesh>
      <Label
        lines={lines}
        box={[width * 0.94, Math.min(height * 0.92, lines.length * height * 0.4)]}
        options={{ background, color: disabled ? "#9aa0ac" : "#ffffff", fontPx: 44, padding: 6 }}
        position={[0, 0, 0.002]}
      />
      {disabled && (
        <mesh geometry={PLANE} position={[0, 0, 0.004]} scale={[width * 0.9, Math.max(0.003, height * 0.05), 1]}>
          <meshBasicMaterial color="#d0d4dc" />
        </mesh>
      )}
    </>
  );
}

function CardFace({ card, width, dim = false, framed = false }: { card: Card; width: number; dim?: boolean; framed?: boolean }) {
  const height = width / CARD_ASPECT;
  return (
    <>
      {framed && (
        <mesh geometry={PLANE} position={[0, 0, -0.0006]} scale={[width + 0.01, height + 0.01, 1]}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      <mesh geometry={PLANE} scale={[width, height, 1]}>
        <meshBasicMaterial map={makeCardTexture(card)} color={dim ? "#9a9a9a" : "#ffffff"} />
      </mesh>
    </>
  );
}

const dummy = new Object3D();
dummy.rotation.order = "YXZ";

/** Every face-down card on the table in one draw call. `items` is x, y, z, turn, width per card. */
function CardBacks({ items }: { items: number[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const count = Math.min(MAX_BACKS, items.length / 5);
    for (let i = 0; i < count; i += 1) {
      const width = items[i * 5 + 4];
      dummy.position.set(items[i * 5], items[i * 5 + 1], items[i * 5 + 2]);
      dummy.rotation.set(-Math.PI / 2, items[i * 5 + 3], 0);
      dummy.scale.set(width, width / CARD_ASPECT, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    // Not culled: the bounding sphere of an instanced mesh knows nothing of where its instances are.
    <instancedMesh ref={ref} args={[PLANE, undefined, MAX_BACKS]} frustumCulled={false}>
      <meshBasicMaterial map={makeCardBackTexture()} />
    </instancedMesh>
  );
}

/**
 * A drop zone: an outline on the felt and its word. Its flat mesh is always there for a card aimed at it to land on
 * (userData.zone); the outline, the word and the tap (which drops the card picked by a tap) only while `shown`.
 * With a held card over it (`lit`) the outline is thicker and the word is what letting go will do (`say`).
 */
function ZoneMark({ zone, lit, say, shown, wordAt, onTap }: { zone: Zone; lit: boolean; say?: string; shown: boolean; wordAt?: Vec3; onTap?: () => Told }) {
  const tap = shown ? onTap : undefined;
  const colour = lit ? "#ffffff" : "#ffd24a";
  const thick = lit ? 0.014 : 0.005;
  const { halfX, halfZ } = zone;
  // Round zones are named where `wordAt` says, piles and melds in front of them, the others at their left end, where my hand does not hide the word.
  const word: Vec3 = wordAt ?? (zone.id === "discard" || zone.id.startsWith("meld-") ? [0, 0.02, halfZ + 0.04] : [-halfX - 0.07, 0.02, 0]);
  const lines = wrap(lit && say ? say : zone.label, zone.round ? 30 : 16);
  return (
    <group position={[zone.x, TOP, zone.z]}>
      <mesh
        name={`zone-${zone.id}`}
        geometry={zone.round ? DISC : PLANE}
        rotation={FLAT}
        scale={zone.round ? [halfX, halfX, 1] : [halfX * 2, halfZ * 2, 1]}
        userData={{ onActivate: tap && (() => tell(tap)), label: zone.label, zone: zone.id }}
        {...(zone.round ? NO_HANDS : NO_GRIP)}
        onClick={
          tap &&
          ((event) => {
            event.stopPropagation();
            if (zoneClick(event) && wasLetGo(event.nativeEvent)) tell(tap, sourceOf(event));
          })
        }
      >
        <meshBasicMaterial color={colour} transparent opacity={!shown ? 0 : lit ? 0.16 : 0.05} depthWrite={false} />
      </mesh>
      {shown && (
        <>
          {zone.round ? (
            <mesh geometry={lit ? RING_THICK : RING} rotation={FLAT} position={[0, 0.001, 0]} scale={[halfX, halfX, 1]}>
              <meshBasicMaterial color={colour} />
            </mesh>
          ) : (
            [-1, 1].flatMap((side) => [
              <mesh key={`x${side}`} geometry={PLANE} rotation={FLAT} position={[0, 0.001, side * halfZ]} scale={[halfX * 2 + thick, thick, 1]}>
                <meshBasicMaterial color={colour} />
              </mesh>,
              <mesh key={`z${side}`} geometry={PLANE} rotation={FLAT} position={[side * halfX, 0.001, 0]} scale={[thick, halfZ * 2 + thick, 1]}>
                <meshBasicMaterial color={colour} />
              </mesh>,
            ])
          )}
          <Label
            lines={lines}
            box={zone.round ? [0.36, 0.035 * lines.length + 0.01] : [0.13, 0.03 * lines.length + 0.006]}
            options={{ fontPx: 48, color: lit ? "#ffffff" : "#ffd24a" }}
            position={word}
            rotation={[TOKEN_LEAN, 0, 0]}
          />
        </>
      )}
    </group>
  );
}

export function AtTable({ spot, actions }: { spot: TableSpot; actions: TableActions & { description: TableDescription } }) {
  const { description, error, press, activateCard, busy } = actions;
  const phase = useStore((state) => state.table?.view?.phase ?? null);
  const connection = useStore((state) => state.connection);
  const dominant = useLocal((state) => state.comfort.dominantHand);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const selection = useLocal((state) => state.selection);
  const xrActive = useLocal((state) => state.xrActive);
  const [staged, setStaged] = useState<readonly string[]>([]);
  const [notices, setNotices] = useState<{ id: number; text: string; at: Vec3 }[]>([]);
  // Drawn again whenever a carry begins, becomes a carry, changes zone or ends.
  useSyncExternalStore(held.subscribe, () => held.version);
  const root = useRef<Group>(null);
  const guard = useRef<Mesh>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  const mousePresses = useRef(0);
  const cancelSeen = useRef(desk.cancelCount);
  const dragEnded = useRef(0);
  const noticeId = useRef(0);

  const { tableCards, seats } = description;
  const me = seats.find((seat) => seat.isYou) ?? null;
  const viewer = me ? spot.seats[me.seat] : spot.host;
  const side = dominant === "right" ? 1 : -1;
  const frame = useMemo<Frame>(() => frameFor(spot, me?.seat ?? null), [spot, me?.seat]);
  const reach = frame.reach;
  const mode = tableMode(description);
  const zones = useMemo(() => tableZones(description, frame), [description, frame]);
  const spread = useMemo(() => pruneSpread(description, staged), [description, staged]);
  const melds = useMemo(() => meldRows(description, frame), [description, frame]);
  const result = resultSummary(description, phase);
  const pile = pileSpot(frame);
  const describe = (chosen: readonly string[]): TableDescription => describeNow(spot.id, chosen) ?? description;

  // The cards being carried (taken and moved), by card id. A hand can end under one, and a card that is no longer
  // mine is not held: its piece is gone, and its carry with it.
  const up = new Map<string, Held>();
  for (const carry of held.list()) if (carry.carrying && carry.thing.startsWith("card-")) up.set(carry.thing.slice(5), carry);
  /** What letting that card go where it is would do, in words. */
  const foretell = (cardId: string, carry: Held): string => {
    const zone = carry.over as ZoneId | null;
    return foresee(dropCard(describe, { selection, spread }, cardId, zone), zone);
  };
  const said = new Map<string, string>();
  for (const [cardId, carry] of up) if (carry.over && !said.has(carry.over)) said.set(carry.over, foretell(cardId, carry));

  const api = useMemo<FrameApi>(
    () => ({
      root,
      pressing(on, carried = false) {
        mousePresses.current = Math.max(0, mousePresses.current + (on ? 1 : -1));
        if (on) {
          pieceDown = true;
          if (guard.current) guard.current.visible = true;
          return;
        }
        if (carried) dragEnded.current = performance.now();
        // The browser's click comes just after the release: until then the felt still counts as interface,
        // so letting a card go over nothing does not capture the mouse (controls/input.ts asks isInteractiveAt).
        // shortcut: fixed waits (80 ms here, 300 ms in tapZone) stand in for knowing which click belongs to which
        // press; carry the press's pointer id to the click handlers if a slow frame ever lets a stray click through.
        setTimeout(() => {
          if (guard.current && !mousePresses.current) guard.current.visible = false;
        }, 80);
      },
    }),
    [],
  );

  /** Shows a reason for two seconds at a place in my seat's frame: beside what it is about, or over the near felt. */
  const say = (text: string, at: Vec3 = [0, TOP + 0.22, -(frame.rim + 0.2)]): void => {
    const id = (noticeId.current += 1);
    setNotices((list) => [...list, { id, text, at }]);
    setTimeout(() => setNotices((list) => list.filter((notice) => notice.id !== id)), 2000);
  };
  /** Everything carried goes back with nothing done. `buzz`: the player asked for it, so each hand is told. */
  const putBack = (buzz: boolean): void => {
    for (const carry of held.clear()) {
      letGo(carry);
      if (!carry.rig.press.xr) api.pressing(false);
      if (buzz) cue("refuse", carry.rig.press.source);
    }
  };

  // A release made in another window never arrives, so a card let go there would hang in the air: losing the
  // window's focus puts back whatever is carried. Leaving the table does too.
  useEffect(() => {
    const blur = (): void => putBack(false);
    // Before R3F hears it (capture, on the window): a new press is not on a piece until a piece says so.
    const down = (): void => void (pieceDown = false);
    window.addEventListener("blur", blur);
    window.addEventListener("pointerdown", down, true);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerdown", down, true);
      putBack(false);
    };
  }, []);
  useFrame(() => {
    // A capture that went without a release (a controller switched off, the session over or out of view, the mouse
    // let go elsewhere): no event says so reliably (carry.ts), so each carry is asked, and the thing goes back.
    for (const lost of held.sweep((carry) => carry.rig.capture.hasPointerCapture(carry.pointerId))) if (!lost.rig.press.xr) api.pressing(false);
    // Cancel (the VR B button, gamepad B, Esc: controls/input.ts) puts back only what either hand carries. The kitty
    // stack, the picked cards and my staged spread stay; each card comes off them one at a time (only gamepad B also clears the picks).
    if (cancelSeen.current === desk.cancelCount) return;
    cancelSeen.current = desk.cancelCount;
    putBack(true);
  });
  // The server's refusal is also said where the hands are, not only on the placard.
  useEffect(() => {
    if (error) say(error);
  }, [error, frame]);

  /** Where a card whose move was sent comes to rest while the table answers: the place it will be shown next. */
  const landing = (zone: ZoneId): Vec3 | "here" => {
    if (zone === "play" && me) {
      const [x, z] = toward(frame, me.seat, 0.2);
      return [x, standing(TRICK_CARD / CARD_ASPECT), z];
    }
    if (zone === "discard") return [pile.x, standing(PILE_CARD / CARD_ASPECT), pile.z];
    const row = melds.find((entry) => `meld-${entry.index}` === zone);
    return row ? [row.x + row.halfX, standing(MELD_CARD / CARD_ASPECT), row.z] : "here";
  };

  /** Puts a hand card on a zone and says what came of it; `at` is where a refusal's reason is shown. */
  const drop = (cardId: string, zone: ZoneId | null, at: Vec3): Outcome["kind"] => {
    const picks = local.getState().selection;
    const outcome = settle(dropCard(describe, { selection: picks, spread }, cardId, zone), busy());
    if (outcome.kind === "press") void press(outcome.button);
    else if (outcome.kind === "select") local.set({ selection: outcome.selection });
    else if (outcome.kind === "spread") {
      setStaged(outcome.spread);
      // A card staged by a tap is no longer the card a tap on the discard pile would discard.
      if (mode !== "kitty" && picks.includes(cardId)) local.set({ selection: picks.filter((id) => id !== cardId) });
    } else if (outcome.kind === "reject") say(outcome.reason, at);
    return outcome.kind;
  };
  /** Presses a button for a tap, a pull or a push, unless the last move is still on its way to the server. */
  const act = (button: TableButton): "place" | "refuse" => {
    if (busy()) {
      say("Wait for the last move");
      return "refuse";
    }
    void press(button);
    return "place";
  };

  /** The zone a carried card would be dropped on: for a hand, the one its middle is over; for the mouse, what the cursor is aimed at. */
  const track = (carry: Held): void => {
    const { rig } = carry;
    let zone: ZoneId | null = null;
    const base = root.current;
    if (rig.press.xr) zone = zoneAt(zones, rig.point.x, rig.point.z, carry.over as ZoneId | null);
    else if (rig.aim && base) {
      // shortcut: every object of this one table is walked for the tagged ones on each move of a card held by the
      // mouse (a few hundred objects); keep a list of them if a table ever grows enough for a drag to stutter.
      const targets: Object3D[] = [];
      base.traverse((object) => {
        if (object.userData.zone && object !== rig.self) targets.push(object);
      });
      raycaster.set(rig.aim.origin, rig.aim.direction);
      for (let at: Object3D | null = raycaster.intersectObjects(targets, true)[0]?.object ?? null; at; at = at.parent) {
        if (at.userData.zone) {
          zone = at.userData.zone as ZoneId;
          break;
        }
      }
    }
    held.update(carry.pointerId, { over: zone });
  };

  /** A tap on a zone puts the card picked by a tap there. */
  const tapZone = (zone: Zone | undefined): Told => {
    // A zone under the place a drag began would otherwise get R3F's click for the same press.
    if (!zone || performance.now() - dragEnded.current < 300) return;
    const picked = local.getState().selection[0];
    if (!picked || mode === "kitty") return;
    const came = drop(picked, zone.id, [zone.x, TOP + 0.12, zone.z]);
    return came === "reject" ? "refuse" : came === "none" ? undefined : "place";
  };
  /** A tap on what stands in a zone (the discard pile, a meld's cards) counts as a tap on the zone: a ray aimed at them passes over the outline on the felt. */
  const tapIn = (id: ZoneId): (() => Told) | undefined => {
    const zone = zones.find((entry) => entry.id === id);
    return zone && (() => tapZone(zone));
  };

  const backs = useMemo(() => {
    const items: number[] = [];
    for (const seat of seats) {
      if (seat.isYou || !seat.cardCount) continue;
      const angle = frame.seatAngle(seat.seat);
      const [x, z] = toward(frame, seat.seat, 0.44);
      for (let i = 0; i < seat.cardCount; i += 1) {
        const along = (i - (seat.cardCount - 1) / 2) * 0.02;
        // Each card a hair higher than the last so the overlapped fan does not flicker.
        items.push(x + Math.cos(angle) * along, TOP + i * 0.0006, z - Math.sin(angle) * along, angle, 0.05);
      }
    }
    if (tableCards.kittyCount) items.push(0, TOP, -reach, 0, 0.07);
    return items;
  }, [seats, tableCards.kittyCount, frame, reach]);

  // My cards: on the kitty spot, on my spread, or in the hand row.
  const kittyZone = zones.find((zone) => zone.id === "kitty");
  const spreadZone = zones.find((zone) => zone.id === "spread");
  const inKitty = kittyZone ? description.hand.filter((card) => card.selected) : [];
  const inSpread = spread.flatMap((id) => description.hand.filter((card) => card.card.id === id));
  const inHand = description.hand.filter((card) => !inKitty.includes(card) && !inSpread.includes(card));
  const places = new Map<string, { rest: Vec3; rotation: Rot; width: number }>();
  handFan(inHand.length, frame).forEach((slot, i) => {
    places.set(inHand[i].card.id, { rest: [slot.x, slot.y + (inHand[i].selected ? 0.03 : 0), slot.z], rotation: [HAND.tilt, 0, 0], width: HAND.card });
  });
  const lay = (cards: typeof inKitty, zone: Zone | undefined): void => {
    if (!zone) return;
    stagedRow(cards.length, zone.x, zone.z).forEach((at, i) =>
      places.set(cards[i].card.id, { rest: [at.x, standing(STAGED_CARD / CARD_ASPECT), at.z], rotation: [LEAN, 0, 0], width: STAGED_CARD }),
    );
  };
  lay(inKitty, kittyZone);
  lay(inSpread, spreadZone);

  const tokens = tokenButtons(description);
  const grid = tokenGrid(
    tokens.map((button) => button.label),
    frame,
    uiScale,
  );
  const bury = buryButton(description);
  const layDown = layButton(description, spread);
  const stock = description.buttons.find((button) => button.id === "draw-stock");
  const takeDiscard = description.buttons.find((button) => button.id === "draw-discard");
  const leave = description.buttons.find((button) => button.id === "leave");
  const go = (button: TableButton | null | undefined): (() => Told) | undefined => (button && !button.disabled ? () => act(button) : undefined);
  /** A thing moved far enough the right way (a pile toward me, a token toward the middle) presses its button and waits where it was let go. */
  const moved = (button: TableButton | undefined, far: (startZ: number, endZ: number) => boolean) =>
    button && !button.disabled
      ? (carry: Held): Landing => (far(carry.rig.start.z, carry.rig.point.z) && act(button) === "place" ? { placed: true, park: "here" } : { placed: false })
      : undefined;

  const status = [
    // The page's connection badge cannot be seen in a headset, so a lost connection is said here too.
    ...(connection === "online" ? [] : [connection === "offline" ? "Offline: cannot reach the server" : "Reconnecting to the server..."]),
    ...(error ? wrap(`Problem: ${error}`, 44) : []),
    // The house rules are tokens in the lobby; once cards are out they would only crowd the score and the contract.
    ...[...description.statusLines.filter((line) => phase === null || !line.startsWith("House rules")), ...tableWords(tableCards)].flatMap((line) => wrap(line, 44)),
  ];
  // The felt covers the whole table, so it is only outlined while a card is up, or picked where a press on it
  // plays that card: in a headset no hand presses the felt (NO_HANDS), so there it shows for a carried card alone.
  const showFelt = up.size > 0 || (selection.length > 0 && !xrActive);
  // Every table has its marker post to the north-west and the dealer's stand to the south-east (world/plan.ts), so the
  // words go to a free corner beyond the table: on my right from seats 0 and 2, on my left from seats 1 and 3, and
  // for the standing host between the two seats on the right.
  // shortcut: where that furniture stands is known here by reading world/plan.ts, which does not say it in data; if
  // it moves, move the board and the leave marker with it (or have plan.ts export the free corners).
  const boardAt: Vec3 = me ? [me.seat % 2 ? -1 : 1, 1.15, -(reach + 1.25)] : [1.7, 1.3, -(reach + 1.2)];
  // The dealer's stand is at seat 0's right elbow and seat 3's left, so their leave marker goes on the other side.
  const leaveSide = me?.seat === 0 ? -1 : me?.seat === 3 ? 1 : side;
  const puck = (name: string, words: string, button: TableButton | null, zone: Zone, hint: string) => {
    const at = puckSpot(zone);
    return (
      <Piece name={name} label={words} rest={[at.x, TOP + 0.009, at.z]} rotation={[0, 0, 0]} onTap={go(button)}>
        <mesh geometry={PUCK}>
          <meshBasicMaterial color={button && !button.disabled ? "#ffd24a" : OFF} />
        </mesh>
        <group position={[0, 0.02, -0.065]} rotation={[TOKEN_LEAN, 0, 0]}>
          <Plate lines={[words, ...(button && !button.disabled ? [] : wrap(`(${button?.reason ?? hint})`, 22))]} size={[0.16 * uiScale, 0.06 * uiScale]} disabled={!button || button.disabled} />
        </group>
      </Piece>
    );
  };

  return (
    <FrameContext.Provider value={api}>
      <group ref={root} position={[viewer.x, 0, viewer.z]} rotation={[0, viewer.ry, 0]} userData={{ frame }}>
        {/* Seen by controls/activate.ts only, and only around a mouse press (see `pressing` above): whatever the pointer is over then is interface. */}
        <mesh ref={guard} geometry={SURROUND} visible={false} userData={{ onActivate: () => {} }}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={BackSide} />
        </mesh>

        {/* Words: a board at eye height beyond the table, in the gap between the player opposite and a neighbour,
            turned to me. Nothing hangs between my eyes and my hand or the table centre, and no player is behind it.
            The result is shown instead when the game is over. */}
        {!result && (
          <Label
            lines={status}
            box={[0.9 * uiScale, 0.6 * uiScale]}
            options={{ align: "left", fontPx: 36 }}
            position={boardAt}
            rotation={[0, Math.atan2(-boardAt[0], -boardAt[2]), 0]}
          />
        )}

        {/* My hand, wherever each card now lies. */}
        {description.hand.map((card) => {
          const { id } = card.card;
          const place = places.get(id)!;
          const onSpread = inSpread.includes(card);
          const carry = up.get(id);
          return (
            <Piece
              key={id}
              name={`card-${id}`}
              label={cardLabel(card.card)}
              rest={place.rest}
              rotation={place.rotation}
              heldRotation={[LEAN, 0, 0]}
              size={[place.width, place.width / CARD_ASPECT]}
              zone={onSpread ? "spread" : inKitty.includes(card) ? "kitty" : "hand"}
              from={onSpread ? "spread" : inKitty.includes(card) ? "kitty" : "hand"}
              comes
              caption={carry && foretell(id, carry)}
              onTap={() => {
                if (onSpread) return setStaged(spread.filter((staged) => staged !== id));
                // A second tap on a picked card plays or discards it; any other tap only picks it or puts it back.
                const confirm = card.selected ? confirmButton(description) : null;
                if (confirm) return act(confirm);
                activateCard(id);
              }}
              onDrop={(dropped) => {
                const zone = dropped.over as ZoneId | null;
                const came = drop(id, zone, [place.rest[0], place.rest[1] + 0.12, place.rest[2]]);
                return { placed: came === "press" || came === "select" || came === "spread", park: came === "press" ? landing(zone!) : undefined };
              }}
              onHeld={track}
            >
              <CardFace card={card.card} width={place.width} dim={(mode === "play" || mode === "tonk-meld") && !card.selectable && !onSpread} framed={card.selected} />
            </Piece>
          );
        })}
        {me?.isTurn && (
          // On the felt to my left, beyond my hand: marks my seat without covering a card, a zone or a token.
          <group position={[-0.28, TABLE_HEIGHT + 0.012, -(frame.rim + 0.3)]} rotation={[-1.1, 0, 0]}>
            <mesh geometry={TURN_CONE} position={[-0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <meshBasicMaterial color="#ffd24a" />
            </mesh>
            <Label lines={["YOUR TURN"]} box={[0.2 * uiScale, 0.035 * uiScale]} />
          </group>
        )}
        {notices.map((notice) => (
          <Label key={notice.id} lines={wrap(notice.text, 30)} box={[0.36 * uiScale, 0.08 * uiScale]} options={{ background: "#5a1010", fontPx: 48 }} position={notice.at} rotation={[-0.6, 0, 0]} />
        ))}

        {/* Drop zones. The felt covers the whole table, so it is only drawn while a card is up. */}
        {zones.map((zone) =>
          zone.id === "hand" ? (
            // Never drawn: where a card is let go to put it back in my hand. A hair above the felt, so a cursor aimed here finds it first.
            <mesh key="hand" geometry={PLANE} position={[zone.x, TOP + 0.002, zone.z]} rotation={FLAT} scale={[zone.halfX * 2, zone.halfZ * 2, 1]} userData={{ zone: zone.id }}>
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          ) : (
            <ZoneMark
              key={zone.id}
              zone={zone}
              lit={said.has(zone.id)}
              say={said.get(zone.id)}
              shown={zone.round ? (zone.id === "wait" ? up.size > 0 : showFelt) : true}
              // The felt's word lies in the near field, past my hand, not at the far rim or under my cards.
              wordAt={zone.round ? [0, 0.02, reach - frame.rim - 0.17] : undefined}
              onTap={zone.id === "wait" ? undefined : () => tapZone(zone)}
            />
          ),
        )}
        {kittyZone && puck("puck-bury", "Bury six", bury, kittyZone, "put six cards on the kitty")}
        {spreadZone && puck("puck-lay", "Lay down", layDown, spreadZone, "put a set or run on your spread")}

        {/* Choices, as tokens on the rail beyond my hand (the host's on the dealer's stand). */}
        {tokens.map((button, i) => {
          const cell = grid.cells[i];
          return (
            <Piece
              key={button.id}
              name={objectName(button.id)}
              label={button.label}
              rest={[cell.x, cell.y, cell.z]}
              rotation={[TOKEN_LEAN, cell.ry, 0, "YXZ"]}
              size={[grid.width, grid.height]}
              onTap={go(button)}
              onDrop={moved(button, pushed)}
              // A disabled token says why when pressed, by its place: in a headset the buzz alone says only "no".
              onRefuse={button.disabled ? () => say(button.reason ?? "Not now", [cell.x, cell.y + 0.1, cell.z]) : undefined}
            >
              <Plate lines={wrap(button.label, grid.wrapAt)} size={[grid.width, grid.height]} disabled={button.disabled} />
            </Piece>
          );
        })}
        {leave && (
          // Low and to the side of my chair, never under a card.
          <Piece name="leave" label={leave.label} rest={leaveSpot(leaveSide)} rotation={[-0.7, -leaveSide * 1.05, 0, "YXZ"]} size={[0.17 * uiScale, 0.055 * uiScale]} onTap={go(leave)}>
            <Plate lines={wrap(leave.label, 20)} size={[0.17 * uiScale, 0.055 * uiScale]} />
          </Piece>
        )}

        {/* Tonk's piles: tap, or pull toward me, to draw. */}
        {tableCards.stockCount !== null && (
          <>
            {tableCards.stockCount > 0 && (
              <Piece
                name="pile-stock"
                label="Stock"
                rest={[-pile.x, standing(PILE_CARD / CARD_ASPECT), pile.z]}
                rotation={[LEAN, 0, 0]}
                size={[PILE_CARD, PILE_CARD / CARD_ASPECT]}
                onTap={go(stock)}
                onDrop={moved(stock, pulled)}
              >
                <mesh geometry={PLANE} scale={[PILE_CARD, PILE_CARD / CARD_ASPECT, 1]}>
                  <meshBasicMaterial map={makeCardBackTexture()} color={stock && !stock.disabled ? "#ffffff" : "#9a9a9a"} />
                </mesh>
              </Piece>
            )}
            {tableCards.discardTop && (
              <Piece
                name="pile-discard"
                label="Discard pile"
                zone="discard"
                rest={[pile.x, standing(PILE_CARD / CARD_ASPECT), pile.z]}
                rotation={[LEAN, 0, 0]}
                size={[PILE_CARD, PILE_CARD / CARD_ASPECT]}
                onTap={tapIn("discard") ?? go(takeDiscard)}
                onDrop={moved(takeDiscard, pulled)}
              >
                <CardFace card={tableCards.discardTop} width={PILE_CARD} />
              </Piece>
            )}
            {/* Small signs standing behind the piles, above their tops. */}
            <Label
              lines={[`Stock: ${tableCards.stockCount}`, ...(stock && !stock.disabled ? ["tap or pull to draw"] : [])]}
              box={[0.17 * uiScale, 0.045 * uiScale]}
              position={[-pile.x - 0.04, TOP + 0.125, pile.z - 0.085]}
              rotation={[-0.5, 0, 0]}
            />
            {mode !== "tonk-meld" && (
              <Label
                lines={tableCards.discardTop ? [cardLabel(tableCards.discardTop), ...(takeDiscard && !takeDiscard.disabled ? ["tap or pull to take"] : [])] : ["Discard pile empty"]}
                box={[0.17 * uiScale, 0.045 * uiScale]}
                position={[pile.x + 0.04, TOP + 0.125, pile.z - 0.085]}
                rotation={[-0.5, 0, 0]}
              />
            )}
          </>
        )}

        <CardBacks items={backs} />
        {seats.map((seat) => {
          if (seat.isYou) return null;
          const [x, z] = toward(frame, seat.seat, 0.54);
          return (
            <group key={seat.seat} position={[x, TABLE_HEIGHT + 0.12, z]} rotation={[-0.3, 0, 0]}>
              <Label lines={seatLines(seat)} box={[0.3 * uiScale, 0.14 * uiScale]} options={{ fontPx: 48 }} />
              {seat.isTurn && (
                <mesh geometry={TURN_CONE} position={[0, 0.11, 0]} rotation={[Math.PI, 0, 0]}>
                  <meshBasicMaterial color="#ffd24a" />
                </mesh>
              )}
            </group>
          );
        })}
        {tableCards.trick.map((play) => {
          const [x, z] = toward(frame, play.seat, 0.2);
          return (
            <group key={play.card.id} position={[x, standing(TRICK_CARD / CARD_ASPECT), z]} rotation={[LEAN, 0, 0]}>
              <CardFace card={play.card} width={TRICK_CARD} />
            </group>
          );
        })}
        {melds.map((row) => {
          const add = tapIn(`meld-${row.index}`);
          return (
            <group
              key={row.index}
              userData={{ onActivate: add && (() => tell(add)), zone: `meld-${row.index}` }}
              onClick={
                add &&
                ((event) => {
                  event.stopPropagation();
                  if (zoneClick(event) && wasLetGo(event.nativeEvent)) tell(add, sourceOf(event));
                })
              }
            >
              {row.cards.map(({ card, x, z }) => (
                <group key={card.id} position={[x, standing(MELD_CARD / CARD_ASPECT), z]} rotation={[LEAN, 0, 0]}>
                  <CardFace card={card} width={MELD_CARD} />
                </group>
              ))}
            </group>
          );
        })}
        {!!tableCards.kittyCount && (
          // Beyond the kitty, where nothing in front of it covers the words.
          <Label lines={[`Kitty: ${tableCards.kittyCount} cards`]} box={[0.3 * uiScale, 0.045 * uiScale]} position={[0, TABLE_HEIGHT + 0.03, -reach - 0.1]} rotation={[TOKEN_LEAN, 0, 0]} />
        )}
        {result && (
          <Label
            lines={["GAME OVER", ...wrap(result.headline, 40), ...result.lines.flatMap((line) => wrap(line, 56))]}
            box={[1.1 * uiScale, 0.5 * uiScale]}
            position={[0, 1.55, -reach]}
          />
        )}
      </group>
    </FrameContext.Provider>
  );
}
