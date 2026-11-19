/**
 * The player's body: owns the desktop camera and the XR origin, and moves them
 * from keyboard, mouse, gamepad or VR controllers. The maths is in motion.ts;
 * what is solid, what can be stood on and where the water is come from world/ground.ts.
 *
 * One rig pose drives both views. Outside VR the camera sits on the rig; in VR
 * the rig is the <XROrigin> and the headset moves inside it, so everything that
 * must land the *head* somewhere (collision, teleport, a seat) goes through
 * headPose() / rigForHead().
 *
 * For the table interface: the reticle (F, Enter, gamepad A, a click while the
 * mouse is captured) presses the nearest mesh under the screen centre that has
 * userData.onActivate, else an R3F onClick; see activate.ts.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState, XROrigin } from "@react-three/xr";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BoxGeometry,
  CircleGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  type ArrayCamera,
  type Camera,
  type Object3D,
} from "three";
import type { Pose } from "../../../shared/protocol";
import { bodyYaw, poseToSend, type Tracked } from "../avatar/pose";
import { local } from "../state/local";
import { useActiveTableId, useTableDescription } from "../state/table";
import { makeTextTexture, releaseTexture, textAspect } from "../ui/text";
import { ground, STEP_UP } from "../world/ground";
import { EYE_HEIGHT_SEATED, EYE_HEIGHT_STANDING, spawn } from "../world/layout";
import { activateAt, isInteractiveAt } from "./activate";
import { cue } from "./feedback";
import { aimSpace, ControllerHints, handSpace, Hands, noRaycast } from "./Hands";
import { attachDesktop, desk, pollGamepad } from "./input";
import {
  aimStep,
  ARC_GRAVITY,
  ARC_SPEED,
  arcFlightTime,
  blockedAt,
  deadZone,
  DESK_GAIT,
  flick,
  headPose,
  makeAim,
  makeBody,
  moveBody,
  nearestWalkable,
  rigForHead,
  runLatch,
  smoothTurn,
  snapTurn,
  standing,
  standUpPose,
  stickAim,
  teleportTarget,
  VR_GAIT,
  type BodyInput,
  type Refused,
  type Walkable,
} from "./motion";

export { ControllerHints } from "./Hands";

export const CONTROLS_HELP: { device: string; action: string; input: string }[] = [
  { device: "Keyboard", action: "Walk", input: "W A S D, or the arrow keys" },
  { device: "Keyboard", action: "Run", input: "Hold Shift" },
  { device: "Keyboard", action: "Jump (onto and over low things)", input: "Space" },
  { device: "Keyboard", action: "Turn", input: "Q / E (snap), or move the captured mouse" },
  { device: "Keyboard", action: "Teleport", input: "Hold T to aim at the floor, let go to go; Esc cancels" },
  { device: "Keyboard", action: "Press what the centre ring points at", input: "F or Enter" },
  { device: "Keyboard", action: "Recentre the view (re-align to your seat)", input: "R" },
  { device: "Keyboard", action: "Play a gesture: wave, clap, laugh and more", input: "G opens the gestures, then 1 to 7; G or Esc closes them" },
  { device: "Keyboard", action: "Use the table panel (Menu > Settings > Text table panel; shown while a gamepad is connected)", input: "Tab to a button, Enter or Space to press" },
  { device: "Mouse", action: "Press in-world buttons", input: "Left click on them" },
  { device: "Mouse", action: "Carry a card", input: "Press on it, drag, and let go where it should go" },
  { device: "Mouse", action: "Look around", input: "Click empty scene to capture the mouse, Esc to release" },
  { device: "Mouse", action: "Press what the centre ring points at", input: "Left click while the mouse is captured" },
  { device: "Mouse", action: "Teleport", input: "Hold the right button to aim at the floor, let go to go" },
  { device: "Gamepad", action: "Walk", input: "Left stick" },
  { device: "Gamepad", action: "Run", input: "Click the left stick while walking; it lasts until the stick is back at rest" },
  { device: "Gamepad", action: "Turn and look up / down", input: "Right stick (snap or smooth turn per settings)" },
  { device: "Gamepad", action: "Jump", input: "X (left button)" },
  { device: "Gamepad", action: "Teleport", input: "Hold the left trigger to aim, let go to go" },
  { device: "Gamepad", action: "Confirm: press the focused button, else what the centre ring points at", input: "A (bottom button)" },
  { device: "Gamepad", action: "Cancel: drop focus, clear picked cards, stop aiming", input: "B (right button)" },
  { device: "Gamepad", action: "Step through your cards and the table's buttons", input: "Left / right bumper" },
  { device: "Gamepad", action: "Open or close the menu", input: "Start" },
  { device: "VR controllers", action: "Take hold of the card, pile top or token a hand is touching", input: "Grip, either hand; it stays in that hand until you let go" },
  { device: "VR controllers", action: "Place what a hand holds", input: "Let go of the grip over a drop zone; anywhere else puts it back" },
  { device: "VR controllers", action: "Press what a hand's ray points at", input: "Trigger, either hand" },
  { device: "VR controllers", action: "Carry a card from a distance", input: "Hold the trigger on it; let go to place it or put it back" },
  { device: "VR controllers", action: "Walk (movement mode: Walk and teleport)", input: "Off-hand stick (the left one unless you swapped hands)" },
  { device: "VR controllers", action: "Run", input: "Click the walking stick while walking; it lasts until the stick is back at rest" },
  { device: "VR controllers", action: "Turn", input: "Main-hand stick left / right (snap or smooth per settings)" },
  { device: "VR controllers", action: "Teleport", input: "Main-hand stick forward to aim from that hand, let go to go" },
  { device: "VR controllers", action: "Teleport (movement mode: Teleport only)", input: "Either stick forward to aim from that hand, let go to go" },
  { device: "VR controllers", action: "Jump", input: "A (right controller; X on the left controller when the main hand is left)" },
  { device: "VR controllers", action: "Cancel: stop aiming, put back whatever either hand carries", input: "B (right controller)" },
  { device: "VR controllers", action: "Open or close the VR menu (comfort settings, main hand, music, theme, leave, exit VR)", input: "X (left controller; A when the main hand is left), or point at the Menu button beside you" },
  { device: "VR controllers", action: "Show or hide the hints by your left hand", input: "Y (left controller)" },
  { device: "VR controllers", action: "Change your look, or play a gesture", input: "VR menu: Your look, Gestures; or the Your look plaque by the foyer mirror" },
  { device: "VR controllers", action: "Seated at a table: turn only (no walking, running, jumping or teleporting)", input: "Main-hand stick left / right" },
  { device: "VR controllers", action: "Recentre the seated view", input: "Click either stick" },
  { device: "VR controllers", action: "Swap hands", input: "VR menu or Settings: main hand" },
  { device: "VR hands", action: "Point and press buttons and chairs (no walking)", input: "Point, pinch to press" },
  { device: "VR hands", action: "Open or close the VR menu", input: "Point at the Menu button beside you and pinch" },
];

/**
 * When in each frame the rig moves (an R3F useFrame priority; lower runs first). After @react-three/xr has read the
 * controllers (-1000) and placed the tracked spaces inside the origin (-100), and before its pointers read where each
 * hand is in the world (-50, from the stored matrices of the hand's parents, origin included): a card held while the
 * rig turns or moves is then placed from this frame's hand, not a frame behind it (in an emulated headset a snap turn
 * left a held card 0.19 m off the hand for a frame).
 */
