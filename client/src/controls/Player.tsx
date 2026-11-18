/**
 * The player's body: owns the desktop camera and the XR origin, and moves them
 * from keyboard, mouse, gamepad or VR controllers. All the maths is in motion.ts.
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
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
} from "three";
import type { Pose } from "../../../shared/protocol";
import { local } from "../state/local";
import { useActiveTableId, useTableDescription } from "../state/table";
import { EYE_HEIGHT_SEATED, EYE_HEIGHT_STANDING, floorHeight, isWalkable, spawn } from "../world/layout";
import { activateAt, isInteractiveAt } from "./activate";
import { aimSpace, ControllerHints, Hands, noRaycast } from "./Hands";
import { attachDesktop, desk, pollGamepad } from "./input";
import {
  ARC_GRAVITY,
  ARC_SPEED,
  arcFlightTime,
  deadZone,
  flick,
  FLICK_OFF,
  FLICK_ON,
  headPose,
  nearestWalkable,
  rigForHead,
  snapTurn,
  standUpPose,
  step,
  teleportTarget,
  type MoveInput,
} from "./motion";

export { ControllerHints } from "./Hands";

export const CONTROLS_HELP: { device: string; action: string; input: string }[] = [
  { device: "Keyboard", action: "Walk", input: "W A S D, or Up / Down arrows" },
  { device: "Keyboard", action: "Walk faster", input: "Hold Shift" },
  { device: "Keyboard", action: "Turn", input: "Left / Right arrows (smooth), Q / E (snap)" },
  { device: "Keyboard", action: "Teleport", input: "Hold T to aim at the floor, let go to jump" },
  { device: "Keyboard", action: "Press what the centre ring points at", input: "F or Enter" },
  { device: "Keyboard", action: "Recentre the view (re-align to your seat)", input: "R" },
  { device: "Keyboard", action: "Use the table panel", input: "Tab to a button, Enter or Space to press" },
  { device: "Mouse", action: "Press in-world buttons and cards", input: "Left click on them" },
  { device: "Mouse", action: "Look around", input: "Click empty scene to capture the mouse, Esc to release" },
  { device: "Mouse", action: "Press what the centre ring points at", input: "Left click while the mouse is captured" },
  { device: "Mouse", action: "Teleport", input: "Hold right button to aim at the floor, let go to jump" },
  { device: "Gamepad", action: "Walk", input: "Left stick" },
  { device: "Gamepad", action: "Turn and look up / down", input: "Right stick (snap or smooth turn per settings)" },
  { device: "Gamepad", action: "Confirm: press the focused button, else what the centre ring points at", input: "A (bottom button)" },
  { device: "Gamepad", action: "Cancel: drop focus, clear picked cards, stop aiming", input: "B (right button)" },
  { device: "Gamepad", action: "Step through your cards and the table's buttons", input: "Left / right bumper" },
  { device: "Gamepad", action: "Open or close settings", input: "Start" },
  { device: "VR controllers", action: "Point at, press and pick", input: "Aim the ray, pull the trigger" },
  { device: "VR controllers", action: "Teleport (default)", input: "Off-hand stick forward to aim, let go to jump" },
  { device: "VR controllers", action: "Walk (smooth movement setting)", input: "Off-hand stick" },
  { device: "VR controllers", action: "Turn", input: "Main-hand stick left / right (snap or smooth per settings)" },
  { device: "VR controllers", action: "Recentre the seated view", input: "Click either stick" },
  { device: "VR controllers", action: "Show or hide the hints by your left hand", input: "Y (left controller)" },
  { device: "VR controllers", action: "Open or close the VR menu (comfort settings, music, theme, leave, exit VR)", input: "X (left controller), or point at the Menu button beside you" },
  { device: "VR controllers", action: "Swap hands", input: "Settings: dominant hand" },
  { device: "VR hands", action: "Point and press (no walking; sit at a table from the panel first)", input: "Point, pinch to press" },
  { device: "VR hands", action: "Open or close the VR menu", input: "Point at the Menu button beside you and pinch" },
];

/** Radians of look per pixel of mouse travel. */
const MOUSE_LOOK = 0.0025;
const PITCH_LIMIT = 1.4;
/** Seated on desktop, start looking down a little at the table top. */
const SEATED_PITCH = -0.35;
const ARC_POINTS = 24;
const VALID = "#3ddc84";
const INVALID = "#ff5a5a";
const CENTRE = new Vector2(0, 0);

/** The teleport arc, its landing marker (a ring when allowed, a cross when not), the reticle and the comfort vignette. */
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
  vignette.frustumCulled = false;

  const scene = new Group();
  scene.add(arc, marker, reticle);
  scene.traverse((object) => (object.raycast = noRaycast));
  vignette.raycast = noRaycast;
  arc.visible = marker.visible = reticle.visible = vignette.visible = false;

  const dispose = () => {
    vignette.removeFromParent();
    arc.dispose();
    for (const item of [flat, refused, arcMaterial, arcGeometry, ringGeometry, barGeometry, reticleGeometry, rimGeometry]) item.dispose();
    for (const item of [reticleMaterial, rimMaterial, vignetteGeometry, vignetteMaterial]) item.dispose();
  };
  return { scene, arc, arcMaterial, marker, ring, cross, reticle, vignette, vignetteMaterial, dispose };
}