const RIG_PRIORITY = -60;

/** Radians of look per pixel of mouse travel. */
const MOUSE_LOOK = 0.0025;
const PITCH_LIMIT = 1.4;
/** Seated on desktop, start looking down a little at the table top. */
const SEATED_PITCH = -0.35;
const ARC_POINTS = 24;
const VALID = "#3ddc84";
const INVALID = "#ff5a5a";
const CENTRE = new Vector2(0, 0);
/** The teleport blink: seconds to black and seconds back. The move happens in the dark, so the world is never seen to slide. */
const BLINK_OUT = 0.08;
const BLINK_IN = 0.12;
/** How long the landing ring stays at the arrival point. */
const ARRIVE_TIME = 0.4;

/** Whether a walker could stand at (x, z) on ground level: where a seat is left, a test puts the player, or a trapped body is freed to. */
const free: Walkable = (x, z) => standing(ground, x, z) !== null;

/** The teleport arc, its landing marker (a ring when allowed, a cross and a word when not), the reticle, the comfort vignette and the blink. */
function makeProps() {
  const flat = new MeshBasicMaterial({ color: VALID });
  const refused = new MeshBasicMaterial({ color: INVALID });
  // A row of beads, one draw call: a WebGL line is a single pixel wide, which is too faint in a headset.
  const arcMaterial = new MeshBasicMaterial({ color: VALID });
  const arcGeometry = new SphereGeometry(0.025, 8, 6);
  const arc = new InstancedMesh(arcGeometry, arcMaterial, ARC_POINTS);
  // The beads are moved every frame, so its bounds are never right.
  arc.frustumCulled = false;

  const ringGeometry = new RingGeometry(0.22, 0.3, 32).rotateX(-Math.PI / 2);
  const barGeometry = new BoxGeometry(0.7, 0.02, 0.09);
  const ring = new Mesh(ringGeometry, flat);
  const cross = new Group();
  cross.add(new Mesh(barGeometry, refused), new Mesh(barGeometry, refused));
  cross.children[0].rotation.y = Math.PI / 4;
  cross.children[1].rotation.y = -Math.PI / 4;
  const marker = new Group();
  marker.add(ring, cross);

  // Why a landing point is refused, in words: drawn over everything so a wall in between does not hide it.
  const say = (text: Refused) => makeTextTexture([text], { fontPx: 72, padding: 18 });
  const words: Record<Refused, ReturnType<typeof makeTextTexture>> = { "Too far": say("Too far"), Blocked: say("Blocked"), "Too deep": say("Too deep") };
  const wordGeometry = new PlaneGeometry(1, 1);
  // "transparent" only to be drawn after the water and the window glass, which would otherwise wash over the word.
  const wordMaterial = new MeshBasicMaterial({ map: words.Blocked, depthTest: false, transparent: true });
  const word = new Mesh(wordGeometry, wordMaterial);
  word.renderOrder = 997;

  // Drawn over everything, with a dark rim so it shows on light and dark surfaces alike.
  const reticleGeometry = new RingGeometry(0.003, 0.0045, 24);
  const rimGeometry = new RingGeometry(0.0045, 0.006, 24);
  const reticleMaterial = new MeshBasicMaterial({ color: "#ffffff", depthTest: false });
  const rimMaterial = new MeshBasicMaterial({ color: "#000000", depthTest: false });
  const reticle = new Group();
  reticle.add(new Mesh(reticleGeometry, reticleMaterial), new Mesh(rimGeometry, rimMaterial));
  reticle.renderOrder = 999;

  // A black ring 0.3 m in front of the eyes that leaves about 55 degrees clear.
  const vignetteGeometry = new RingGeometry(0.16, 1.5, 32);
  const vignetteMaterial = new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthTest: false });
  const vignette = new Mesh(vignetteGeometry, vignetteMaterial);
  vignette.position.z = -0.3;
  vignette.renderOrder = 998;
  // The teleport blink: the same distance, covering the whole view.
  const blinkGeometry = new CircleGeometry(1.5, 32);
  const blinkMaterial = new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthTest: false });
  const blink = new Mesh(blinkGeometry, blinkMaterial);
  blink.position.z = -0.29;
  blink.renderOrder = 1000;
  // Both ride on the eyes: in VR as a child of the XR camera, outside VR placed on the camera each frame.
  const face = new Group();
  face.add(vignette, blink);

  const scene = new Group();
  scene.add(arc, marker, word, reticle);
  for (const group of [scene, face]) group.traverse((object) => (object.raycast = noRaycast));
  vignette.frustumCulled = blink.frustumCulled = false;
  arc.visible = marker.visible = word.visible = reticle.visible = vignette.visible = blink.visible = false;

  const dispose = () => {
    face.removeFromParent();
    arc.dispose();
    for (const item of [flat, refused, arcMaterial, arcGeometry, ringGeometry, barGeometry, wordGeometry, wordMaterial, reticleGeometry, rimGeometry]) item.dispose();
    for (const item of [reticleMaterial, rimMaterial, vignetteGeometry, vignetteMaterial, blinkGeometry, blinkMaterial]) item.dispose();
    for (const texture of Object.values(words)) releaseTexture(texture);
  };
  return { scene, arc, arcMaterial, marker, ring, cross, word, wordMaterial, words, reticle, face, vignette, vignetteMaterial, blink, blinkMaterial, dispose };
}

const makeRig = () => ({
  /** The rig's pose: the XR origin, and outside VR the camera's feet. */
  rig: { ...spawn } as Pose,
  /** The head's pose inside the rig; zero outside VR. */
  head: { x: 0, z: 0, ry: 0 } as Pose,
  /** Height of the rig: the body's feet, or in a VR seat whatever puts the eyes at seated height. */
  y: 0,
  /** The body under the head: where it stands and how it is moving. It rests while seated. */
  body: makeBody(spawn.x, spawn.z, standing(ground, spawn.x, spawn.z) ?? 0),
  /** Eye height above the feet as it was before the body last began to float: it sets how deep the body floats. */
  eye: EYE_HEIGHT_STANDING,
  pitch: 0,
  seat: null as Pose | null,
  presenting: false,
  reseat: false,
  input: { forward: 0, strafe: 0, turn: 0, run: false, ry: 0, jump: false, mayJump: false } as BodyInput & { turn: number },
  turnStick: { armed: true },
  padStick: { armed: true },
  /** Each VR stick: held forward to aim a teleport. */
  pushed: { left: false, right: false },
  /** Which controls ask to aim this frame, and who holds the aim. */
  wants: { left: false, right: false, view: false },
  aim: makeAim(),
  aimValid: false,
  aimX: 0,
  aimY: 0,
  aimZ: 0,
  /** A confirmed teleport, carried out when the blink is fully dark. `source` is the controller that aimed. */
  going: null as { x: number; y: number; z: number; source: unknown } | null,
  /** How dark the blink is, 0 to 1. */
  dark: 0,
  /** Seconds the landing ring still shows at the arrival point. */
  arrived: 0,
  /** Running since a click of the VR walking stick. */
  run: false,
  /** Which VR controllers were there last frame: 1 for the left, 2 for the right. */
  controllers: 0,
  /** The controller whose button started the jump in progress, for the landing buzz. */
  jumper: undefined as unknown,
  moveClick: false,
  stickClick: false,
  hintsButton: false,
  menuButton: false,
  cancelButton: false,
  sinceReport: 0,
  /** In VR, the facing my body is sent with: it follows the head only once the head turns well away (avatar/pose.ts). */
  facing: null as number | null,
  fade: 0,
  /** The last frame's time step, seconds: tests read speeds per step of the game, not per tick of the wall clock. */
  dt: 0,
});
type Rig = ReturnType<typeof makeRig>;