const makeRig = () => ({
  /** The rig's pose: the XR origin, and outside VR the camera's feet. */
  rig: { ...spawn } as Pose,
  /** The head's pose inside the rig; zero outside VR. */
  head: { x: 0, z: 0, ry: 0 } as Pose,
  /** Height of the rig: the floor under the head, or in a VR seat whatever puts the eyes at seated height. */
  y: 0,
  pitch: 0,
  seat: null as Pose | null,
  presenting: false,
  reseat: false,
  input: { forward: 0, strafe: 0, turn: 0, run: false } as MoveInput,
  turnStick: { armed: true },
  padStick: { armed: true },
  stickAim: false,
  aiming: false,
  aimCancelled: false,
  aimValid: false,
  aimX: 0,
  aimZ: 0,
  stickClick: false,
  hintsButton: false,
  menuButton: false,
  sinceReport: 0,
  fade: 0,
});
type Rig = ReturnType<typeof makeRig>;

/** Puts the head at `head` on the floor there. */
function place(s: Rig, head: Pose): void {
  s.rig = rigForHead(head, s.head);
  s.y = floorHeight(head.x, head.z);
}

const origin = new Vector3();
const direction = new Vector3();
const bead = new Matrix4();

/** Throws the teleport arc from `source` (which looks down its -z), draws it, and records where it lands. */
function aim(s: Rig, props: ReturnType<typeof makeProps>, source: Object3D, lower: number): void {
  source.updateWorldMatrix(true, false);
  origin.setFromMatrixPosition(source.matrixWorld);
  origin.y -= lower;
  direction.set(0, 0, -1).transformDirection(source.matrixWorld);
  const vy = direction.y * ARC_SPEED;
  const time = arcFlightTime(origin.y - s.y, vy);
  const target = teleportTarget(
    headPose(s.rig, s.head),
    origin.x + direction.x * ARC_SPEED * time,
    origin.z + direction.z * ARC_SPEED * time,
    isWalkable,
  );
  s.aimValid = target.valid;
  s.aimX = target.x;
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
  props.arcMaterial.color.set(target.valid ? VALID : INVALID);
  props.marker.position.set(target.x, (target.valid ? floorHeight(target.x, target.z) : s.y) + 0.03, target.z);
  props.ring.visible = target.valid;
  props.cross.visible = !target.valid;
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
    const dt = Math.min(delta, 0.1);
    const camera: Camera = state.camera;
    // For a frame or two around a session change the active camera is not yet the XR one; its transform is not a head pose.
    const presenting = state.gl.xr.isPresenting && camera === state.gl.xr.getCamera();
    const { comfort, seated } = local.getState();
    const input = rig.input;

    if (presenting) {
      // The XR camera is a child of the origin, so its own transform is the head inside the rig.
      const q = camera.quaternion;
      rig.head.x = camera.position.x;
      rig.head.z = camera.position.z;
      rig.head.ry = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
    } else {
      rig.head.x = rig.head.z = rig.head.ry = 0;
    }

    if (seated !== rig.seat || presenting !== rig.presenting) {
      if (!seated && rig.seat) {
        place(rig, standUpPose(rig.seat, isWalkable, spawn));
        rig.pitch = 0;
      }
      if (presenting && desk.locked) document.exitPointerLock();
      rig.seat = seated;
      rig.presenting = presenting;
      rig.reseat = seated !== null;
    }

    let snap = desk.snap;
    desk.snap = 0;
    let wantAim: boolean;
    if (presenting) {
      const offHand = comfort.dominantHand === "right" ? left : right;
      const mainHand = comfort.dominantHand === "right" ? right : left;
      const move = offHand?.gamepad["xr-standard-thumbstick"];
      const turn = mainHand?.gamepad["xr-standard-thumbstick"];
      const moveX = move?.xAxis ?? 0;
      const moveY = move?.yAxis ?? 0;
      const turnX = turn?.xAxis ?? 0;
      if (comfort.locomotion === "smooth") {
        input.forward = -deadZone(moveY);
        input.strafe = deadZone(moveX);
        rig.stickAim = false;
      } else {
        input.forward = input.strafe = 0;
        if (!rig.stickAim) rig.stickAim = -moveY >= FLICK_ON;
        else if (Math.hypot(moveX, moveY) <= FLICK_OFF) rig.stickAim = false;
      }
      input.run = false;
      input.turn = comfort.snapTurn ? 0 : deadZone(turnX);
      if (comfort.snapTurn) snap += flick(turnX, rig.turnStick);
      wantAim = rig.stickAim;

      const click = move?.state === "pressed" || turn?.state === "pressed";
      if (click && !rig.stickClick) desk.recentre = true;
      rig.stickClick = click;
      const hintsButton = left?.gamepad["y-button"]?.state === "pressed";
      if (hintsButton && !rig.hintsButton) setHints((shown) => !shown);
      rig.hintsButton = hintsButton;
      const menuButton = left?.gamepad["x-button"]?.state === "pressed";
      if (menuButton && !rig.menuButton) local.set({ vrMenu: !local.getState().vrMenu });
      rig.menuButton = menuButton;
    } else {
      pollGamepad();
      input.forward = clamp(held("KeyW", "ArrowUp") - held("KeyS", "ArrowDown") - desk.padY, 1);
      input.strafe = clamp(held("KeyD") - held("KeyA") + desk.padX, 1);
      input.turn = clamp(held("ArrowRight") - held("ArrowLeft") + (comfort.snapTurn ? 0 : deadZone(desk.padTurn)), 1);
      input.run = held("ShiftLeft", "ShiftRight") === 1;
      if (comfort.snapTurn) snap += flick(desk.padTurn, rig.padStick);
      // Outside VR the head is the rig, and makeRig / rigForHead always hand back a fresh pose, so this is safe to edit.
      rig.rig.ry -= desk.lookX * MOUSE_LOOK;
      rig.pitch = clamp(rig.pitch - desk.lookY * MOUSE_LOOK - desk.padLook * 1.5 * dt, PITCH_LIMIT);
      wantAim = desk.aim || desk.keys.has("KeyT");
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

    const sitting = rig.seat !== null;
    if (desk.jump) {
      if (!sitting && isWalkable(desk.jump.x, desk.jump.z)) place(rig, desk.jump);
      desk.jump = null;
    }
    const moving = input.forward !== 0 || input.strafe !== 0 || input.turn !== 0;
    if (snap || moving) {
      const head = headPose(rig.rig, rig.head);
      let next = step(head, input, dt, isWalkable, sitting);
      if (snap) next = snapTurn(next, snap > 0 ? 1 : -1, comfort.snapDegrees * Math.abs(snap));
      if (next !== head) {
        rig.rig = rigForHead(next, rig.head);
        if (!sitting) rig.y = floorHeight(next.x, next.z);
      }
    }

    if (!wantAim) rig.aimCancelled = false;
    if (desk.cancel) {
      desk.cancel = false;
      rig.aimCancelled = wantAim;
      rig.aimValid = false;
    }
    const aiming = wantAim && !rig.aimCancelled && !sitting;
    if (aiming) {
      const hand = aimSpace[comfort.dominantHand === "right" ? "left" : "right"];
      // Outside VR the arc starts below the eyes, or it would be seen end-on as a dot.
      if (presenting && hand?.visible) aim(rig, props, hand, 0);
      else aim(rig, props, camera, presenting ? 0 : 0.3);
    } else if (rig.aiming && rig.aimValid) {
      place(rig, { x: rig.aimX, z: rig.aimZ, ry: headPose(rig.rig, rig.head).ry });
      rig.aimValid = false;
    }
    rig.aiming = aiming;
    props.arc.visible = props.marker.visible = aiming;

    rig.sinceReport += dt;
    if (rig.sinceReport >= 0.1) {
      rig.sinceReport = 0;
      let head = headPose(rig.rig, rig.head);
      if (!sitting) {
        // Never trapped. In VR a real step into a wall is left alone: yanking the view would be worse.
        if (!presenting && !isWalkable(head.x, head.z)) {
          const free = nearestWalkable(head.x, head.z, isWalkable, spawn);
          head = { x: free.x, z: free.z, ry: head.ry };
          place(rig, head);
        } else rig.y = floorHeight(head.x, head.z);
      }
      const last = local.getState().playerPose;
      if (!last || Math.abs(last.x - head.x) + Math.abs(last.z - head.z) + Math.abs(Math.sin((last.ry - head.ry) / 2)) > 0.002) {
        local.set({ playerPose: head });
      }
    }

    originRef.current?.position.set(rig.rig.x, rig.y, rig.rig.z);
    if (originRef.current) originRef.current.rotation.y = rig.rig.ry;
    if (!presenting) {
      camera.position.set(rig.rig.x, rig.y + (sitting ? EYE_HEIGHT_SEATED : EYE_HEIGHT_STANDING), rig.rig.z);
      camera.rotation.set(rig.pitch, rig.rig.ry, 0, "YXZ");
    }

    if (desk.activate) {
      desk.activate = false;
      if (!presenting) {
        camera.updateMatrixWorld();
        activateAt(state.scene, camera, CENTRE);
      }
    }

    const { reticle, vignette, vignetteMaterial } = props;
    reticle.visible = !presenting && (desk.locked || desk.padActive);
    if (reticle.visible) {
      reticle.quaternion.copy(camera.quaternion);
      reticle.position.set(0, 0, -0.5).applyQuaternion(camera.quaternion).add(camera.position);
    }
    // As a child of the XR camera it is placed with this frame's head pose, not last frame's.
    if (presenting && vignette.parent !== camera) camera.add(vignette);
    else if (!presenting && vignette.parent) vignette.removeFromParent();
    const shade = presenting && comfort.vignette && (sitting ? input.turn !== 0 : moving) ? 1 : 0;
    rig.fade += (shade - rig.fade) * Math.min(1, dt * 8);
    vignetteMaterial.opacity = rig.fade;
    vignette.visible = rig.fade > 0.01;
  });

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