/** Puts the head at `head`, standing still with its feet at `y` (by default where a walker would stand there). */
function place(s: Rig, head: Pose, y = standing(ground, head.x, head.z) ?? 0): void {
  s.rig = rigForHead(head, s.head);
  // Whatever the body was doing is over. A jump control held through the move is not a new press.
  Object.assign(s.body, makeBody(head.x, head.z, y), { jumpHeld: true });
  s.y = y;
}

const origin = new Vector3();
const handAt = new Vector3();

/** In VR: the head's pitch and both hands in the world, from the camera and the hand spaces inside the origin. */
function tracked(s: Rig, camera: Camera, headYaw: number): Tracked {
  const q = camera.quaternion;
  const hand = (space: Object3D | null) => {
    // A hand that is not tracked now, or that went away (its space has no parent any more), is not sent.
    if (!space?.visible || !space.parent) return null;
    handAt.setFromMatrixPosition(space.matrix);
    const { x, z } = headPose(s.rig, { x: handAt.x, z: handAt.z, ry: 0 });
    return { x, y: s.y + handAt.y, z };
  };
  return { headYaw, pitch: Math.asin(Math.max(-1, Math.min(1, 2 * (q.w * q.x - q.y * q.z)))), hands: [hand(handSpace.left), hand(handSpace.right)] };
}
const direction = new Vector3();
const bead = new Matrix4();

/** Throws the teleport arc from `source` (which looks down its -z), draws it, and records where it lands and whether it may. */
function aim(s: Rig, props: ReturnType<typeof makeProps>, source: Object3D, lower: number, head: Pose, camera: Camera): void {
  source.updateWorldMatrix(true, false);
  origin.setFromMatrixPosition(source.matrixWorld);
  origin.y -= lower;
  direction.set(0, 0, -1).transformDirection(source.matrixWorld);
  const vy = direction.y * ARC_SPEED;
  const landing = (time: number) => teleportTarget(ground, head, origin.x + direction.x * ARC_SPEED * time, origin.z + direction.z * ARC_SPEED * time, s.eye);
  /** The surface the arc is seen to end on: where the feet would be, or the water over it. */
  const top = (target: ReturnType<typeof landing>): number => Math.max(target.y, target.water ?? -Infinity);
  // That surface may be lower or higher than where the feet are now, which moves the end of the arc.
  // shortcut: two passes, which is exact wherever the floor is level around the end; where its height changes right at the
  // landing point (a pool edge, a kerb) the end can sit a few centimetres off the arc. Repeat until it settles if that is ever seen.
  const time = arcFlightTime(origin.y - top(landing(arcFlightTime(origin.y - s.body.y, vy))), vy);
  const target = landing(time);
  s.aimValid = target.why === null;
  s.aimX = target.x;
  s.aimY = target.y;
  s.aimZ = target.z;

  for (let i = 0; i < ARC_POINTS; i++) {
    const t = (time * (i + 1)) / (ARC_POINTS + 1);
    bead.setPosition(
      origin.x + direction.x * ARC_SPEED * t,
      origin.y + vy * t - (ARC_GRAVITY / 2) * t * t,
      origin.z + direction.z * ARC_SPEED * t,
    );
    props.arc.setMatrixAt(i, bead);
  }
  props.arc.instanceMatrix.needsUpdate = true;
  props.arcMaterial.color.set(s.aimValid ? VALID : INVALID);
  props.marker.position.set(target.x, top(target) + 0.03, target.z);
  props.ring.visible = s.aimValid;
  props.cross.visible = !s.aimValid;
  props.word.visible = !s.aimValid;
  if (target.why) {
    // Sized by how far away it is, so the word is the same easy size to read at two metres and at eight.
    const height = Math.max(0.12, Math.hypot(target.x - head.x, target.z - head.z) * 0.06);
    const texture = props.words[target.why];
    props.wordMaterial.map = texture;
    props.word.scale.set(textAspect(texture) * height, height, 1);
    props.word.position.set(target.x, top(target) + 0.3 + height / 2, target.z);
    // The world turn: in VR the camera sits inside the rig, which is itself turned.
    camera.getWorldQuaternion(props.word.quaternion);
  }
}

const held = (code: string, other?: string): number => (desk.keys.has(code) || (other !== undefined && desk.keys.has(other)) ? 1 : 0);
const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

/** `children` are drawn inside the XR origin, so they travel with the player (the in-VR menu). */
export function Player({ children }: { children?: ReactNode }) {
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const setEvents = useThree((state) => state.setEvents);
  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");
  const originRef = useRef<Group>(null);
  const [hints, setHints] = useState(true);
  const s = useRef<Rig>(null!);
  s.current ??= makeRig();
  const props = useMemo(makeProps, []);
  useEffect(() => props.dispose, [props]);

  // The gamepad bumpers step through my selectable cards, then the table's enabled buttons, in the DOM panel.
  const description = useTableDescription(useActiveTableId());
  useEffect(() => {
    desk.focusIds = description
      ? [
          ...description.hand.filter((card) => card.selectable).map((card) => `card-${card.card.id}`),
          ...description.buttons.filter((button) => !button.disabled).map((button) => button.id),
        ]
      : [];
  }, [description]);

  useEffect(() => {
    desk.three = get;
    desk.rig = () => {
      const rig = s.current;
      const { body } = rig;
      const sitting = rig.seat !== null;
      const head = headPose(rig.rig, rig.head);
      return {
        x: head.x,
        z: head.z,
        ry: head.ry,
        y: sitting ? 0 : body.y,
        vy: sitting ? 0 : body.vy,
        grounded: sitting || body.grounded,
        running: !sitting && body.running,
        floating: !sitting && body.floating,
        aiming: rig.aim.source !== null,
        aimValid: rig.aimValid,
        aimX: rig.aimX,
        aimY: rig.aimY,
        aimZ: rig.aimZ,
        dt: rig.dt,
      };
    };
    return () => {
      desk.rig = null;
    };
  }, [get]);

  useEffect(
    () =>
      attachDesktop(gl.domElement, {
        mayCapture: () => {
          const { scene, camera, pointer } = get();
          return !gl.xr.isPresenting && !isInteractiveAt(scene, camera, pointer);
        },
        // A captured mouse reports a frozen position, so R3F would keep clicking one stale spot; the reticle takes over.
        onCapture: (captured) => setEvents({ enabled: !captured }),
      }),
    [gl, get, setEvents],
  );

  useFrame((state, delta) => {
    const rig = s.current;
    const { body, input, wants } = rig;
    const dt = Math.min(delta, 0.1);
    rig.dt = dt;
    const camera: Camera = state.camera;
    // For a frame or two around a session change the active camera is not yet the XR one; its transform is not a head pose.
    const presenting = state.gl.xr.isPresenting && camera === state.gl.xr.getCamera();
    const { comfort, seated, vrMenu } = local.getState();

    if (presenting) {
      // The XR camera is a child of the origin, so its transform is in the rig. But until three.js draws, it stands at the
      // first view, the left eye: the head is midway between the views (each one this frame's, three.js WebXRManager).
      const q = camera.quaternion;
      const views = (camera as ArrayCamera).cameras ?? [];
      const [a, b] = views.length ? [views[0].position, views[views.length - 1].position] : [camera.position, camera.position];
      rig.head.x = (a.x + b.x) / 2;
      rig.head.z = (a.z + b.z) / 2;
      rig.head.ry = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
    } else {
      rig.head.x = rig.head.z = rig.head.ry = 0;
    }

    const changed = seated !== rig.seat || presenting !== rig.presenting;
    if (changed) {
      // Sitting down, standing up (even when someone else unseats me) and a session starting all move the view at once:
      // in a headset that happens in the dark, and the view fades back in over BLINK_IN.
      if (presenting) rig.dark = 1;
      if (!seated && rig.seat) {
        // A step back from the seat, still facing where the head faces: the world is not swung round.
        place(rig, { ...standUpPose(rig.seat, free, spawn), ry: headPose(rig.rig, rig.head).ry });
        rig.pitch = 0;
      }
      if (presenting && desk.locked) document.exitPointerLock();
      rig.seat = seated;
      rig.presenting = presenting;
      rig.reseat = seated !== null;
    }
    const sitting = rig.seat !== null;

    // ---- what the controls ask for ----
    let snap = desk.snap;
    desk.snap = 0;
    if (presenting) {
      const hands = { left, right };
      const main = comfort.dominantHand;
      const off = main === "right" ? "left" : "right";
      const move = hands[off]?.gamepad["xr-standard-thumbstick"];
      const turn = hands[main]?.gamepad["xr-standard-thumbstick"];
      const moveX = move?.xAxis ?? 0;
      const moveY = move?.yAxis ?? 0;
      const turnX = turn?.xAxis ?? 0;
      const moveClick = move?.state === "pressed";
      const turnClick = turn?.state === "pressed";
      // Each stick has one job at a time, and neither ever does the other's.
      // The off-hand stick walks, and a click of it runs; in teleport-only mode it aims instead.
      const walks = comfort.locomotion === "smooth";
      input.forward = walks ? -deadZone(moveY) : 0;
      input.strafe = walks ? deadZone(moveX) : 0;
      // A controller that goes away (asleep, out of battery) takes a run with it, whichever hand it was.
      const present = (left ? 1 : 0) | (right ? 2 : 0);
      if (rig.controllers & ~present) rig.run = false;
      rig.controllers = present;
      rig.run = runLatch(rig.run, moveClick && !rig.moveClick, input.forward !== 0 || input.strafe !== 0);
      input.run = rig.run;
      rig.pushed[off] = !walks && stickAim(rig.pushed[off], moveX, moveY);
      // The main-hand stick turns left and right, and pushed forward it aims; while it aims it does not turn.
      rig.pushed[main] = stickAim(rig.pushed[main], turnX, turn?.yAxis ?? 0);
      const turnBy = rig.pushed[main] ? 0 : turnX;
      input.turn = comfort.snapTurn ? 0 : deadZone(turnBy);
      if (comfort.snapTurn) snap += flick(turnBy, rig.turnStick);
      wants.left = rig.pushed.left;
      wants.right = rig.pushed.right;
      wants.view = false;
      // Jump is the main hand's lower face button, so a left-handed player's thumb is not taken off the walking stick;
      // the menu is the other hand's. B and Y stay where they are.
      input.jump = (main === "right" ? right?.gamepad["a-button"] : left?.gamepad["x-button"])?.state === "pressed";

      if (sitting && (moveClick || turnClick) && !rig.stickClick) desk.recentre = true;
      rig.moveClick = moveClick;
      rig.stickClick = moveClick || turnClick;
      const cancelButton = right?.gamepad["b-button"]?.state === "pressed";
      // Stops an aim and puts back what either hand carries; picked and staged cards stay (unlike gamepad B).
      if (cancelButton && !rig.cancelButton) {
        desk.cancel = true;
        desk.cancelCount += 1;
      }
      rig.cancelButton = cancelButton;
      const hintsButton = left?.gamepad["y-button"]?.state === "pressed";
      if (hintsButton && !rig.hintsButton) setHints((shown) => !shown);
      rig.hintsButton = hintsButton;
      const menuButton = (main === "right" ? left?.gamepad["x-button"] : right?.gamepad["a-button"])?.state === "pressed";
      if (menuButton && !rig.menuButton) local.set({ vrMenu: !local.getState().vrMenu });
      rig.menuButton = menuButton;
    } else {
      pollGamepad();
      input.forward = clamp(held("KeyW", "ArrowUp") - held("KeyS", "ArrowDown") - desk.padY, 1);
      input.strafe = clamp(held("KeyD", "ArrowRight") - held("KeyA", "ArrowLeft") + desk.padX, 1);
      input.turn = comfort.snapTurn ? 0 : deadZone(desk.padTurn);
      input.run = held("ShiftLeft", "ShiftRight") === 1 || desk.padRun;
      input.jump = desk.keys.has("Space") || desk.padJump;
      if (comfort.snapTurn) snap += flick(desk.padTurn, rig.padStick);
      // Outside VR the head is the rig, and makeRig / rigForHead always hand back a fresh pose, so this is safe to edit.
      rig.rig.ry -= desk.lookX * MOUSE_LOOK;
      rig.pitch = clamp(rig.pitch - desk.lookY * MOUSE_LOOK - desk.padLook * 1.5 * dt, PITCH_LIMIT);
      wants.left = wants.right = rig.pushed.left = rig.pushed.right = rig.run = false;
      wants.view = desk.aim || desk.keys.has("KeyT") || desk.padAim;
    }
    desk.lookX = desk.lookY = 0;

    if (desk.recentre) {
      desk.recentre = false;
      rig.reseat = rig.seat !== null;
      rig.pitch = 0;
    }
    // A headset has no pose for its first frames; wait for one before lining the seat up with it.
    if (rig.reseat && rig.seat && (!presenting || camera.position.y !== 0)) {
      rig.reseat = false;
      rig.rig = rigForHead(rig.seat, rig.head);
      rig.pitch = SEATED_PITCH;
      // In VR the eyes go to seated height whether the person is really sitting or standing.
      rig.y = presenting ? EYE_HEIGHT_SEATED - camera.position.y : 0;
    }

    if (desk.warp) {
      const y = standing(ground, desk.warp.x, desk.warp.z);
      if (!sitting && y !== null) place(rig, desk.warp, y);
      desk.warp = null;
    }

    // ---- a confirmed teleport: dark, move, light ----
    if (sitting) rig.going = null;
    rig.dark = rig.going ? Math.min(1, rig.dark + dt / BLINK_OUT) : Math.max(0, rig.dark - dt / BLINK_IN);
    if (rig.going && rig.dark >= 1) {
      const { x, y, z, source } = rig.going;
      place(rig, { x, z, ry: headPose(rig.rig, rig.head).ry }, y);
      cue("land", source);
      rig.arrived = ARRIVE_TIME;
      rig.going = null;
    } else if (!rig.going) rig.arrived = Math.max(0, rig.arrived - dt);

    // ---- turning ----
    let head = headPose(rig.rig, rig.head);
    if (snap || input.turn) {
      head = smoothTurn(head, input.turn, dt);
      if (snap) head = snapTurn(head, snap > 0 ? 1 : -1, comfort.snapDegrees * Math.abs(snap));
      rig.rig = rigForHead(head, rig.head);
    }

    // ---- the teleport aim ----
    const holder = rig.aim.source;
    const aimer = holder === "left" ? left : holder === "right" ? right : undefined;
    // B, Esc, losing the window, sitting down, a session starting or ending, or the aiming controller going away: no teleport.
    const dropped = desk.cancel || changed || sitting || (holder !== null && holder !== "view" && !aimer);
    const letGo = aimStep(rig.aim, wants, !sitting && !rig.going && (body.grounded || body.floating), dropped, dt);
    if (desk.cancel) {
      desk.cancel = false;
      body.jumpEarly = 0;
    }
    if (letGo) {
      if (rig.aimValid) rig.going = { x: rig.aimX, y: rig.aimY, z: rig.aimZ, source: aimer?.inputSource };
      else cue("refuse", aimer?.inputSource);
    }
    const aiming = rig.aim.source !== null;

    // ---- the body ----
    let moved = false;
    if (!sitting) {
      // A real step in a headset cannot put the head inside something: held back at walls, edges and anything too high,
      // it slides along what it meets, as the stick does. body.x / z is still last frame's free spot here.
      const clear = (x: number, z: number): boolean => !blockedAt(ground, body, x, z, rig.eye) && !ground.wallBetween(body.x, body.z, x, z);
      if (presenting && !clear(head.x, head.z) && clear(body.x, body.z)) {
        const x = clear(head.x, body.z) ? head.x : body.x;
        const z = clear(x, head.z) ? head.z : body.z;
        head = { x, z, ry: head.ry };
        rig.rig = rigForHead(head, rig.head);
      }
      body.x = head.x;
      body.z = head.z;
      // Never trapped. In VR a body that was already stuck (a session begun with the head inside something) waits for the stick to be pushed.
      if (!presenting && body.grounded && ground.blocked(body.x, body.z, body.y + STEP_UP)) {
        const out = nearestWalkable(body.x, body.z, free, spawn);
        head = { x: out.x, z: out.z, ry: head.ry };
        place(rig, head);
      }
      // Held still while floating, or bobbing the head would move the whole view up and down.
      if (!body.floating) rig.eye = presenting ? Math.min(2, Math.max(1, camera.position.y)) : EYE_HEIGHT_STANDING;
      input.ry = head.ry;
      input.mayJump = comfort.jump && !aiming && !vrMenu;
      const wasJumping = body.jumped;
      const event = moveBody(body, input, dt, ground, presenting ? VR_GAIT : DESK_GAIT, rig.eye);
      moved = body.x !== head.x || body.z !== head.z;
      if (moved) {
        head = { x: body.x, z: body.z, ry: head.ry };
        rig.rig = rigForHead(head, rig.head);
      }
      rig.y = body.y;
      // The landing is felt in the hand whose button jumped.
      if (body.jumped && !wasJumping) rig.jumper = presenting ? (comfort.dominantHand === "left" ? left : right)?.inputSource : undefined;
      if (event) {
        cue(event, rig.jumper);
        rig.jumper = undefined;
      }
    }
    const airborne = !sitting && !body.grounded && !body.floating;

    const xrOrigin = originRef.current;
    if (xrOrigin) {
      xrOrigin.position.set(rig.rig.x, rig.y, rig.rig.z);
      xrOrigin.rotation.y = rig.rig.ry;
      // The pointers build each hand's world pose from its parents' stored matrices, which three.js otherwise only
      // brings up to date when it draws: without this they would still see where the origin was (RIG_PRIORITY).
      xrOrigin.updateMatrix();
    }
    if (!presenting) {
      camera.position.set(rig.rig.x, rig.y + (sitting ? EYE_HEIGHT_SEATED : EYE_HEIGHT_STANDING), rig.rig.z);
      camera.rotation.set(rig.pitch, rig.rig.ry, 0, "YXZ");
    }

    // Drawn after the rig has moved, so the arc starts at the hand even while walking.
    if (aiming) {
      const hand = rig.aim.source === "view" ? null : aimSpace[rig.aim.source!];
      // Outside VR the arc starts below the eyes, or it would be seen end-on as a dot.
      if (presenting && hand?.visible) aim(rig, props, hand, 0, head, camera);
      else aim(rig, props, camera, presenting ? 0 : 0.3, head, camera);
    } else {
      rig.aimValid = false;
      props.word.visible = false;
    }
    props.arc.visible = aiming;
    // The ring stays at the landing point through the blink and for a moment after arriving.
    props.marker.visible = aiming || rig.going !== null || rig.arrived > 0;

    // Ten times a second, and twice as often in the air so the pose the room is sent is never more than 50 ms old in a jump.
    // shortcut: the room itself still passes on ten poses a second (App's tick, the server's relay), so others see a jump as
    // about seven eased steps, peaking a few centimetres low. Raise both rates if a jump ever looks steppy.
    // In VR the body faces the way the seat does, or follows the head once it turns well away, and the head and hands go too.
    const y = sitting ? 0 : body.y;
    rig.facing = !presenting ? null : sitting ? rig.seat!.ry : bodyYaw(rig.facing, head.ry);
    // Seated, the others draw me in my chair whatever my head does, so my hands are measured from the seat too.
    const feet = sitting ? rig.seat! : head;
    const pose = poseToSend({ x: feet.x, y, z: feet.z }, rig.facing ?? head.ry, presenting ? tracked(rig, camera, head.ry) : undefined);
    desk.pose = pose;
    rig.sinceReport += dt;
    if (rig.sinceReport >= (airborne ? 0.05 : 0.1)) {
      rig.sinceReport = 0;
      const last = local.getState().playerPose;
      // A tracked head and hands move all the time, so in VR every report goes.
      if (presenting || !last || Math.abs(last.x - feet.x) + Math.abs(last.z - feet.z) + Math.abs((last.y ?? 0) - y) + Math.abs(Math.sin((last.ry - head.ry) / 2)) > 0.002) {
        local.set({ playerPose: pose });
      }
    }

    if (desk.activate) {
      desk.activate = false;
      if (!presenting) {
        camera.updateMatrixWorld();
        activateAt(state.scene, camera, CENTRE);
      }
    }

    const { reticle, face, vignette, vignetteMaterial, blink, blinkMaterial } = props;
    reticle.visible = !presenting && (desk.locked || desk.padActive);
    if (reticle.visible) {
      reticle.quaternion.copy(camera.quaternion);
      reticle.position.set(0, 0, -0.5).applyQuaternion(camera.quaternion).add(camera.position);
    }
    // As a child of the XR camera the shades are placed with this frame's head pose, not last frame's.
    if (presenting) {
      if (face.parent !== camera) {
        camera.add(face);
        face.position.set(0, 0, 0);
        face.quaternion.identity();
      }
    } else {
      if (face.parent !== props.scene) props.scene.add(face);
      face.position.copy(camera.position);
      face.quaternion.copy(camera.quaternion);
    }
    const shade = presenting && comfort.vignette && (input.turn !== 0 || (!sitting && (moved || airborne))) ? 1 : 0;
    rig.fade += (shade - rig.fade) * Math.min(1, dt * 8);
    vignetteMaterial.opacity = rig.fade;
    vignette.visible = rig.fade > 0.01;
    blinkMaterial.opacity = rig.dark;
    blink.visible = rig.dark > 0;
  }, RIG_PRIORITY);

  return (
    <>
      <XROrigin ref={originRef}>
        <Hands />
        {hints && <ControllerHints />}
        {children}
      </XROrigin>
      <primitive object={props.scene} />
    </>
  );
}
